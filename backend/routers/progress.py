from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
import datetime
from typing import Dict, Any
from backend.database import get_db
from backend.models import User, Course, CourseModule, ModuleProgress, Assignment, Enrollment
from backend.schemas import CourseProgressDetailResponse
from backend.dependencies import get_current_user

router = APIRouter(prefix="/progress", tags=["progress"])

async def calculate_and_update_course_progress(
    user_id: int,
    course_id: int,
    db: AsyncSession
) -> Dict[str, Any]:
    # 1. Get total module count for this course
    module_count_query = select(func.count(CourseModule.id)).where(CourseModule.course_id == course_id)
    module_count_result = await db.execute(module_count_query)
    total_modules = module_count_result.scalar() or 0

    if total_modules == 0:
        return {"progress_percent": 100.0, "completed_count": 0, "total_count": 0, "is_completed": True}

    # 2. Get completed module count for this user in this course
    completed_query = select(func.count(ModuleProgress.id)).where(
        ModuleProgress.user_id == user_id,
        ModuleProgress.course_id == course_id
    )
    completed_result = await db.execute(completed_query)
    completed_modules = completed_result.scalar() or 0

    progress_percent = min(100.0, (completed_modules / total_modules) * 100.0)
    is_completed = completed_modules == total_modules

    # 3. Update Enrollment (for Free courses) if exists
    enrollment_query = select(Enrollment).where(
        Enrollment.user_id == user_id,
        Enrollment.course_id == course_id
    )
    enrollment_result = await db.execute(enrollment_query)
    enrollment = enrollment_result.scalars().first()
    if enrollment:
        enrollment.progress_percent = progress_percent
        if is_completed and not enrollment.completed_at:
            enrollment.completed_at = datetime.datetime.utcnow()
        elif not is_completed:
            enrollment.completed_at = None

    # 4. Update Assignment (for Assigned courses) if exists
    assignment_query = select(Assignment).where(
        Assignment.assigned_to == user_id,
        Assignment.course_id == course_id
    )
    assignment_result = await db.execute(assignment_query)
    assignment = assignment_result.scalars().first()
    if assignment:
        if is_completed:
            assignment.status = "completed"
        elif completed_modules > 0:
            if assignment.status == "pending":
                assignment.status = "in_progress"
        assignment.updated_at = datetime.datetime.utcnow()

    await db.flush()
    return {
        "progress_percent": progress_percent,
        "completed_count": completed_modules,
        "total_count": total_modules,
        "is_completed": is_completed
    }

@router.post("/modules/{module_id}/complete", response_model=CourseProgressDetailResponse)
async def complete_module(
    module_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify module exists
    module_query = select(CourseModule).where(CourseModule.id == module_id)
    module_result = await db.execute(module_query)
    module = module_result.scalars().first()
    
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found."
        )

    course_id = module.course_id

    # Check if user has access to this course (assigned or enrolled or free)
    course_query = select(Course).where(Course.id == course_id)
    course_result = await db.execute(course_query)
    course = course_result.scalars().first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found."
        )

    # Check if already completed
    progress_query = select(ModuleProgress).where(
        ModuleProgress.user_id == current_user.id,
        ModuleProgress.module_id == module_id
    )
    progress_result = await db.execute(progress_query)
    existing_progress = progress_result.scalars().first()

    if not existing_progress:
        # Save progress
        new_progress = ModuleProgress(
            user_id=current_user.id,
            course_id=course_id,
            module_id=module_id,
            completed_at=datetime.datetime.utcnow()
        )
        db.add(new_progress)
        await db.flush()

    # Recalculate progress
    stats = await calculate_and_update_course_progress(current_user.id, course_id, db)
    await db.commit()

    # Get list of completed module IDs
    completed_list_query = select(ModuleProgress.module_id).where(
        ModuleProgress.user_id == current_user.id,
        ModuleProgress.course_id == course_id
    )
    completed_list_result = await db.execute(completed_list_query)
    completed_ids = list(completed_list_result.scalars().all())

    return CourseProgressDetailResponse(
        course_id=course_id,
        progress_percent=stats["progress_percent"],
        completed_modules=completed_ids,
        is_completed=stats["is_completed"]
    )

@router.get("/courses/{course_id}", response_model=CourseProgressDetailResponse)
async def get_course_progress(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Get total modules
    module_count_query = select(func.count(CourseModule.id)).where(CourseModule.course_id == course_id)
    module_count_result = await db.execute(module_count_query)
    total_modules = module_count_result.scalar() or 0

    # Get completed modules
    completed_list_query = select(ModuleProgress.module_id).where(
        ModuleProgress.user_id == current_user.id,
        ModuleProgress.course_id == course_id
    )
    completed_list_result = await db.execute(completed_list_query)
    completed_ids = list(completed_list_result.scalars().all())

    progress_percent = 0.0
    if total_modules > 0:
        progress_percent = min(100.0, (len(completed_ids) / total_modules) * 100.0)

    return CourseProgressDetailResponse(
        course_id=course_id,
        progress_percent=progress_percent,
        completed_modules=completed_ids,
        is_completed=len(completed_ids) == total_modules if total_modules > 0 else False
    )
