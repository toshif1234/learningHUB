import csv
import io
import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload, joinedload
from typing import List, Optional
from backend.database import get_db
from backend.models import Assignment, Course, User, Notification
from backend.schemas import AssignmentResponse, AssignmentCreate, AssignmentExtendRequest
from backend.dependencies import require_admin, get_current_user
from backend.auth.email_service import send_course_assigned_email, send_deadline_reminder_email
from backend.config import FRONTEND_ORIGIN

router = APIRouter(prefix="/assignments", tags=["assignments"])

async def create_assignment_internal(
    course_id: int,
    user_id: int,
    admin_id: int,
    deadline: datetime.datetime,
    db: AsyncSession
) -> Assignment:
    # 1. Check if course exists
    course_res = await db.execute(select(Course).where(Course.id == course_id))
    course = course_res.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail=f"Course with ID {course_id} not found.")

    # 2. Check if user exists
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found.")

    # 3. Check for existing active assignment
    existing_res = await db.execute(
        select(Assignment).where(
            Assignment.course_id == course_id,
            Assignment.assigned_to == user_id,
            Assignment.status.in_(["pending", "in_progress", "overdue"])
        )
    )
    existing = existing_res.scalars().first()
    if existing:
        # Update deadline as requested by edge cases: "option to update deadline"
        existing.deadline = deadline
        existing.status = "pending"  # Reset status if it was overdue
        await db.flush()
        return existing

    # 4. Create new assignment
    new_assign = Assignment(
        course_id=course_id,
        assigned_to=user_id,
        assigned_by=admin_id,
        deadline=deadline,
        status="pending"
    )
    db.add(new_assign)
    await db.flush()

    # 5. Create notification
    notif = Notification(
        user_id=user_id,
        type="assignment",
        title="New Course Assigned",
        message=f"You have been assigned the course: '{course.title}' with a deadline of {deadline.strftime('%Y-%m-%d %H:%M')}.",
        is_read=False
    )
    db.add(notif)
    await db.flush()

    # 6. Send Email
    await send_course_assigned_email(user.email, user.full_name, course.title, deadline)
    return new_assign

@router.post("/", response_model=List[AssignmentResponse])
async def create_assignments(
    request: AssignmentCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    assignments = []
    # Make sure deadline is in the future
    if request.deadline.replace(tzinfo=None) <= datetime.datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deadline must be in the future."
        )

    for user_id in request.assigned_to:
        assign = await create_assignment_internal(
            course_id=request.course_id,
            user_id=user_id,
            admin_id=current_user.id,
            deadline=request.deadline.replace(tzinfo=None),
            db=db
        )
        assignments.append(assign)

    await db.commit()

    # Fetch fully populated assignments for serialization
    populated_assignments = []
    for a in assignments:
        res = await db.execute(
            select(Assignment)
            .where(Assignment.id == a.id)
            .options(joinedload(Assignment.course), joinedload(Assignment.assigned_user))
        )
        populated_assignments.append(res.scalars().first())

    return populated_assignments

@router.get("/", response_model=List[AssignmentResponse])
async def list_assignments(
    status_filter: Optional[str] = None,
    course_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Assignment).options(joinedload(Assignment.course), joinedload(Assignment.assigned_user))
    
    # If not admin, only get own assignments
    if current_user.role != "admin":
        query = query.where(Assignment.assigned_to == current_user.id)
    
    # Apply filters
    if status_filter:
        query = query.where(Assignment.status == status_filter)
    if course_id:
        query = query.where(Assignment.course_id == course_id)

    query = query.order_by(Assignment.deadline.asc())
    result = await db.execute(query)
    return list(result.scalars().all())

@router.get("/{id}", response_model=AssignmentResponse)
async def get_assignment(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Assignment).where(Assignment.id == id).options(joinedload(Assignment.course), joinedload(Assignment.assigned_user))
    result = await db.execute(query)
    assignment = result.scalars().first()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found."
        )
        
    if current_user.role != "admin" and assignment.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
        
    return assignment

@router.put("/{id}/deadline", response_model=AssignmentResponse)
async def extend_deadline(
    id: int,
    request: AssignmentExtendRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(Assignment).where(Assignment.id == id).options(joinedload(Assignment.course), joinedload(Assignment.assigned_user))
    result = await db.execute(query)
    assignment = result.scalars().first()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found."
        )
        
    if request.deadline.replace(tzinfo=None) <= datetime.datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deadline must be in the future."
        )
        
    assignment.deadline = request.deadline.replace(tzinfo=None)
    # If status was overdue, reset it to pending or in_progress depending on if progress exists
    if assignment.status == "overdue":
        assignment.status = "pending"
        
    assignment.updated_at = datetime.datetime.utcnow()
    
    # Create notification for extension
    notif = Notification(
        user_id=assignment.assigned_to,
        type="assignment",
        title="Assignment Deadline Extended",
        message=f"The deadline for course: '{assignment.course.title}' has been extended to {assignment.deadline.strftime('%Y-%m-%d %H:%M')}.",
        is_read=False
    )
    db.add(notif)
    
    await db.commit()
    await db.refresh(assignment)
    return assignment

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def revoke_assignment(
    id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(Assignment).where(Assignment.id == id).options(joinedload(Assignment.course), joinedload(Assignment.assigned_user))
    result = await db.execute(query)
    assignment = result.scalars().first()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found."
        )

    # Warn if in progress
    is_in_progress = assignment.status == "in_progress"
    
    # Notify user
    notif = Notification(
        user_id=assignment.assigned_to,
        type="assignment",
        title="Assignment Revoked",
        message=f"Your assignment for course: '{assignment.course.title}' has been cancelled by the administrator.",
        is_read=False
    )
    db.add(notif)
    
    await db.delete(assignment)
    await db.commit()
    
    return {
        "message": "Assignment revoked successfully.",
        "was_in_progress": is_in_progress
    }

@router.post("/bulk", response_model=List[AssignmentResponse])
async def bulk_assign(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    content = await file.read()
    decoded = content.decode('utf-8')
    csv_reader = csv.reader(io.StringIO(decoded))
    
    # Skip header if present
    header = next(csv_reader, None)
    if header:
        # Check if it actually looks like header
        if not ("email" in header[0].lower() or "email" in header):
            # Put it back / process it
            import itertools
            csv_reader = itertools.chain([header], csv_reader)

    assignments = []
    for row in csv_reader:
        if not row or len(row) < 3:
            continue
        email, course_id_str, deadline_str = row[0].strip(), row[1].strip(), row[2].strip()
        
        # 1. Parse Course ID
        try:
            course_id = int(course_id_str)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid Course ID: {course_id_str}")
            
        # 2. Parse Deadline
        try:
            deadline = datetime.datetime.fromisoformat(deadline_str.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            try:
                deadline = datetime.datetime.strptime(deadline_str, "%Y-%m-%d").replace(tzinfo=None)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid deadline format: {deadline_str}. Use YYYY-MM-DD or ISO format.")

        # 3. Lookup user by email
        user_res = await db.execute(select(User).where(User.email == email))
        user = user_res.scalars().first()
        if not user:
            # Skip or error? The spec says to assign, so we error or skip. Let's raise error to ensure integrity.
            raise HTTPException(status_code=400, detail=f"User with email {email} not found.")

        # Create
        assign = await create_assignment_internal(
            course_id=course_id,
            user_id=user.id,
            admin_id=current_user.id,
            deadline=deadline,
            db=db
        )
        assignments.append(assign)

    await db.commit()
    
    # Reload fully populated
    populated_assignments = []
    for a in assignments:
        res = await db.execute(
            select(Assignment)
            .where(Assignment.id == a.id)
            .options(joinedload(Assignment.course), joinedload(Assignment.assigned_user))
        )
        populated_assignments.append(res.scalars().first())
        
    return populated_assignments

# --- Background Task: Deadline Reminders Checker ---

async def run_deadline_checks(db: AsyncSession):
    now = datetime.datetime.utcnow()
    # Find all assignments that are not completed
    query = select(Assignment).where(Assignment.status.in_(["pending", "in_progress", "overdue"]))
    result = await db.execute(query)
    assignments = result.scalars().all()

    for assignment in assignments:
        # Load user and course manually to avoid async lazy loading issues
        user_res = await db.execute(select(User).where(User.id == assignment.assigned_to))
        user = user_res.scalars().first()
        
        course_res = await db.execute(select(Course).where(Course.id == assignment.course_id))
        course = course_res.scalars().first()
        
        if not user or not course:
            continue

        deadline = assignment.deadline
        diff = deadline - now
        days_left = diff.days
        hours_left = diff.total_seconds() / 3600

        # Case 1: Past deadline -> auto mark overdue
        if now > deadline and assignment.status != "overdue":
            assignment.status = "overdue"
            assignment.updated_at = now
            
            # Send notification
            notif = Notification(
                user_id=assignment.assigned_to,
                type="deadline_reminder",
                title="Course Assignment Overdue",
                message=f"Your assignment for course: '{course.title}' is overdue! The deadline was {deadline.strftime('%Y-%m-%d %H:%M')}.",
                is_read=False
            )
            db.add(notif)
            # Log to console or email
            print(f"⏰ Overdue: User {user.email} marked overdue for {course.title}")

        # Case 2: 1 day reminder (between 0 and 24 hours left)
        elif 0 < hours_left <= 24:
            # Check if we already sent a 1-day reminder
            check_notif = await db.execute(
                select(Notification).where(
                    Notification.user_id == user.id,
                    Notification.type == "deadline_reminder",
                    Notification.title.like("%Urgent Deadline Reminder%")
                )
            )
            if not check_notif.scalars().first():
                notif = Notification(
                    user_id=user.id,
                    type="deadline_reminder",
                    title=f"Urgent Deadline Reminder - 1 Day Left",
                    message=f"Urgent: You have less than 24 hours left to complete '{course.title}'. Due by {deadline.strftime('%Y-%m-%d %H:%M')}.",
                    is_read=False
                )
                db.add(notif)
                await send_deadline_reminder_email(user.email, user.full_name, course.title, deadline, 1)

        # Case 3: 3 days reminder (between 48 and 72 hours left)
        elif 48 < hours_left <= 72:
            check_notif = await db.execute(
                select(Notification).where(
                    Notification.user_id == user.id,
                    Notification.type == "deadline_reminder",
                    Notification.title.like("%Upcoming Deadline Reminder%")
                )
            )
            if not check_notif.scalars().first():
                notif = Notification(
                    user_id=user.id,
                    type="deadline_reminder",
                    title="Upcoming Deadline Reminder - 3 Days Left",
                    message=f"Reminder: You have 3 days remaining to complete '{course.title}'.",
                    is_read=False
                )
                db.add(notif)
                await send_deadline_reminder_email(user.email, user.full_name, course.title, deadline, 3)

    await db.commit()

@router.post("/check-reminders")
async def trigger_deadline_reminders(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    await run_deadline_checks(db)
    return {"message": "Deadline check and reminders ran successfully."}
