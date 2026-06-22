import random
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Optional
from fastapi.responses import HTMLResponse
from backend.database import get_db
from backend.models import (
    Assessment, Question, Option, AssessmentAttempt, UserAnswer,
    Course, CourseModule, ModuleProgress, User, Assignment, Enrollment, Notification,
    AssessmentUserOverride
)
from backend.schemas import (
    AssessmentResponse, AssessmentCreate, AssessmentUpdate,
    AttemptStartResponse, AttemptSubmitRequest, AttemptSubmitResponse,
    AttemptDetailResponse, UserAnswerDetailResponse, QuestionResponse, OptionResponse
)
from backend.dependencies import get_current_user, require_admin
from backend.auth.email_service import send_assessment_result_email

import hmac
import hashlib
from backend.config import SECRET_KEY

router = APIRouter(prefix="/assessments", tags=["assessments"])

def get_certificate_signature(attempt_id: int) -> str:
    return hmac.new(
        SECRET_KEY.encode('utf-8'),
        str(attempt_id).encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

@router.post("/", response_model=AssessmentResponse)
async def create_assessment(
    request: AssessmentCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # Check if course exists
    course_query = select(Course).where(Course.id == request.course_id)
    course_res = await db.execute(course_query)
    course = course_res.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    new_assessment = Assessment(
        course_id=request.course_id,
        title=request.title,
        description=request.description,
        pass_percentage=request.pass_percentage,
        time_limit_minutes=request.time_limit_minutes,
        max_attempts=request.max_attempts,
        shuffle_questions=request.shuffle_questions,
        shuffle_options=request.shuffle_options,
        show_correct_answers=request.show_correct_answers,
        is_active=True
    )
    db.add(new_assessment)
    await db.flush()

    # Create Questions & Options
    for i, q_data in enumerate(request.questions):
        new_q = Question(
            assessment_id=new_assessment.id,
            question_text=q_data.question_text,
            question_type=q_data.question_type,
            order_index=q_data.order_index or (i + 1),
            marks=q_data.marks,
            explanation=q_data.explanation
        )
        db.add(new_q)
        await db.flush()

        for opt_data in q_data.options:
            new_opt = Option(
                question_id=new_q.id,
                option_text=opt_data.option_text,
                is_correct=opt_data.is_correct
            )
            db.add(new_opt)

    await db.commit()
    await db.refresh(new_assessment)
    return new_assessment

@router.get("/course/{course_id}", response_model=List[AssessmentResponse])
async def get_course_assessments(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Assessment).where(Assessment.course_id == course_id, Assessment.is_active == True)
    result = await db.execute(query)
    return list(result.scalars().all())

@router.put("/{id}", response_model=AssessmentResponse)
async def update_assessment(
    id: int,
    request: AssessmentUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(Assessment).where(Assessment.id == id)
    result = await db.execute(query)
    assessment = result.scalars().first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    # Check if attempts exist
    attempts_check = await db.execute(
        select(func.count(AssessmentAttempt.id)).where(AssessmentAttempt.assessment_id == id)
    )
    attempts_count = attempts_check.scalar() or 0

    # If questions are provided, handle updating them
    if request.questions is not None:
        if attempts_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify questions because this assessment has already been attempted by students."
            )
        
        # Load questions to ensure relationship is hydrated and deletes occur
        from sqlalchemy.orm import selectinload
        q_query = select(Assessment).where(Assessment.id == id).options(selectinload(Assessment.questions))
        q_res = await db.execute(q_query)
        assessment = q_res.scalars().first()
        
        # Clear existing questions
        assessment.questions.clear()
        await db.flush()
        
        # Create new Questions & Options
        for i, q_data in enumerate(request.questions):
            new_q = Question(
                assessment_id=assessment.id,
                question_text=q_data.question_text,
                question_type=q_data.question_type,
                order_index=q_data.order_index or (i + 1),
                marks=q_data.marks,
                explanation=q_data.explanation
            )
            db.add(new_q)
            await db.flush()
            
            for opt_data in q_data.options:
                new_opt = Option(
                    question_id=new_q.id,
                    option_text=opt_data.option_text,
                    is_correct=opt_data.is_correct
                )
                db.add(new_opt)

    # Update other fields, excluding questions
    update_data = request.dict(exclude_unset=True)
    if "questions" in update_data:
        del update_data["questions"]

    for field, value in update_data.items():
        setattr(assessment, field, value)

    await db.commit()
    await db.refresh(assessment)
    return assessment

@router.post("/{id}/start", response_model=AttemptStartResponse)
async def start_assessment(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Fetch assessment
    assess_query = select(Assessment).where(Assessment.id == id, Assessment.is_active == True)
    assess_res = await db.execute(assess_query)
    assessment = assess_res.scalars().first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found or inactive.")

    course_id = assessment.course_id

    # 2. Check if all course modules are completed
    modules_query = select(func.count(CourseModule.id)).where(CourseModule.course_id == course_id)
    modules_res = await db.execute(modules_query)
    total_modules = modules_res.scalar() or 0

    progress_query = select(func.count(ModuleProgress.id)).where(
        ModuleProgress.user_id == current_user.id,
        ModuleProgress.course_id == course_id
    )
    progress_res = await db.execute(progress_query)
    completed_modules = progress_res.scalar() or 0

    if completed_modules < total_modules or total_modules == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assessment is locked. You must complete all course modules before taking the test."
        )

    # 3. Check attempts count
    attempts_query = select(func.count(AssessmentAttempt.id)).where(
        AssessmentAttempt.assessment_id == id,
        AssessmentAttempt.user_id == current_user.id
    )
    attempts_res = await db.execute(attempts_query)
    attempt_count = attempts_res.scalar() or 0

    # Fetch custom override
    override_query = select(AssessmentUserOverride).where(
        AssessmentUserOverride.assessment_id == id,
        AssessmentUserOverride.user_id == current_user.id
    )
    override_res = await db.execute(override_query)
    override = override_res.scalars().first()
    allowed_max = override.max_attempts if override else assessment.max_attempts

    if attempt_count >= allowed_max:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You have reached the maximum number of attempts ({allowed_max}) for this assessment."
        )

    # 4. Create attempt record
    new_attempt = AssessmentAttempt(
        assessment_id=id,
        user_id=current_user.id,
        attempt_number=attempt_count + 1,
        started_at=datetime.datetime.utcnow(),
        score=0.0,
        is_passed=False
    )
    db.add(new_attempt)
    await db.flush()

    # 5. Fetch questions and options
    q_query = select(Question).where(Question.assessment_id == id).order_by(Question.order_index)
    q_res = await db.execute(q_query)
    questions = list(q_res.scalars().all())

    # Shuffle questions if enabled
    if assessment.shuffle_questions:
        random.shuffle(questions)

    # Serialize questions without revealing correct options
    serialized_questions = []
    for q in questions:
        opt_query = select(Option).where(Option.question_id == q.id)
        opt_res = await db.execute(opt_query)
        options = list(opt_res.scalars().all())

        if assessment.shuffle_options:
            random.shuffle(options)

        serialized_options = [
            OptionResponse(id=o.id, option_text=o.option_text, is_correct=False)
            for o in options
        ]
        
        serialized_questions.append(
            QuestionResponse(
                id=q.id,
                question_text=q.question_text,
                question_type=q.question_type,
                order_index=q.order_index,
                marks=q.marks,
                explanation=None, # Hide explanation during attempt
                options=serialized_options
            )
        )

    await db.commit()

    return AttemptStartResponse(
        attempt_id=new_attempt.id,
        attempt_number=new_attempt.attempt_number,
        started_at=new_attempt.started_at,
        time_limit_minutes=assessment.time_limit_minutes,
        questions=serialized_questions
    )

@router.post("/attempts/{attempt_id}/submit", response_model=AttemptSubmitResponse)
async def submit_assessment(
    attempt_id: int,
    submission: AttemptSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Fetch attempt
    attempt_query = select(AssessmentAttempt).where(AssessmentAttempt.id == attempt_id)
    attempt_res = await db.execute(attempt_query)
    attempt = attempt_res.scalars().first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found.")

    if attempt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    if attempt.submitted_at is not None:
        raise HTTPException(status_code=400, detail="This attempt has already been submitted.")

    assessment_id = attempt.assessment_id
    assess_query = select(Assessment).where(Assessment.id == assessment_id)
    assess_res = await db.execute(assess_query)
    assessment = assess_res.scalars().first()

    now = datetime.datetime.utcnow()

    # 2. Check time limit (plus 30s grace)
    if assessment.time_limit_minutes:
        time_elapsed = (now - attempt.started_at).total_seconds()
        max_allowed_seconds = (assessment.time_limit_minutes * 60) + 30
        if time_elapsed > max_allowed_seconds:
            # Time expired. We will auto-submit whatever they sent, but notify them
            print(f"⚠️ Assessment time limit exceeded. Started: {attempt.started_at}, Submitted: {now}")

    # 3. Grade answers
    total_marks = 0
    earned_marks = 0
    correct_count = 0

    # Map submission details for quick lookup
    user_answers_map = {ans.question_id: ans.selected_option_ids for ans in submission.answers}

    # Fetch all questions
    q_query = select(Question).where(Question.assessment_id == assessment_id)
    q_res = await db.execute(q_query)
    questions = q_res.scalars().all()

    for q in questions:
        total_marks += q.marks
        
        # Get correct option IDs
        opt_query = select(Option.id).where(Option.question_id == q.id, Option.is_correct == True)
        opt_res = await db.execute(opt_query)
        correct_option_ids = list(opt_res.scalars().all())

        user_selected = user_answers_map.get(q.id, [])

        # Store answer in database
        db_answer = UserAnswer(
            attempt_id=attempt_id,
            question_id=q.id,
            selected_option_ids=user_selected
        )
        db.add(db_answer)

        # Grade answer
        is_correct = False
        if q.question_type in ["mcq", "true_false"]:
            if len(user_selected) == 1 and len(correct_option_ids) == 1:
                is_correct = user_selected[0] == correct_option_ids[0]
        elif q.question_type == "multi_select":
            is_correct = set(user_selected) == set(correct_option_ids)

        if is_correct:
            earned_marks += q.marks
            correct_count += 1

    # Calculate score
    score = (earned_marks / total_marks) * 100.0 if total_marks > 0 else 100.0
    is_passed = score >= assessment.pass_percentage

    # 4. Save attempt results
    attempt.submitted_at = now
    attempt.score = score
    attempt.is_passed = is_passed
    attempt.time_taken_seconds = int((now - attempt.started_at).total_seconds())

    # 5. Check if we should mark Assignment/Enrollment complete
    if is_passed:
        # Check assignment
        assign_query = select(Assignment).where(
            Assignment.assigned_to == current_user.id,
            Assignment.course_id == assessment.course_id
        )
        assign_res = await db.execute(assign_query)
        assignment = assign_res.scalars().first()
        if assignment:
            assignment.status = "completed"
            assignment.updated_at = now

        # Check enrollment
        enroll_query = select(Enrollment).where(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == assessment.course_id
        )
        enroll_res = await db.execute(enroll_query)
        enrollment = enroll_res.scalars().first()
        if enrollment:
            enrollment.progress_percent = 100.0
            enrollment.completed_at = now

        # Create notifications
        course_query = select(Course.title).where(Course.id == assessment.course_id)
        course_res = await db.execute(course_query)
        course_title = course_res.scalar() or "Course"
        
        notif = Notification(
            user_id=current_user.id,
            type="result",
            title=f"Passed Assessment: {assessment.title}",
            message=f"Congratulations! You passed the assessment for '{course_title}' with a score of {score:.1f}%.",
            is_read=False
        )
        db.add(notif)
    else:
        # Create notifications for fail
        course_query = select(Course.title).where(Course.id == assessment.course_id)
        course_res = await db.execute(course_query)
        course_title = course_res.scalar() or "Course"
        
        notif = Notification(
            user_id=current_user.id,
            type="result",
            title=f"Failed Assessment: {assessment.title}",
            message=f"You failed the assessment for '{course_title}' with a score of {score:.1f}%.",
            is_read=False
        )
        db.add(notif)

    # 6. Send results email
    override_query = select(AssessmentUserOverride).where(
        AssessmentUserOverride.assessment_id == assessment.id,
        AssessmentUserOverride.user_id == current_user.id
    )
    override_res = await db.execute(override_query)
    override = override_res.scalars().first()
    allowed_max = override.max_attempts if override else assessment.max_attempts
    attempts_left = allowed_max - attempt.attempt_number
    course_query = select(Course).where(Course.id == assessment.course_id)
    course_res = await db.execute(course_query)
    course = course_res.scalars().first()
    await send_assessment_result_email(
        current_user.email,
        current_user.full_name,
        course.title if course else "Course",
        score,
        is_passed,
        attempts_left
    )

    await db.commit()

    sig = get_certificate_signature(attempt_id) if is_passed else None
    url = f"http://10.18.138.234:8000/assessments/attempts/{attempt_id}/certificate?signature={sig}" if is_passed else None

    return AttemptSubmitResponse(
        attempt_id=attempt_id,
        score=score,
        is_passed=is_passed,
        correct_answers_count=correct_count,
        total_questions=len(questions),
        time_taken_seconds=attempt.time_taken_seconds,
        certificate_signature=sig,
        certificate_url=url
    )

@router.get("/attempts/{attempt_id}", response_model=AttemptDetailResponse)
async def get_attempt_detail(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(AssessmentAttempt).where(AssessmentAttempt.id == attempt_id)
    res = await db.execute(query)
    attempt = res.scalars().first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found.")

    # Admin can see any; associate only their own
    if current_user.role != "admin" and attempt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    assessment_id = attempt.assessment_id
    assess_query = select(Assessment).where(Assessment.id == assessment_id)
    assess_res = await db.execute(assess_query)
    assessment = assess_res.scalars().first()

    # Check review policy
    show_correct = False
    if current_user.role == "admin":
        show_correct = True
    else:
        # Determine user total attempts
        att_query = select(func.count(AssessmentAttempt.id)).where(
            AssessmentAttempt.assessment_id == assessment_id,
            AssessmentAttempt.user_id == current_user.id
        )
        att_res = await db.execute(att_query)
        total_attempts = att_res.scalar() or 0
        
        if assessment.show_correct_answers == "after_passing" and attempt.is_passed:
            show_correct = True
        elif assessment.show_correct_answers == "after_attempts_used":
            override_query = select(AssessmentUserOverride).where(
                AssessmentUserOverride.assessment_id == assessment_id,
                AssessmentUserOverride.user_id == current_user.id
            )
            override_res = await db.execute(override_query)
            override = override_res.scalars().first()
            allowed_max = override.max_attempts if override else assessment.max_attempts
            if total_attempts >= allowed_max:
                show_correct = True

    # Get user answers
    ans_query = select(UserAnswer).where(UserAnswer.attempt_id == attempt_id)
    ans_res = await db.execute(ans_query)
    user_answers = ans_res.scalars().all()
    user_answers_dict = {ua.question_id: ua.selected_option_ids for ua in user_answers}

    # Fetch questions
    q_query = select(Question).where(Question.assessment_id == assessment_id)
    q_res = await db.execute(q_query)
    questions = q_res.scalars().all()

    answers_detail = []
    for q in questions:
        opt_query = select(Option).where(Option.question_id == q.id)
        opt_res = await db.execute(opt_query)
        options = opt_res.scalars().all()

        correct_ids = [o.id for o in options if o.is_correct]
        user_selected = user_answers_dict.get(q.id, [])

        is_correct = False
        if q.question_type in ["mcq", "true_false"]:
            is_correct = len(user_selected) == 1 and user_selected[0] in correct_ids
        elif q.question_type == "multi_select":
            is_correct = set(user_selected) == set(correct_ids)

        answers_detail.append(
            UserAnswerDetailResponse(
                question_id=q.id,
                selected_option_ids=user_selected,
                correct_option_ids=correct_ids if show_correct else [],
                is_correct=is_correct
            )
        )

    sig = get_certificate_signature(attempt.id) if attempt.is_passed else None
    url = f"http://10.18.138.234:8000/assessments/attempts/{attempt.id}/certificate?signature={sig}" if attempt.is_passed else None

    return AttemptDetailResponse(
        id=attempt.id,
        assessment_id=attempt.assessment_id,
        user_id=attempt.user_id,
        attempt_number=attempt.attempt_number,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
        score=attempt.score,
        is_passed=attempt.is_passed,
        time_taken_seconds=attempt.time_taken_seconds,
        user_answers=answers_detail,
        certificate_signature=sig,
        certificate_url=url
    )

@router.get("/{id}/results", response_model=List[AttemptDetailResponse])
async def get_my_assessment_results(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(AssessmentAttempt).where(
        AssessmentAttempt.assessment_id == id,
        AssessmentAttempt.user_id == current_user.id
    ).order_by(AssessmentAttempt.attempt_number.desc())
    result = await db.execute(query)
    return list(result.scalars().all())

# --- Certificate Generation Page (Print-friendly HTML) ---

@router.get("/attempts/{attempt_id}/certificate", response_class=HTMLResponse)
async def generate_certificate(
    attempt_id: int,
    signature: str,
    db: AsyncSession = Depends(get_db)
):
    # Verify signature to prevent ID tampering (IDOR)
    expected_signature = get_certificate_signature(attempt_id)
    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid signature or unauthorized certificate access."
        )

    # Fetch attempt
    attempt_query = select(AssessmentAttempt).where(AssessmentAttempt.id == attempt_id)
    attempt_res = await db.execute(attempt_query)
    attempt = attempt_res.scalars().first()
    if not attempt or not attempt.is_passed:
        raise HTTPException(status_code=404, detail="Passed attempt not found.")

    # Fetch User
    user_query = select(User).where(User.id == attempt.user_id)
    user_res = await db.execute(user_query)
    user = user_res.scalars().first()

    # Fetch Assessment & Course
    assess_query = select(Assessment).where(Assessment.id == attempt.assessment_id)
    assess_res = await db.execute(assess_query)
    assessment = assess_res.scalars().first()

    course_query = select(Course).where(Course.id == assessment.course_id)
    course_res = await db.execute(course_query)
    course = course_res.scalars().first()

    date_str = attempt.submitted_at.strftime("%B %d, %Y") if attempt.submitted_at else "N/A"

    from fastapi.responses import HTMLResponse

    certificate_html = f"""
   <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Certificate of Completion - {user.full_name}</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Pinyon+Script&family=Source+Sans+Pro:wght@400;600;700&display=swap');

    :root {{
        --navy-deep: #0d2b4e;
        --navy: #14497a;
        --blue: #2f7bb8;
        --blue-light: #7fb8dd;
        --grey-dark: #3c4248;
        --grey: #6b7280;
        --grey-light: #d1d5db;
    }}

    * {{ box-sizing: border-box; }}

    body {{
        font-family: 'Source Sans Pro', Arial, sans-serif;
        background-color: #eceef1;
        margin: 0;
        padding: 40px;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
    }}

    .page-wrapper {{ position: relative; }}

    .print-btn {{
        position: absolute;
        top: -50px;
        right: 0;
        padding: 10px 22px;
        background-color: var(--navy-deep);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        font-family: 'Source Sans Pro', Arial, sans-serif;
        font-size: 13px;
        letter-spacing: 0.5px;
    }}
    .print-btn:hover {{ background-color: var(--navy); }}

    .certificate-container {{
        background-color: #ffffff;
        width: 850px;
        height: 1000px;
        position: relative;
        box-shadow: 0 20px 50px rgba(13, 43, 78, 0.25);
        overflow: hidden;
    }}

    .wave-svg {{
        position: absolute;
        width: 100%;
        left: 0;
        z-index: 1;
        display: block;
    }}
    .wave-top {{ top: 0; }}
    .wave-bottom {{ bottom: 0; }}

    .content {{
        position: relative;
        z-index: 2;
        height: 100%;
        display: flex;
        flex-direction: column;
    }}

    .header-row {{
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 38px 50px 0 50px;
    }}

    .logo-block {{
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        margin-top: 2px;
    }}
    .logo-chip {{
        background: #ffffff;
        border-radius: 4px;
        padding: 8px 14px;
        display: inline-flex;
        align-items: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.12);
    }}
    .logo-chip img {{
        height: 26px;
        width: auto;
        display: block;
    }}
    .logo-sub {{
        font-size: 9.5px;
        letter-spacing: 2px;
        opacity: 0.9;
        text-transform: uppercase;
        color: #ffffff;
        margin-left: 2px;
    }}

    .badge {{
        width: 92px;
        height: 92px;
        margin-top: 4px;
    }}

    .body-block {{
        padding: 0 60px;
        margin-top: 56px;
    }}

    .title {{
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 42px;
        color: var(--grey-dark);
        margin: 0;
        font-weight: 700;
        letter-spacing: 1px;
        line-height: 1;
    }}

    .title-script {{
        font-family:Arial, Helvetica, sans-serif;
        font-size: 36px;
        color: var(--navy);
        margin-top: 4px;
        font-weight: 400;
    }}

    .presented-to {{
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 1.5px;
        color: var(--grey-dark);
        margin-top: 44px;
    }}

    .recipient-name {{
        font-family:Arial, Helvetica, sans-serif;
        font-size: 46px;
        color: var(--navy);
        margin-top: 14px;
        font-weight: 400;
        display: inline-block;
        min-width: 360px;
    }}

    .details {{
        font-size: 14px;
        color: var(--grey);
        line-height: 1.7;
        margin-top: 22px;
        max-width: 580px;
    }}

    .course-title {{
        font-weight: 700;
        color: var(--navy-deep);
        font-size: 19px;
        margin-top: 12px;
        font-family: 'Playfair Display', Georgia, serif;
    }}

    .footer-info {{
        display: flex;
        justify-content: space-between;
        margin-top: 50px;
        max-width: 560px;
    }}

    .footer-info .block {{ text-align: center; min-width: 160px; }}

    .sig-line {{
        border-top: 1px solid var(--grey-light);
        width: 170px;
        margin: 0 auto 10px auto;
    }}

    .sig-name {{
        font-family: 'Pinyon Script', cursive;
        font-size: 24px;
        color: var(--navy);
        margin-bottom: 6px;
    }}

    .footer-label {{
        font-weight: 700;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        font-size: 10.5px;
        color: var(--grey-dark);
    }}

    .seal-score {{
        position: absolute;
        bottom: 200px;
        left: 50%;
        transform: translateX(-50%);
        width: 86px;
        height: 86px;
        border-radius: 50%;
        background: var(--navy-deep);
        border: 4px solid #ffffff;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: #ffffff;
        box-shadow: 0 6px 14px rgba(13,43,78,0.4);
        z-index: 3;
    }}
    .seal-score .score {{ font-size: 17px; font-weight: 700; line-height: 1; }}
    .seal-score .label {{ font-size: 8px; letter-spacing: 1.5px; margin-top: 4px; opacity: 0.9; }}

    @media print {{
        body {{ background: white; padding: 0; margin: 0; }}
        .print-btn {{ display: none; }}
        .certificate-container {{ box-shadow: none; }}
    }}
</style>
</head>
<body>
    <div class="page-wrapper">
        <button class="print-btn" onclick="window.print()">Print / Save PDF</button>

        <div class="certificate-container">

            <!-- Top wave shapes -->
            <svg class="wave-svg wave-top" viewBox="0 0 850 260" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,0 H560 C480,90 380,60 300,140 C220,220 120,160 0,210 Z" fill="#7fa8c9" opacity="0.55"/>
                <path d="M0,0 H480 C400,70 320,40 250,110 C170,190 90,130 0,170 Z" fill="#2f7bb8"/>
                <path d="M0,0 H300 C230,55 160,30 100,90 C50,140 20,110 0,130 Z" fill="#0d2b4e"/>
            </svg>

            <!-- Bottom wave shapes -->
            <svg class="wave-svg wave-bottom" viewBox="0 0 850 260" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,260 H850 V160 C760,120 700,170 620,150 C520,125 460,80 380,95 C300,110 260,160 180,150 C100,140 60,180 0,170 Z" fill="#9fb8cc" opacity="0.55"/>
                <path d="M0,260 H850 V190 C760,160 690,200 610,180 C520,158 470,120 390,135 C310,150 270,190 190,180 C120,172 70,200 0,195 Z" fill="#2f7bb8"/>
                <path d="M0,260 H850 V225 C760,205 700,235 630,222 C540,206 500,180 420,190 C340,200 310,225 230,218 C150,212 100,230 0,228 Z" fill="#0d2b4e"/>
            </svg>

            <div class="content">
                <div class="header-row">
                    <div class="logo-block">
                        <div class="logo-mark"></div>
                        <div class="logo-text-block">
                            <div class="logo-name"><img src="https://koerber-stellium.com/wp-content/uploads/2026/02/Untitled-design-74-e1772357803850.webp" style="width: 100px;" alt="" srcset=""></div>
                            <div class="logo-sub">Learning Portal</div>
                        </div>
                    </div>

                    <svg class="badge" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="50,2 61,8 73,6 78,17 90,22 86,34 93,45 82,52 83,64 71,65 65,76 53,72 42,79 36,68 24,69 22,57 11,52 16,40 9,29 20,23 19,11 31,11 38,2" fill="#ffffff" stroke="#9fb8cc" stroke-width="1.5"/>
                        <circle cx="51" cy="40" r="26" fill="#ffffff" stroke="#2f7bb8" stroke-width="2.5"/>
                        <text x="51" y="36" text-anchor="middle" font-family="Pinyon Script, cursive" font-size="13" fill="#2f7bb8">Best</text>
                        <text x="51" y="49" text-anchor="middle" font-family="Source Sans Pro, Arial, sans-serif" font-size="9" font-weight="700" letter-spacing="1" fill="#0d2b4e">AWARD</text>
                        <polygon points="38,62 38,100 51,88 64,100 64,62" fill="#0d2b4e"/>
                    </svg>
                </div>

                <div class="body-block">
                    <div class="title">CERTIFICATE</div>
                    <div class="title-script">of Completion</div>

                    <div class="presented-to">PROUDLY PRESENTED TO :</div>
                    <div class="recipient-name">{user.full_name}</div>

                    <div class="details">
                        for successfully completing all training modules and passing the final assessment for the course
                        <div class="course-title">{course.title if course else "Course"}</div>
                    </div>

                    <div class="footer-info">
                        <div class="block">
                            <div class="sig-name">Portal Admin</div>
                            <div class="sig-line"></div>
                            <div class="footer-label">SIGNATURE</div>
                        </div>
                        <div class="block">
                            <div style="font-size:15px; color:var(--grey-dark); font-weight:600; margin-bottom:11px; font-family:'Playfair Display',Georgia,serif;">{date_str}</div>
                            <div class="sig-line"></div>
                            <div class="footer-label">DATE</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="seal-score">
                <div class="score">{attempt.score:.1f}%</div>
                <div class="label">PASSED</div>
            </div>

        </div>
    </div>
</body>
</html>
    """
    return HTMLResponse(content=certificate_html)

@router.get("/course/{course_id}/passed-attempt")
async def get_passed_attempt(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Fetch assessment for the course
    assess_query = select(Assessment).where(Assessment.course_id == course_id, Assessment.is_active == True)
    assess_res = await db.execute(assess_query)
    assessment = assess_res.scalars().first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found for this course.")
        
    # 2. Fetch the passed attempt for this user and assessment
    attempt_query = (
        select(AssessmentAttempt)
        .where(
            AssessmentAttempt.assessment_id == assessment.id,
            AssessmentAttempt.user_id == current_user.id,
            AssessmentAttempt.is_passed == True
        )
        .order_by(AssessmentAttempt.submitted_at.desc())
    )
    attempt_res = await db.execute(attempt_query)
    attempt = attempt_res.scalars().first()
    if not attempt:
        raise HTTPException(status_code=404, detail="No passed attempt found.")
        
    sig = get_certificate_signature(attempt.id)
    return {
        "attempt_id": attempt.id,
        "signature": sig,
        "certificate_url": f"http://10.18.138.234:8000/assessments/attempts/{attempt.id}/certificate?signature={sig}"
    }
