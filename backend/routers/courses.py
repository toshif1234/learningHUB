import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Optional
from backend.database import get_db
from backend.models import Course, CourseModule, Assignment, User
from backend.schemas import (
    CourseResponse, CourseCreate, CourseUpdate, CourseDetailResponse,
    CourseModuleResponse, CourseModuleCreate, CourseModuleUpdate
)
from backend.dependencies import require_admin, get_current_user
from backend.config import UPLOAD_DIR, MAX_FILE_SIZE_MB
from sqlalchemy.orm import selectinload
import aiofiles
import os

router = APIRouter(prefix="/courses", tags=["courses"])

@router.post("/", response_model=CourseResponse)
async def create_course(
    course_data: CourseCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    new_course = Course(
        title=course_data.title,
        description=course_data.description,
        category=course_data.category,
        course_type=course_data.course_type,
        content_type=course_data.content_type,
        external_url=course_data.external_url,
        duration_minutes=course_data.duration_minutes,
        is_published=course_data.is_published,
        created_by=current_user.id
    )
    db.add(new_course)
    await db.commit()
    await db.refresh(new_course)
    return new_course

@router.get("/", response_model=List[CourseResponse])
async def list_courses(
    category: Optional[str] = None,
    course_type: Optional[str] = None,
    is_published: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Course)
    
    # If not admin, only show published courses
    if current_user.role != "admin":
        query = query.where(Course.is_published == True)
    else:
        if is_published is not None:
            query = query.where(Course.is_published == is_published)

    if category:
        query = query.where(Course.category.ilike(category))
    if course_type:
        query = query.where(Course.course_type == course_type)
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Course.title.ilike(search_filter)) | (Course.description.ilike(search_filter))
        )
        
    query = query.order_by(Course.created_at.desc())
    result = await db.execute(query)
    courses = result.scalars().all()
    return courses

@router.get("/{id}", response_model=CourseDetailResponse)
async def get_course(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Course).where(Course.id == id).options(
        selectinload(Course.modules),
        selectinload(Course.assessments)
    )
    result = await db.execute(query)
    course = result.scalars().first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found."
        )
        
    # Non-admins can't view unpublished courses
    if current_user.role != "admin" and not course.is_published:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this course."
        )
        
    return course

@router.put("/{id}", response_model=CourseResponse)
async def update_course(
    id: int,
    course_update: CourseUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(Course).where(Course.id == id)
    result = await db.execute(query)
    course = result.scalars().first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found."
        )
        
    for field, value in course_update.dict(exclude_unset=True).items():
        setattr(course, field, value)
        
    course.updated_at = func.now()
    await db.commit()
    await db.refresh(course)
    return course

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_course(
    id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(Course).where(Course.id == id)
    result = await db.execute(query)
    course = result.scalars().first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found."
        )

    # Check for active assignments (pending/in_progress)
    assign_query = select(func.count(Assignment.id)).where(
        Assignment.course_id == id,
        Assignment.status.in_(["pending", "in_progress"])
    )
    assign_result = await db.execute(assign_query)
    active_count = assign_result.scalar()
    
    if active_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete course. There are {active_count} active assignments. Please revoke them first, or soft delete by unpublishing the course."
        )
        
    await db.delete(course)
    await db.commit()
    return {"message": "Course deleted successfully."}

# File Upload Utility
async def save_upload_file(file: UploadFile, course_id: int, subfolder: str) -> str:
    # Validate file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    max_bytes = MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {MAX_FILE_SIZE_MB}MB."
        )

    # Validate MIME type
    if subfolder == "thumbnails":
        if not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Thumbnail must be an image."
            )
    elif subfolder == "files":
        allowed_types = ["application/pdf", "video/mp4", "video/webm", "video/ogg", "video/quicktime"]
        if not (file.content_type in allowed_types or file.content_type.startswith("video/")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only PDF and Video files are allowed."
            )

    course_upload_dir = UPLOAD_DIR / "courses" / str(course_id) / subfolder
    course_upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{file_ext}"
    dest_path = course_upload_dir / filename
    
    async with aiofiles.open(dest_path, 'wb') as out_file:
        while content := await file.read(1024 * 1024):  # read in 1MB chunks
            await out_file.write(content)
            
    # Return relative URL path
    return f"/uploads/courses/{course_id}/{subfolder}/{filename}"

@router.post("/{id}/thumbnail")
async def upload_thumbnail(
    id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    course_query = select(Course).where(Course.id == id)
    course_result = await db.execute(course_query)
    course = course_result.scalars().first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found."
        )
        
    thumbnail_url = await save_upload_file(file, id, "thumbnails")
    course.thumbnail_path = thumbnail_url
    await db.commit()
    return {"thumbnail_path": thumbnail_url, "thumbnail_url": thumbnail_url}

@router.post("/{id}/upload")
async def upload_course_file(
    id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    course_query = select(Course).where(Course.id == id)
    course_result = await db.execute(course_query)
    course = course_result.scalars().first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found."
        )
        
    file_url = await save_upload_file(file, id, "files")
    course.file_path = file_url
    await db.commit()
    return {"file_path": file_url}

# --- Module Management ---

@router.post("/{id}/modules", response_model=CourseModuleResponse)
async def add_module(
    id: int,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    content_type: str = Form(...),
    order_index: int = Form(0),
    external_url: Optional[str] = Form(None),
    content_text: Optional[str] = Form(None),
    text_content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # Verify course exists
    course_query = select(Course).where(Course.id == id)
    course_result = await db.execute(course_query)
    course = course_result.scalars().first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found."
        )
        
    # Get max order_index if order_index is 0 or not provided
    if order_index == 0:
        index_query = select(func.max(CourseModule.order_index)).where(CourseModule.course_id == id)
        index_result = await db.execute(index_query)
        max_index = index_result.scalar() or 0
        order_index = max_index + 1

    file_path = None
    if file:
        file_path = await save_upload_file(file, id, "files")

    new_module = CourseModule(
        course_id=id,
        title=title,
        description=description,
        content_type=content_type,
        file_path=file_path,
        external_url=external_url,
        text_content=text_content or content_text,
        order_index=order_index
    )
    db.add(new_module)
    
    course.updated_at = func.now()
    await db.commit()
    await db.refresh(new_module)
    return new_module

@router.put("/{id}/modules/{mid}", response_model=CourseModuleResponse)
async def update_module(
    id: int,
    mid: int,
    module_update: CourseModuleUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(CourseModule).where(CourseModule.id == mid, CourseModule.course_id == id)
    result = await db.execute(query)
    module = result.scalars().first()
    
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course module not found."
        )
        
    for field, value in module_update.dict(exclude_unset=True).items():
        setattr(module, field, value)
        
    # Trigger updated_at on course
    course_query = select(Course).where(Course.id == id)
    course_result = await db.execute(course_query)
    course = course_result.scalars().first()
    if course:
        course.updated_at = func.now()
        
    await db.commit()
    await db.refresh(module)
    return module

@router.delete("/{id}/modules/{mid}", status_code=status.HTTP_200_OK)
async def delete_module(
    id: int,
    mid: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(CourseModule).where(CourseModule.id == mid, CourseModule.course_id == id)
    result = await db.execute(query)
    module = result.scalars().first()
    
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course module not found."
        )
        
    await db.delete(module)
    
    # Trigger updated_at on course
    course_query = select(Course).where(Course.id == id)
    course_result = await db.execute(course_query)
    course = course_result.scalars().first()
    if course:
        course.updated_at = func.now()

    await db.commit()
    return {"message": "Module deleted successfully."}
