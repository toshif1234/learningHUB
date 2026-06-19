from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import datetime
from typing import List
from backend.database import get_db
from backend.models import Enrollment, Course, User
from backend.schemas import EnrollmentResponse, EnrollmentCreate
from backend.dependencies import get_current_user

router = APIRouter(prefix="/enrollments", tags=["enrollments"])

@router.post("/", response_model=EnrollmentResponse)
async def enroll_course(
    request: EnrollmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify course exists
    course_query = select(Course).where(Course.id == request.course_id)
    course_result = await db.execute(course_query)
    course = course_result.scalars().first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found."
        )

    # Check course type
    if course.course_type != "free":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This course is not open-access. It must be assigned to you by an administrator."
        )

    # Check if already enrolled
    existing_query = select(Enrollment).where(
        Enrollment.course_id == request.course_id,
        Enrollment.user_id == current_user.id
    )
    existing_result = await db.execute(existing_query)
    existing = existing_result.scalars().first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already enrolled in this course."
        )

    # Enroll user
    new_enrollment = Enrollment(
        course_id=request.course_id,
        user_id=current_user.id,
        enrolled_at=datetime.datetime.utcnow(),
        progress_percent=0.0
    )
    db.add(new_enrollment)
    await db.commit()
    await db.refresh(new_enrollment)
    
    # Reload with course relationship loaded
    query = select(Enrollment).where(Enrollment.id == new_enrollment.id).options(selectinload(Enrollment.course))
    res = await db.execute(query)
    return res.scalars().first()

@router.get("/", response_model=List[EnrollmentResponse])
async def list_my_enrollments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Enrollment).where(Enrollment.user_id == current_user.id).options(selectinload(Enrollment.course))
    result = await db.execute(query)
    return list(result.scalars().all())

@router.put("/{id}/progress", response_model=EnrollmentResponse)
async def update_enrollment_progress(
    id: int,
    progress_percent: float,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Enrollment).where(Enrollment.id == id).options(selectinload(Enrollment.course))
    result = await db.execute(query)
    enrollment = result.scalars().first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment record not found."
        )
        
    if enrollment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
        
    enrollment.progress_percent = min(100.0, max(0.0, progress_percent))
    if enrollment.progress_percent == 100.0 and not enrollment.completed_at:
        enrollment.completed_at = datetime.datetime.utcnow()
    elif enrollment.progress_percent < 100.0:
        enrollment.completed_at = None
        
    await db.commit()
    await db.refresh(enrollment)
    return enrollment

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def unenroll(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Enrollment).where(Enrollment.id == id)
    result = await db.execute(query)
    enrollment = result.scalars().first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found."
        )
        
    if enrollment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
        
    await db.delete(enrollment)
    await db.commit()
    return {"message": "Successfully unenrolled from course."}
