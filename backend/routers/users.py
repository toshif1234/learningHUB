import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from backend.database import get_db
from backend.models import User, Course, Assignment
from backend.schemas import UserResponse, UserUpdate, UserRoleUpdate, UserStatusUpdate
from backend.dependencies import get_current_user, require_admin
from backend.auth.utils import hash_password

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.password is not None:
        current_user.hashed_password = hash_password(user_update.password)
    
    await db.commit()
    await db.refresh(current_user)
    return current_user

@router.get("/", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(User)
    
    # Apply filters
    if role:
        query = query.where(User.role == role)
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (User.full_name.ilike(search_filter)) | (User.email.ilike(search_filter))
        )
        
    query = query.order_by(User.id)
    result = await db.execute(query)
    users = result.scalars().all()
    return users

@router.put("/{id}/role", response_model=UserResponse)
async def change_role(
    id: int,
    role_update: UserRoleUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # Prevent admin from changing their own role (optional safety check)
    if id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role."
        )

    result = await db.execute(select(User).where(User.id == id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    user.role = role_update.role
    await db.commit()
    await db.refresh(user)
    return user

@router.put("/{id}/status", response_model=UserResponse)
async def change_status(
    id: int,
    status_update: UserStatusUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # Prevent admin from deactivating themselves
    if id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account."
        )

    result = await db.execute(select(User).where(User.id == id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    user.is_active = status_update.is_active
    await db.commit()
    await db.refresh(user)
    return user

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # Prevent admin from deleting themselves
    if id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account."
        )

    result = await db.execute(select(User).where(User.id == id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    # Allow deleting associate users only
    if user.role != "associate":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only associate accounts can be deleted."
        )

    # Reassign courses created by this user to the current admin
    await db.execute(
        update(Course)
        .where(Course.created_by == id)
        .values(created_by=current_user.id, updated_at=datetime.datetime.utcnow())
    )

    # Reassign assignments created by this user to the current admin
    await db.execute(
        update(Assignment)
        .where(Assignment.assigned_by == id)
        .values(assigned_by=current_user.id, updated_at=datetime.datetime.utcnow())
    )

    await db.delete(user)
    await db.commit()
    return None
