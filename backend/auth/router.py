import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from backend.database import get_db
from backend.models import User, OtpRecord
from backend.schemas import (
    UserCreate, UserResponse, UserLogin, TokenResponse, TokenRefreshRequest,
    VerifyOTPRequest, ResendOTPRequest, ForgotPasswordRequest, ResetPasswordRequest
)
from backend.auth.utils import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    decode_token, generate_otp_code
)
from backend.auth.email_service import send_otp_email, send_welcome_email

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    # 1. Check if email already exists
    email_check = await db.execute(select(User).where(User.email == user_data.email))
    if email_check.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email address is already registered."
        )

    # 2. Check if this is the first user in the system (seeding logic)
    count_check = await db.execute(select(func.count(User.id)))
    user_count = count_check.scalar()
    
    # First user becomes admin immediately, verified = False (will verify via OTP for security test)
    role = "admin" if user_count == 0 else "associate"
    
    # 3. Create user
    hashed_pwd = hash_password(user_data.password)
    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_pwd,
        role=role,
        is_verified=False,
        is_active=True
    )
    db.add(new_user)
    await db.flush()  # Populates user ID

    # 4. Generate & save OTP
    otp_code = generate_otp_code()
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    otp_record = OtpRecord(
        email=user_data.email,
        otp_code=otp_code,
        purpose="signup",
        expires_at=expires_at,
        is_used=False
    )
    db.add(otp_record)
    await db.commit()

    # 5. Send OTP email
    await send_otp_email(user_data.email, otp_code, "signup")

    return new_user

@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(request: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    # Find active, unused OTP
    now = datetime.datetime.utcnow()
    query = select(OtpRecord).where(
        OtpRecord.email == request.email,
        OtpRecord.otp_code == request.otp_code,
        OtpRecord.purpose == request.purpose,
        OtpRecord.is_used == False,
        OtpRecord.expires_at > now
    )
    result = await db.execute(query)
    otp_rec = result.scalars().first()

    if not otp_rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code."
        )

    # Mark OTP as used
    otp_rec.is_used = True
    
    # Load user
    user_query = select(User).where(User.email == request.email)
    user_result = await db.execute(user_query)
    user = user_result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    # If verifying signup, activate account
    if request.purpose == "signup":
        user.is_verified = True
        await db.commit()
        await send_welcome_email(user.email, user.full_name)
    else:
        await db.commit()

    # Issue JWT tokens
    access_token = create_access_token(user.email, user.role)
    refresh_token = create_refresh_token(user.email)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        full_name=user.full_name,
        email=user.email
    )

@router.post("/resend-otp")
async def resend_otp(request: ResendOTPRequest, db: AsyncSession = Depends(get_db)):
    # 1. Rate limiting check (max 3 requests per 15 minutes per email)
    fifteen_mins_ago = datetime.datetime.utcnow() - datetime.timedelta(minutes=15)
    rate_query = select(func.count(OtpRecord.id)).where(
        OtpRecord.email == request.email,
        OtpRecord.created_at >= fifteen_mins_ago
    )
    rate_result = await db.execute(rate_query)
    request_count = rate_result.scalar()

    if request_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Please try again after 15 minutes."
        )

    # 2. Invalidate previous OTPs of this purpose
    from sqlalchemy import update
    await db.execute(
        update(OtpRecord)
        .where(OtpRecord.email == request.email, OtpRecord.purpose == request.purpose)
        .values(is_used=True)
    )

    # 3. Generate new OTP
    otp_code = generate_otp_code()
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    otp_record = OtpRecord(
        email=request.email,
        otp_code=otp_code,
        purpose=request.purpose,
        expires_at=expires_at,
        is_used=False
    )
    db.add(otp_record)
    await db.commit()

    # 4. Send email
    await send_otp_email(request.email, otp_code, request.purpose)

    return {"message": "OTP resent successfully."}

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    query = select(User).where(User.email == credentials.email)
    result = await db.execute(query)
    user = result.scalars().first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address using the OTP sent to you."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled. Contact admin."
        )

    access_token = create_access_token(user.email, user.role)
    refresh_token = create_refresh_token(user.email)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        full_name=user.full_name,
        email=user.email
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(request.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token."
        )
    
    email = payload.get("sub")
    query = select(User).where(User.email == email)
    result = await db.execute(query)
    user = result.scalars().first()

    if not user or not user.is_active or not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User accounts is inactive or deleted."
        )

    access_token = create_access_token(user.email, user.role)
    new_refresh_token = create_refresh_token(user.email)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        role=user.role,
        full_name=user.full_name,
        email=user.email
    )

@router.post("/logout")
async def logout():
    # Simple success response, client discards local tokens.
    return {"message": "Logged out successfully."}

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    query = select(User).where(User.email == request.email)
    result = await db.execute(query)
    user = result.scalars().first()

    # To prevent user enumeration, we return success even if user doesn't exist
    if user and user.is_verified and user.is_active:
        # Generate and save OTP
        otp_code = generate_otp_code()
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
        otp_record = OtpRecord(
            email=request.email,
            otp_code=otp_code,
            purpose="password_reset",
            expires_at=expires_at,
            is_used=False
        )
        db.add(otp_record)
        await db.commit()

        # Send email
        await send_otp_email(request.email, otp_code, "password_reset")

    return {"message": "If the email exists, a password reset code has been sent."}

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    # 1. Verify OTP
    now = datetime.datetime.utcnow()
    query = select(OtpRecord).where(
        OtpRecord.email == request.email,
        OtpRecord.otp_code == request.otp_code,
        OtpRecord.purpose == "password_reset",
        OtpRecord.is_used == False,
        OtpRecord.expires_at > now
    )
    result = await db.execute(query)
    otp_rec = result.scalars().first()

    if not otp_rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code."
        )

    # 2. Mark OTP as used
    otp_rec.is_used = True

    # 3. Update User Password
    user_query = select(User).where(User.email == request.email)
    user_result = await db.execute(user_query)
    user = user_result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    user.hashed_password = hash_password(request.new_password)
    # We update updated_at which helps invalidate old sessions if checked
    user.updated_at = datetime.datetime.utcnow()
    
    await db.commit()
    return {"message": "Password reset successfully. You can now login with your new password."}
