import csv
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List
from backend.database import get_db
from backend.models import User, Course, Assignment, Assessment, AssessmentAttempt, Enrollment, AssessmentUserOverride
from backend.schemas import DashboardOverview, CourseAnalytics, UserAnalytics, ExhaustedAttemptResponse, IncreaseAttemptsRequest
from backend.dependencies import require_admin

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=DashboardOverview)
async def get_overview(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Users by role
    admin_count_result = await db.execute(
        select(func.count(User.id)).where(User.role == "admin")
    )
    total_users_admin = admin_count_result.scalar() or 0

    associate_count_result = await db.execute(
        select(func.count(User.id)).where(User.role == "associate")
    )
    total_users_associate = associate_count_result.scalar() or 0

    # Courses by type
    assigned_courses_result = await db.execute(
        select(func.count(Course.id)).where(Course.course_type == "assigned")
    )
    total_courses_assigned = assigned_courses_result.scalar() or 0

    free_courses_result = await db.execute(
        select(func.count(Course.id)).where(Course.course_type == "free")
    )
    total_courses_free = free_courses_result.scalar() or 0

    # Assignments
    active_result = await db.execute(
        select(func.count(Assignment.id)).where(
            Assignment.status.in_(["pending", "in_progress"])
        )
    )
    active_assignments = active_result.scalar() or 0

    overdue_result = await db.execute(
        select(func.count(Assignment.id)).where(Assignment.status == "overdue")
    )
    overdue_assignments = overdue_result.scalar() or 0

    return DashboardOverview(
        total_users_admin=total_users_admin,
        total_users_associate=total_users_associate,
        total_courses_assigned=total_courses_assigned,
        total_courses_free=total_courses_free,
        active_assignments=active_assignments,
        overdue_assignments=overdue_assignments,
    )


@router.get("/courses", response_model=List[CourseAnalytics])
async def get_course_analytics(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    courses_result = await db.execute(select(Course))
    courses = list(courses_result.scalars().all())

    analytics = []
    for course in courses:
        # Total assigned
        assigned_result = await db.execute(
            select(func.count(Assignment.id)).where(Assignment.course_id == course.id)
        )
        total_assigned = assigned_result.scalar() or 0

        # Total completed
        completed_result = await db.execute(
            select(func.count(Assignment.id)).where(
                Assignment.course_id == course.id,
                Assignment.status == "completed",
            )
        )
        total_completed = completed_result.scalar() or 0

        completion_rate = (total_completed / total_assigned * 100) if total_assigned > 0 else 0.0

        # Average assessment score & pass rate
        # Get assessment IDs for this course
        assessment_ids_result = await db.execute(
            select(Assessment.id).where(Assessment.course_id == course.id)
        )
        assessment_ids = [row[0] for row in assessment_ids_result.all()]

        avg_assessment_score = 0.0
        pass_rate = 0.0

        if assessment_ids:
            avg_score_result = await db.execute(
                select(func.avg(AssessmentAttempt.score)).where(
                    AssessmentAttempt.assessment_id.in_(assessment_ids),
                    AssessmentAttempt.submitted_at.isnot(None),
                )
            )
            avg_assessment_score = avg_score_result.scalar() or 0.0

            total_attempts_result = await db.execute(
                select(func.count(AssessmentAttempt.id)).where(
                    AssessmentAttempt.assessment_id.in_(assessment_ids),
                    AssessmentAttempt.submitted_at.isnot(None),
                )
            )
            total_attempts = total_attempts_result.scalar() or 0

            passed_attempts_result = await db.execute(
                select(func.count(AssessmentAttempt.id)).where(
                    AssessmentAttempt.assessment_id.in_(assessment_ids),
                    AssessmentAttempt.submitted_at.isnot(None),
                    AssessmentAttempt.is_passed == True,
                )
            )
            passed_attempts = passed_attempts_result.scalar() or 0

            pass_rate = (passed_attempts / total_attempts * 100) if total_attempts > 0 else 0.0

        analytics.append(
            CourseAnalytics(
                course_id=course.id,
                title=course.title,
                category=course.category,
                course_type=course.course_type,
                total_assigned=total_assigned,
                total_completed=total_completed,
                completion_rate=round(completion_rate, 2),
                avg_assessment_score=round(avg_assessment_score, 2),
                pass_rate=round(pass_rate, 2),
            )
        )

    return analytics


@router.get("/users", response_model=List[UserAnalytics])
async def get_user_analytics(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    users_result = await db.execute(
        select(User).where(User.role == "associate")
    )
    users = list(users_result.scalars().all())

    analytics = []
    for user in users:
        assigned_result = await db.execute(
            select(func.count(Assignment.id)).where(Assignment.assigned_to == user.id)
        )
        assigned_courses_count = assigned_result.scalar() or 0

        completed_result = await db.execute(
            select(func.count(Assignment.id)).where(
                Assignment.assigned_to == user.id,
                Assignment.status == "completed",
            )
        )
        completed_courses_count = completed_result.scalar() or 0

        overall_progress = (
            (completed_courses_count / assigned_courses_count * 100)
            if assigned_courses_count > 0
            else 0.0
        )

        analytics.append(
            UserAnalytics(
                user_id=user.id,
                full_name=user.full_name,
                email=user.email,
                assigned_courses_count=assigned_courses_count,
                completed_courses_count=completed_courses_count,
                overall_progress=round(overall_progress, 2),
            )
        )

    return analytics


@router.get("/export/results")
async def export_assessment_results(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(
            AssessmentAttempt,
            User.email.label("user_email"),
            User.full_name.label("user_name"),
            Assessment.title.label("assessment_title"),
            Course.title.label("course_title"),
        )
        .join(User, AssessmentAttempt.user_id == User.id)
        .join(Assessment, AssessmentAttempt.assessment_id == Assessment.id)
        .join(Course, Assessment.course_id == Course.id)
        .where(AssessmentAttempt.submitted_at.isnot(None))
        .order_by(AssessmentAttempt.submitted_at.desc())
    )
    result = await db.execute(query)
    rows = result.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "user_email", "user_name", "course_title", "assessment_title",
        "attempt_number", "score", "is_passed", "submitted_at",
    ])

    for row in rows:
        attempt = row[0]
        writer.writerow([
            row.user_email,
            row.user_name,
            row.course_title,
            row.assessment_title,
            attempt.attempt_number,
            attempt.score,
            attempt.is_passed,
            attempt.submitted_at.isoformat() if attempt.submitted_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=assessment_results.csv"},
    )


@router.get("/exhausted-attempts", response_model=List[ExhaustedAttemptResponse])
async def get_exhausted_attempts(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    assessments_query = select(Assessment).where(Assessment.is_active == True)
    assessments_res = await db.execute(assessments_query)
    assessments = list(assessments_res.scalars().all())

    exhausted = []

    for assess in assessments:
        # Fetch the course title
        course_query = select(Course).where(Course.id == assess.course_id)
        course_res = await db.execute(course_query)
        course = course_res.scalars().first()
        course_title = course.title if course else "Unknown Course"

        # Unique user IDs who attempted this assessment
        users_query = select(AssessmentAttempt.user_id).where(
            AssessmentAttempt.assessment_id == assess.id
        ).distinct()
        users_res = await db.execute(users_query)
        user_ids = [row[0] for row in users_res.all()]

        for uid in user_ids:
            # Check if this user has any passed attempt
            passed_query = select(func.count(AssessmentAttempt.id)).where(
                AssessmentAttempt.assessment_id == assess.id,
                AssessmentAttempt.user_id == uid,
                AssessmentAttempt.is_passed == True,
            )
            passed_res = await db.execute(passed_query)
            has_passed = (passed_res.scalar() or 0) > 0

            if has_passed:
                continue

            # Count total attempts
            attempts_query = select(func.count(AssessmentAttempt.id)).where(
                AssessmentAttempt.assessment_id == assess.id,
                AssessmentAttempt.user_id == uid,
            )
            attempts_res = await db.execute(attempts_query)
            attempts_count = attempts_res.scalar() or 0

            # Fetch override
            override_query = select(AssessmentUserOverride).where(
                AssessmentUserOverride.assessment_id == assess.id,
                AssessmentUserOverride.user_id == uid,
            )
            override_res = await db.execute(override_query)
            override = override_res.scalars().first()

            allowed_max = override.max_attempts if override else assess.max_attempts

            if attempts_count >= allowed_max:
                # Fetch user details
                user_query = select(User).where(User.id == uid)
                user_res = await db.execute(user_query)
                user = user_res.scalars().first()
                if user:
                    exhausted.append(
                        ExhaustedAttemptResponse(
                            user_id=user.id,
                            user_name=user.full_name,
                            user_email=user.email,
                            course_id=assess.course_id,
                            course_title=course_title,
                            assessment_id=assess.id,
                            assessment_title=assess.title,
                            attempts_count=attempts_count,
                            max_attempts=allowed_max,
                        )
                    )

    return exhausted


@router.post("/increase-attempts")
async def increase_attempts(
    payload: IncreaseAttemptsRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user_id = payload.user_id
    assessment_id = payload.assessment_id

    # Check if override exists
    override_query = select(AssessmentUserOverride).where(
        AssessmentUserOverride.assessment_id == assessment_id,
        AssessmentUserOverride.user_id == user_id,
    )
    override_res = await db.execute(override_query)
    override = override_res.scalars().first()

    if override:
        override.max_attempts += 1
    else:
        # Fetch default max attempts from assessment
        assess_query = select(Assessment).where(Assessment.id == assessment_id)
        assess_res = await db.execute(assess_query)
        assess = assess_res.scalars().first()
        if not assess:
            raise HTTPException(status_code=404, detail="Assessment not found.")

        current_max = assess.max_attempts
        new_override = AssessmentUserOverride(
            user_id=user_id,
            assessment_id=assessment_id,
            max_attempts=current_max + 1,
        )
        db.add(new_override)

    await db.commit()
    return {"status": "success", "message": "Attempts limit increased successfully."}
