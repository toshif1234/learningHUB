# 🎓 Internal Learning Portal — Full-Stack Build Prompt

## Project Overview

Build a production-ready **Internal Learning Management System (LMS)** for a corporate team. The application enables admins to upload and assign courses with deadlines, associates to consume learning content and take assessments, and all users to freely enroll in open-access courses. The system uses email OTP-based authentication with role-based access control.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (JSX), React Router v6, Axios, TailwindCSS |
| Backend | FastAPI (Python 3.11+) |
| Database | SQLite via SQLAlchemy ORM (async) |
| Auth | JWT (access + refresh tokens) + Email OTP |
| Email | SMTP (configurable: Gmail / SendGrid / SMTP relay) |
| File Storage | Local filesystem (`/uploads/` directory) with UUID-named files |

---

## Directory Structure

```
learning-portal/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth/
│   │   ├── router.py
│   │   ├── utils.py          # JWT, OTP generation, password hashing
│   │   └── email_service.py  # SMTP OTP sender
│   ├── routers/
│   │   ├── users.py
│   │   ├── courses.py
│   │   ├── assignments.py
│   │   ├── assessments.py
│   │   └── enrollments.py
│   ├── dependencies.py       # get_current_user, require_admin, require_associate
│   ├── config.py             # env-based settings (SECRET_KEY, SMTP config, etc.)
│   └── uploads/              # uploaded course files (PDFs, videos, etc.)
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/              # axios instances and per-module API calls
│   │   ├── components/       # shared UI: Navbar, Sidebar, Modal, Spinner, etc.
│   │   ├── pages/
│   │   │   ├── auth/         # Login, Signup, OTPVerify, ForgotPassword
│   │   │   ├── admin/        # Dashboard, CourseUpload, AssignCourse, UserManagement
│   │   │   └── associate/    # Dashboard, MyCourses, CourseViewer, Assessment, Results
│   │   ├── context/          # AuthContext (user, role, token management)
│   │   ├── hooks/            # useAuth, useCourses, useAssessment
│   │   ├── routes/           # ProtectedRoute, AdminRoute, PublicRoute
│   │   └── utils/            # formatDate, countdownTimer, toastHelpers
│   └── package.json
│
├── .env.example
└── README.md
```

---

## Database Schema (SQLite / SQLAlchemy)

### `users`
```
id (PK), email (unique, indexed), full_name, hashed_password,
role (ENUM: 'admin', 'associate'), is_verified (bool, default False),
is_active (bool, default True), created_at, updated_at
```

### `otp_records`
```
id (PK), email, otp_code (6-digit), purpose (ENUM: 'signup', 'password_reset'),
expires_at (datetime, 10 min TTL), is_used (bool), created_at
```

### `courses`
```
id (PK), title, description, category (e.g. EWM, TM, DMC, SD, MM, PP, QM, etc.),
course_type (ENUM: 'assigned', 'free'), content_type (ENUM: 'pdf', 'video', 'link', 'mixed'),
file_path (nullable), external_url (nullable), thumbnail_path (nullable),
duration_minutes (int), created_by (FK → users.id), is_published (bool),
created_at, updated_at
```

### `course_modules`
```
id (PK), course_id (FK), title, description, content_type,
file_path, external_url, order_index (int), created_at
```

### `assignments`
```
id (PK), course_id (FK → courses.id), assigned_to (FK → users.id),
assigned_by (FK → users.id), deadline (datetime), status (ENUM: 'pending', 'in_progress', 'completed', 'overdue'),
assigned_at, updated_at
```

### `enrollments` (for free courses)
```
id (PK), course_id (FK), user_id (FK), enrolled_at,
progress_percent (float, default 0), completed_at (nullable)
```

### `assessments`
```
id (PK), course_id (FK), title, description, pass_percentage (int, default 70),
time_limit_minutes (int, nullable), max_attempts (int, default 3),
is_active (bool), created_at
```

### `questions`
```
id (PK), assessment_id (FK), question_text, question_type (ENUM: 'mcq', 'true_false', 'multi_select'),
order_index (int), marks (int, default 1), created_at
```

### `options`
```
id (PK), question_id (FK), option_text, is_correct (bool)
```

### `assessment_attempts`
```
id (PK), assessment_id (FK), user_id (FK), attempt_number (int),
started_at, submitted_at, score (float), is_passed (bool),
time_taken_seconds (int)
```

### `user_answers`
```
id (PK), attempt_id (FK), question_id (FK), selected_option_ids (JSON array of option IDs)
```

### `notifications`
```
id (PK), user_id (FK), type (ENUM: 'assignment', 'deadline_reminder', 'result', 'system'),
title, message, is_read (bool, default False), created_at
```

---

## Feature Specifications

---

### 1. Authentication & User Management

#### Signup Flow
1. User fills: full name, email, password, confirm password
2. Backend validates email format, password strength (min 8 chars, 1 uppercase, 1 number, 1 special char)
3. Check if email already exists — if so return `409 Conflict`
4. Generate 6-digit OTP, store in `otp_records` with 10-minute expiry
5. Send OTP via email with a clean HTML template
6. User is created with `is_verified=False`
7. Frontend redirects to OTP verification page
8. On correct OTP: set `is_verified=True`, delete OTP record, return JWT
9. Resend OTP option with 60-second cooldown enforced both frontend and backend
10. If OTP expires, user must request a new one; old OTPs are invalidated on resend

#### Login Flow
1. User submits email + password
2. Backend checks: user exists, `is_verified=True`, `is_active=True`, password matches
3. Return `access_token` (15-min TTL) + `refresh_token` (7-day TTL)
4. Frontend stores tokens in memory (access) and `httpOnly cookie` or `localStorage` (refresh — document tradeoffs in README)
5. Refresh token endpoint: `/auth/refresh` — validates refresh token, issues new access token
6. Logout: clears tokens on frontend; optionally blacklist refresh token in DB

#### Password Reset Flow
1. User requests reset by entering email
2. If email exists and is verified → send OTP (purpose: `password_reset`)
3. User enters OTP → backend validates → frontend shows "set new password" form
4. On success, invalidate all existing refresh tokens for that user

#### Role Assignment
- Default role on signup: `associate`
- Admin can promote any verified user to `admin` from the User Management panel
- First user in the system is automatically made `admin` (seeding logic)

#### Edge Cases
- Prevent brute-force: rate limit OTP requests to 3 per 15 minutes per email (use in-memory or DB counter)
- Inactive users (`is_active=False`) cannot login — show "Account disabled. Contact admin."
- All protected routes return `401` if token is missing/invalid, `403` if role is insufficient

---

### 2. Admin — Course Management

#### Upload Course
Form fields:
- Title (required)
- Description (rich text or markdown)
- Category (dropdown: EWM, TM, DMC, SD, MM, PP, QM, FI, HR — admin can also type custom category)
- Course Type: `assigned` or `free`
- Content: upload PDF/video file OR paste external URL (YouTube, SharePoint, etc.) OR both
- Thumbnail image upload
- Duration (in minutes)
- Publish toggle (draft vs published)

Backend:
- Files stored at `/uploads/courses/{course_id}/` with UUID filenames
- Validate MIME types (PDF: `application/pdf`, Video: `video/*`)
- File size limit: 500 MB per file (configurable)
- Return course ID immediately; files upload asynchronously with progress tracking

#### Course Modules
- Each course can have multiple ordered modules (e.g., Week 1 Reading, Week 2 Video, etc.)
- Admin can add/reorder/delete modules from a course detail page
- Each module has its own content (file or URL)

#### Course CRUD
- List all courses with filters: category, type, publish status, search by title
- Edit course details and republish
- Delete course (soft delete — sets `is_published=False`, warns if active assignments exist)
- Duplicate course

---

### 3. Admin — Integrated Course & Assessment Builder (NEW)

This is the **primary course creation experience** for admins. Instead of separate flows for uploading course content and creating assessments, the admin uses a single unified multi-step builder that produces a complete, ready-to-assign course with embedded tests.

#### Builder — Step 1: Course Info
A clean form with the following fields:

| Field | Type | Notes |
|---|---|---|
| Course Title | Text input | Required, max 120 chars |
| Short Description | Textarea | Required, shown on course cards |
| Detailed Description | Rich text (markdown or simple WYSIWYG) | Shown on course detail page |
| Category | Dropdown + "Add custom" | EWM, TM, DMC, SD, MM, PP, QM, FI, HR, or custom |
| Course Type | Toggle | `Assigned` (admin assigns) or `Free` (self-enroll) |
| Thumbnail | Image upload | JPEG/PNG, max 2 MB, preview shown inline |
| Estimated Duration | Number input | In minutes |
| Publish Immediately | Checkbox | Unchecked = save as draft |

UI behaviour:
- Auto-save as draft on step navigation (don't lose work on back/forward)
- Show completion indicator per step (e.g., Step 1 of 3 — ✅ Done)

---

#### Builder — Step 2: Course Content (Modules)

Admin builds the course content as an ordered list of **modules**. Each module is a self-contained unit of learning.

**Add Module panel** (shown inline, not a separate page):

| Field | Type | Notes |
|---|---|---|
| Module Title | Text | e.g., "Introduction to EWM", "Hands-on Exercise 1" |
| Module Description | Short textarea | Optional summary |
| Content Type | Tab selector | `Upload File` / `Paste URL` / `Text/Notes` |
| File Upload | Drag-and-drop zone | PDF or video (mp4, webm), max 500 MB, shows upload % progress bar |
| External URL | Text input | YouTube, SharePoint, Vimeo, or any link |
| Text/Notes | Markdown editor | For typed notes, checklists, or reference content |

**Module list behaviour:**
- Modules displayed as stacked cards with drag handles for reordering
- Each card shows: module number, title, content type icon, duration (if set), and action buttons (Edit / Delete)
- "Add Module" button at the bottom always visible
- Warn if admin tries to go to Step 3 with zero modules
- Minimum 1 module required to proceed

---

#### Builder — Step 3: Test & Assessment Builder

Admin creates the course assessment in the same flow, immediately after defining the content. This ensures every course ships with a corresponding test.

**Assessment settings (top of page):**

| Field | Type | Default |
|---|---|---|
| Assessment Title | Text | Auto-filled: "{Course Title} — Assessment" |
| Instructions | Textarea | Shown to associate before they start |
| Pass Percentage | Number (0–100) | 70 |
| Time Limit | Number (minutes) | Leave blank = no limit |
| Max Attempts Allowed | Number | 3 |
| Show Correct Answers After | Dropdown | `Never` / `After passing` / `After all attempts used` |
| Shuffle Questions | Toggle | Off by default |
| Shuffle Options | Toggle | Off by default |

**Question Builder (core feature):**

Admin can add unlimited questions. Each question is added via an inline form that appears below the question list when "+ Add Question" is clicked.

**Per-question form fields:**

| Field | Type | Notes |
|---|---|---|
| Question Text | Textarea | Required. Supports inline code formatting for technical questions |
| Question Type | Segmented control | `Single Correct (MCQ)` / `Multiple Correct` / `True / False` |
| Marks | Number input | Default: 1. Admin can assign higher marks to harder questions |
| Explanation | Textarea | Optional. Shown to associate when reviewing wrong answers |
| Options | Dynamic list | See below |

**Option entry (for MCQ and Multiple Correct):**
- Start with 2 options pre-rendered, each with a text input and a "Mark as correct" toggle/checkbox
- "Add Option" button adds a new option row (up to 6 options per question)
- Remove button on each option row (minimum 2 options enforced)
- For MCQ: only one option can be marked correct (radio-style enforce)
- For Multiple Correct: two or more options must be marked correct (checkbox-style, validate on save)
- For True/False: options auto-rendered as "True" and "False" — admin only picks which is correct

**Question list behaviour:**
- Questions displayed as numbered accordion cards (collapsed after saving)
- Expand card to edit
- Drag to reorder
- Duplicate question button (useful for similar questions)
- Delete question (with confirmation if assessment has been attempted — block deletion in that case)
- Running total shown: e.g., "8 questions — 12 total marks"

**Validation before saving assessment:**
- At least 1 question required
- Every question must have question text
- Every question must have at least 1 correct answer marked
- MCQ must have exactly 1 correct answer
- Multiple correct must have ≥ 2 correct answers
- No two options on the same question should have identical text
- If pass percentage is set, warn if total marks make it mathematically impossible to pass (e.g., 3 marks total, 70% pass = 2.1 marks minimum — flag this)

---

#### Builder — Step 4: Review & Publish

A read-only summary of everything the admin has configured:

- Course metadata card (title, category, type, duration, thumbnail preview)
- Module list (ordered, with content type icons and titles)
- Assessment card: pass %, time limit, attempt limit, total questions, total marks
- Question preview (collapsed accordion — admin can expand each to verify)
- Two action buttons:
  - **Save as Draft** — saves everything, returns to course list
  - **Publish Course** — sets `is_published=True`, course becomes live

**Post-publish behaviour:**
- If course type is `free`: immediately visible in the Free Course Catalog
- If course type is `assigned`: ready to be assigned to associates from the Assign Courses screen
- Admin sees a success screen with two CTAs: "Assign This Course" and "Create Another Course"

---

#### Edit Existing Course (from Course List)

Admin can re-enter the same multi-step builder for any existing course:

- Steps 1 and 2 (Course Info and Modules) are always editable
- Step 3 (Assessment) is editable **only if no associates have started an attempt**
- If attempts exist:
  - Show banner: "X associates have attempted this assessment. Questions cannot be edited to preserve result integrity."
  - Admin can still update: Assessment title, instructions, pass %, time limit, max attempts
  - To change questions: admin must create a new version of the course (Duplicate Course feature)
- Changes to course info and modules take effect immediately for all users (including those mid-course)

---

#### Course Preview Mode

Before publishing, admin can click "Preview as Associate" — opens the course viewer in a read-only mode, showing exactly what an associate will see:
- Module navigation sidebar
- Content rendering (PDF embed, video player, text)
- Assessment start screen (with settings visible)
- First question rendered (non-interactive, clearly labelled "Preview Mode")

---

### 4. Admin — Assign Courses

#### Assignment Flow
1. Admin selects one or more users (searchable multi-select by name/email)
2. Admin selects a published assigned-type course
3. Admin sets a deadline (date + time picker, must be in the future)
4. On submit:
   - Create `assignments` records for each user
   - Send notification to each assigned user (in-app + email)
5. Show assignment confirmation with list of assigned users

#### Manage Assignments
- View all assignments with filters: course, user, status (pending, in_progress, completed, overdue)
- Extend deadline for an individual assignment
- Revoke assignment (remove before user starts; warn if in progress)
- Bulk assign: upload CSV with `email, course_id, deadline` columns

#### Deadline Reminders
- Background task (FastAPI `BackgroundTasks` or APScheduler):
  - 3 days before deadline: send reminder email + in-app notification
  - 1 day before deadline: send urgent reminder
  - At deadline: auto-mark overdue if not completed

---

### 4. Associate — Learning Experience

#### My Dashboard
- Cards for: Assigned Courses (with countdown timers), In-Progress Courses, Completed Courses
- Progress bar per course
- Upcoming deadlines highlighted in red if < 48 hours
- Quick-access to Free Courses catalog

#### Course Viewer
- Module-by-module navigation (sidebar)
- PDF viewer (embedded `<iframe>` or `react-pdf`)
- Video player (HTML5 `<video>` for uploaded, or embedded iframe for URLs)
- "Mark as Complete" button per module
- Course is considered complete when all modules are marked done
- Auto-update `assignments.status` to `completed` when course is done

#### Free Course Catalog
- Grid view of all published free courses
- Filter by category, duration, search by title
- "Enroll" button — creates `enrollments` record
- Enrolled courses appear in "My Learning" tab

---

### 5. Assessments & Tests

#### Admin — Create Assessment
- Linked to a course (one assessment per course, or multiple allowed — design for multiple)
- Fields: title, description, pass percentage (default 70%), time limit (optional), max attempts (default 3)
- Add questions:
  - Question text
  - Type: MCQ (single correct), Multi-select (multiple correct), True/False
  - Add 2–6 options per question, mark correct ones
  - Assign marks per question (default 1)
  - Reorder questions via drag-and-drop
- Preview assessment before publishing
- Edit assessment only if no attempts exist; otherwise, create a new version

#### Associate — Take Assessment
- Assessment unlocks only after completing all course modules
- Timer countdown displayed prominently if time limit is set
- Show one question at a time OR all questions scrollable — make this a configurable setting per assessment
- Allow saving answers without submitting (auto-save every 30 seconds)
- On time expiry: auto-submit whatever is answered
- On submit:
  - Calculate score: `(correct_marks / total_marks) * 100`
  - For multi-select: award marks only if ALL correct options selected and NO wrong ones
  - Determine pass/fail based on `pass_percentage`
  - Save `assessment_attempts` and `user_answers`

#### Results Page
- Show score, pass/fail status, time taken
- Review mode: show each question with user's answer vs correct answer (only after all attempts exhausted OR if admin enables review)
- If failed and attempts remain: show "Retry" button
- If max attempts reached and failed: show "Contact your admin" message
- If passed: show congratulations + download certificate button (generate simple PDF certificate with name, course, date, score)

#### Admin — Assessment Analytics
- Per assessment: average score, pass rate, attempt distribution
- Per user: all attempts, scores, pass/fail across courses
- Export results as CSV

---

### 6. Notifications System

#### In-App
- Bell icon in navbar with unread count badge
- Dropdown shows last 10 notifications (newest first)
- Mark individual as read; mark all as read
- Full notifications page with pagination and filters

#### Email Notifications (HTML templates required for all)
- Welcome email after successful signup
- OTP email (signup and password reset)
- Course assigned: includes course name, deadline, link to portal
- Deadline reminder (3 days and 1 day warnings)
- Assessment result: score, pass/fail, retry info
- Course completion congratulations

---

### 7. Admin Dashboard & Analytics

#### Overview Cards
- Total users (admin vs associate breakdown)
- Total courses (assigned vs free)
- Active assignments (pending + in_progress)
- Overdue assignments count

#### Charts (use Recharts or Chart.js in React)
- Course completion rate (bar chart by course)
- Assessment pass rate (bar chart by course)
- User progress heatmap (user × course matrix)
- Monthly enrollments/assignments trend (line chart)

#### User Management Table
- List all users: name, email, role, verification status, active status
- Search, filter by role, sort by name/date
- Actions: promote to admin, deactivate, reactivate
- Click user → view all their course assignments, progress, assessment results

---

## API Endpoints

### Auth
```
POST   /auth/signup              → create user, send OTP
POST   /auth/verify-otp          → verify OTP, activate account
POST   /auth/resend-otp          → resend OTP (rate-limited)
POST   /auth/login               → return JWT tokens
POST   /auth/refresh             → refresh access token
POST   /auth/logout              → invalidate refresh token
POST   /auth/forgot-password     → send reset OTP
POST   /auth/reset-password      → reset password with OTP
```

### Users (Admin only for most)
```
GET    /users/me                 → current user profile
PUT    /users/me                 → update own profile
GET    /users/                   → list all users (admin)
PUT    /users/{id}/role          → change role (admin)
PUT    /users/{id}/status        → activate/deactivate (admin)
```

### Courses
```
POST   /courses/                 → create course (admin)
GET    /courses/                 → list courses (filtered by type, category, etc.)
GET    /courses/{id}             → course detail
PUT    /courses/{id}             → update course (admin)
DELETE /courses/{id}             → soft delete (admin)
POST   /courses/{id}/modules     → add module (admin)
PUT    /courses/{id}/modules/{mid} → update module (admin)
DELETE /courses/{id}/modules/{mid} → delete module (admin)
POST   /courses/{id}/upload      → upload course file (admin)
```

### Assignments
```
POST   /assignments/             → create assignment(s) (admin)
GET    /assignments/             → list all (admin) or own (associate)
GET    /assignments/{id}         → detail
PUT    /assignments/{id}/deadline → extend deadline (admin)
DELETE /assignments/{id}         → revoke (admin)
POST   /assignments/bulk         → bulk assign via CSV (admin)
```

### Enrollments (Free Courses)
```
POST   /enrollments/             → enroll in free course
GET    /enrollments/             → my enrollments
PUT    /enrollments/{id}/progress → update progress
DELETE /enrollments/{id}         → unenroll
```

### Module Progress
```
POST   /progress/modules/{module_id}/complete  → mark module done
GET    /progress/courses/{course_id}           → get progress for a course
```

### Assessments
```
POST   /assessments/             → create (admin)
GET    /assessments/course/{course_id} → get assessments for a course
PUT    /assessments/{id}         → update (admin, only if no attempts)
POST   /assessments/{id}/start   → start attempt, return questions (shuffled options)
POST   /assessments/{id}/submit  → submit answers, return result
GET    /assessments/{id}/results → my results for this assessment
GET    /assessments/{id}/analytics → admin analytics
```

### Notifications
```
GET    /notifications/           → list my notifications (paginated)
PUT    /notifications/{id}/read  → mark one read
PUT    /notifications/read-all   → mark all read
```

### Analytics (Admin only)
```
GET    /analytics/overview       → dashboard cards data
GET    /analytics/courses        → per-course completion stats
GET    /analytics/users          → per-user progress summary
GET    /analytics/export/results → CSV export of all assessment results
```

---

## Security Requirements

1. **All passwords** hashed with `bcrypt` (never stored plain)
2. **JWT secret** loaded from env variable, never hardcoded
3. **Role-based guards** on every endpoint using FastAPI `Depends()`
4. **CORS** restricted to frontend origin only
5. **File upload validation**: check MIME type server-side (not just extension)
6. **SQL injection protection**: use SQLAlchemy ORM exclusively, no raw SQL
7. **Rate limiting** on: login (5/min), OTP send (3/15min), assessment submission
8. **Sensitive data**: never return `hashed_password` in any API response
9. **Tokens**: access token short-lived (15 min), refresh token rotated on use
10. **Input sanitization**: strip HTML from all text inputs before storing

---

## Frontend Architecture Details

### Auth Context
- Store `user` (id, name, email, role) and `accessToken` in React context
- `accessToken` in memory only (not localStorage)
- Auto-refresh token silently before expiry using axios interceptors
- On 401: redirect to login, clear context

### Protected Routes
```jsx
// AdminRoute: redirects associates to /dashboard
// AssociateRoute: allows both admin and associate
// PublicRoute: redirects logged-in users to dashboard
```

### Key UI Components
- `CourseCard` — shows title, category badge, type badge, progress bar, deadline
- `CountdownTimer` — live countdown to assignment deadline
- `QuestionCard` — renders MCQ/multi-select/true-false with proper UX
- `ProgressBar` — animated, shows module completion
- `NotificationDropdown` — bell icon with badge and dropdown list
- `FileUploadZone` — drag-and-drop with progress indicator
- `DataTable` — sortable, filterable, paginated table for admin views
- `Modal` — reusable confirm/form modal
- `Toast` — success/error/info notifications (react-hot-toast or similar)

### State Management
- Use React Context + `useReducer` for auth state
- Use `useState` + `useEffect` + custom hooks for data fetching
- No Redux required at this scale

---

## Environment Variables (.env)

```
# Backend
SECRET_KEY=your-super-secret-jwt-key-min-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
DATABASE_URL=sqlite:///./learning_portal.db
UPLOAD_DIR=./uploads

# SMTP (for OTP and notification emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourcompany.com
EMAIL_FROM_NAME=Learning Portal

FRONTEND_ORIGIN=http://localhost:3000

# Feature flags
MAX_FILE_SIZE_MB=500
OTP_EXPIRE_MINUTES=10
MAX_OTP_REQUESTS_PER_15MIN=3
```

---

## Error Handling Conventions

### Backend
- Return consistent error shape: `{ "detail": "Human-readable message", "code": "ERROR_CODE" }`
- HTTP status codes used correctly: 200, 201, 400, 401, 403, 404, 409, 422, 429, 500
- Unhandled exceptions caught by global FastAPI exception handler (log to file, return 500)

### Frontend
- Axios interceptor handles: 401 (refresh or logout), 403 (show "Access Denied"), 429 (show "Too many requests, try later"), 500 (show "Something went wrong")
- All forms show field-level validation errors from API response
- Loading states on every async action (disable buttons during submission)
- Empty states for all list views ("No courses yet", "No assignments found")

---

## Edge Cases to Handle

- User attempts to take assessment before completing course → block with message
- Admin deletes a course that has active assignments → warn, block deletion, suggest archiving
- Assessment timer runs out mid-question → auto-submit, show "Time's up!" message
- User loses internet mid-assessment → auto-save answers locally, resume on reconnect
- OTP used twice → return 400 "OTP already used"
- Duplicate assignment (same course + same user) → return 409 with option to update deadline
- File upload interrupted → clean up partial file, return error
- Admin tries to edit assessment with existing attempts → block, show attempt count
- Associate accesses free course they're already enrolled in → show "Continue" instead of "Enroll"
- Course with no modules published → warn admin, block publish

---

## Deliverables Checklist

- [ ] Backend with all routes, models, auth, and email working
- [ ] Frontend with all pages, routing, and API integration
- [ ] SQLite database with initial migration/seed (first user = admin)
- [ ] `.env.example` with all variables documented
- [ ] `README.md` with setup steps: `pip install`, `uvicorn`, `npm install`, `npm start`
- [ ] All API endpoints tested and returning correct status codes
- [ ] Role-based access enforced on every protected route (frontend + backend)
- [ ] Email OTP flow working end-to-end
- [ ] File upload and serving working for PDFs and videos
- [ ] Assessment creation, attempt, scoring, and results working completely
- [ ] Admin dashboard charts rendering with real data

---

## Setup Instructions to Include in README

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy aiosqlite python-jose[cryptography] passlib[bcrypt] python-multipart aiofiles emails apscheduler
cp .env.example .env  # fill in values
uvicorn main:app --reload

# Frontend
cd frontend
npm install
cp .env.example .env.local
npm start
```

---

*Build this as a complete, runnable application. Every feature described must be implemented — not mocked or left as a TODO. Prioritize correctness, security, and a clean user experience.*