from pydantic import BaseModel, EmailStr, Field, validator, computed_field
from datetime import datetime
from typing import List, Optional

# Token Schemas
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    email: str

class TokenRefreshRequest(BaseModel):
    refresh_token: str

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

    @validator("password")
    def validate_password(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        if not any(c in "!@#$%^&*()-_=+[]{}|;:',.<>?/~`" for c in v):
            raise ValueError("Password must contain at least one special character")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    is_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None

class UserRoleUpdate(BaseModel):
    role: str  # 'admin', 'associate'

    @validator("role")
    def validate_role(cls, v):
        if v not in ["admin", "associate"]:
            raise ValueError("Role must be 'admin' or 'associate'")
        return v

class UserStatusUpdate(BaseModel):
    is_active: bool

# OTP & Password Reset
class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)
    purpose: str  # 'signup', 'password_reset'

class ResendOTPRequest(BaseModel):
    email: EmailStr
    purpose: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str = Field(..., min_length=8)

    @validator("new_password")
    def validate_password(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        if not any(c in "!@#$%^&*()-_=+[]{}|;:',.<>?/~`" for c in v):
            raise ValueError("Password must contain at least one special character")
        return v

# Option Schemas
class OptionBase(BaseModel):
    option_text: str
    is_correct: bool

class OptionCreate(OptionBase):
    pass

class OptionResponse(OptionBase):
    id: int

    class Config:
        from_attributes = True

# Question Schemas
class QuestionBase(BaseModel):
    question_text: str
    question_type: str  # 'mcq', 'true_false', 'multi_select'
    order_index: int = 0
    marks: int = 1
    explanation: Optional[str] = None

class QuestionCreate(QuestionBase):
    options: List[OptionCreate]

class QuestionResponse(QuestionBase):
    id: int
    options: List[OptionResponse]

    class Config:
        from_attributes = True

# Assessment Schemas
class AssessmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    pass_percentage: int = 70
    time_limit_minutes: Optional[int] = None
    max_attempts: int = 2
    shuffle_questions: bool = False
    shuffle_options: bool = False
    show_correct_answers: str = "never" # 'never', 'after_passing', 'after_attempts_used'
    is_active: bool = True

class AssessmentCreate(AssessmentBase):
    course_id: int
    questions: List[QuestionCreate]

class AssessmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    pass_percentage: Optional[int] = None
    time_limit_minutes: Optional[int] = None
    max_attempts: Optional[int] = None
    shuffle_questions: Optional[bool] = None
    shuffle_options: Optional[bool] = None
    show_correct_answers: Optional[str] = None
    questions: Optional[List[QuestionCreate]] = None
    is_active: Optional[bool] = None

class AssessmentResponse(AssessmentBase):
    id: int
    course_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Course Module Schemas
class CourseModuleBase(BaseModel):
    title: str
    description: Optional[str] = None
    content_type: str  # 'pdf', 'video', 'link', 'text'
    external_url: Optional[str] = None
    text_content: Optional[str] = None
    order_index: int = 0

class CourseModuleCreate(CourseModuleBase):
    file_path: Optional[str] = None

class CourseModuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content_type: Optional[str] = None
    external_url: Optional[str] = None
    text_content: Optional[str] = None
    order_index: Optional[int] = None
    file_path: Optional[str] = None

class CourseModuleResponse(CourseModuleBase):
    id: int
    course_id: int
    file_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Course Schemas
class CourseBase(BaseModel):
    title: str
    description: str
    category: str
    course_type: str  # 'assigned', 'free'
    content_type: str = "mixed"  # 'pdf', 'video', 'link', 'mixed'
    external_url: Optional[str] = None
    duration_minutes: int = 0
    is_published: bool = False

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    course_type: Optional[str] = None
    content_type: Optional[str] = None
    external_url: Optional[str] = None
    duration_minutes: Optional[int] = None
    is_published: Optional[bool] = None
    thumbnail_path: Optional[str] = None

class CourseResponse(CourseBase):
    id: int
    thumbnail_path: Optional[str] = None
    file_path: Optional[str] = None
    created_by: int
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def thumbnail_url(self) -> Optional[str]:
        return self.thumbnail_path

    class Config:
        from_attributes = True

class CourseDetailResponse(CourseResponse):
    modules: List[CourseModuleResponse] = []
    assessments: List[AssessmentResponse] = []

    class Config:
        from_attributes = True

# Assignment Schemas
class AssignmentCreate(BaseModel):
    course_id: int
    assigned_to: List[int]
    deadline: datetime

class AssignmentExtendRequest(BaseModel):
    deadline: datetime

class AssignmentResponse(BaseModel):
    id: int
    course_id: int
    assigned_to: int
    assigned_by: int
    deadline: datetime
    status: str
    assigned_at: datetime
    updated_at: datetime
    course: CourseResponse
    assigned_user: UserResponse

    class Config:
        from_attributes = True

# Enrollment Schemas
class EnrollmentCreate(BaseModel):
    course_id: int

class EnrollmentResponse(BaseModel):
    id: int
    course_id: int
    user_id: int
    enrolled_at: datetime
    progress_percent: float
    completed_at: Optional[datetime] = None
    course: CourseResponse

    class Config:
        from_attributes = True

# Module Progress
class ModuleProgressResponse(BaseModel):
    id: int
    user_id: int
    course_id: int
    module_id: int
    completed_at: datetime

    class Config:
        from_attributes = True

class CourseProgressDetailResponse(BaseModel):
    course_id: int
    progress_percent: float
    completed_modules: List[int]
    is_completed: bool

# Assessment Attempt Schemas
class UserAnswerRequest(BaseModel):
    question_id: int
    selected_option_ids: List[int]

class AttemptStartResponse(BaseModel):
    attempt_id: int
    attempt_number: int
    started_at: datetime
    time_limit_minutes: Optional[int]
    questions: List[QuestionResponse]  # Note: Options won't have is_correct in regular flow

class AttemptSubmitRequest(BaseModel):
    answers: List[UserAnswerRequest]

class AttemptSubmitResponse(BaseModel):
    attempt_id: int
    score: float
    is_passed: bool
    correct_answers_count: int
    total_questions: int
    time_taken_seconds: int
    certificate_signature: Optional[str] = None
    certificate_url: Optional[str] = None

class UserAnswerDetailResponse(BaseModel):
    question_id: int
    selected_option_ids: List[int]
    correct_option_ids: List[int]
    is_correct: bool

class AttemptDetailResponse(BaseModel):
    id: int
    assessment_id: int
    user_id: int
    attempt_number: int
    started_at: datetime
    submitted_at: Optional[datetime]
    score: float
    is_passed: bool
    time_taken_seconds: Optional[int]
    user_answers: List[UserAnswerDetailResponse] = []
    certificate_signature: Optional[str] = None
    certificate_url: Optional[str] = None

    class Config:
        from_attributes = True

# Notification Schemas
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Analytics Schemas
class DashboardOverview(BaseModel):
    total_users_admin: int
    total_users_associate: int
    total_courses_assigned: int
    total_courses_free: int
    active_assignments: int
    overdue_assignments: int

class CourseAnalytics(BaseModel):
    course_id: int
    title: str
    category: str
    course_type: str
    total_assigned: int
    total_completed: int
    completion_rate: float
    avg_assessment_score: float
    pass_rate: float

class UserAnalytics(BaseModel):
    user_id: int
    full_name: str
    email: str
    assigned_courses_count: int
    completed_courses_count: int
    overall_progress: float

class ExhaustedAttemptResponse(BaseModel):
    user_id: int
    user_name: str
    user_email: str
    course_id: int
    course_title: str
    assessment_id: int
    assessment_title: str
    attempts_count: int
    max_attempts: int

class IncreaseAttemptsRequest(BaseModel):
    user_id: int
    assessment_id: int
