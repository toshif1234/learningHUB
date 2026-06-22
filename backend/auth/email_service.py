import asyncio
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from backend.config import (
    SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD,
    EMAIL_FROM, EMAIL_FROM_NAME
)

def send_smtp_email(to_email: str, subject: str, html_content: str):
    """Synchronous sender helper to be run in a thread pool"""
    # If SMTP username is not configured, fall back to console print
    print(f"test: {SMTP_USERNAME}")
    if not SMTP_USERNAME:
        print(f"\n==================================================")
        print(f"📧 [CONSOLE EMAIL FALLBACK]")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Content:\n{html_content}")
        print(f"==================================================\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{EMAIL_FROM_NAME} <{EMAIL_FROM}>"
        msg["To"] = to_email

        part = MIMEText(html_content, "html")
        msg.attach(part)

        # Setup SMTP
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            if SMTP_PORT == 587:
                server.starttls()
                server.ehlo()
            if SMTP_USERNAME and SMTP_PASSWORD:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(EMAIL_FROM, to_email, msg.as_string())
        
        print(f"SMTP Email sent successfully to {to_email} with subject: {subject}")
        return True
    except Exception as e:
        print(f"❌ Failed to send SMTP email to {to_email} due to: {str(e)}")
        # Log content to console as fallback in case of errors
        print(f"--- FALLBACK MAIL DUMP ---\nTo: {to_email}\nSubject: {subject}\n{html_content}\n-----------------------")
        return False

async def send_email(to_email: str, subject: str, html_content: str):
    """Asynchronous wrapper for email sending"""
    return await asyncio.to_thread(send_smtp_email, to_email, subject, html_content)

# HTML Templates
def get_base_template(content_html: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }}
            .header {{ border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px; text-align: center; }}
            .content {{ line-height: 1.6; font-size: 16px; }}
            .button {{ display: inline-block; padding: 12px 24px; background-color: #0060ff; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }}
            .footer {{ margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header" style="text-align: center; margin-bottom: 20px; background-color: #f1f5f9; padding: 20px; border-radius: 8px;">
                <img src="https://koerber-stellium.com/wp-content/uploads/2026/02/Untitled-design-74-e1772357803850.webp" alt="Körber Stellium Logo" style="max-height: 35px; width: auto; object-fit: contain; display: block; margin: 0 auto;" />
            </div>
            <div class="content">
                {content_html}
            </div>
            <div class="footer">
                <p>This is an automated email from the Internal Learning Portal. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    """

async def send_otp_email(to_email: str, otp_code: str, purpose: str):
    purpose_text = "verify your email" if purpose == "signup" else "reset your password"
    content = f"""
    <h2>Verification Code Required</h2>
    <p>Please use the following 6-digit One-Time Password (OTP) to {purpose_text}. This code is valid for 10 minutes:</p>
    <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; background: #f8fafc; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; color: #0060ff;">
        {otp_code}
    </div>
    <p>If you did not request this verification, please ignore this email.</p>
    """
    subject = f"Your Verification Code: {otp_code}"
    await send_email(to_email, subject, get_base_template(content))

async def send_welcome_email(to_email: str, name: str):
    content = f"""
    <h2>Welcome to the Team, {name}!</h2>
    <p>Your account on the Internal Learning Portal has been verified and activated.</p>
    <p>You can now browse the course catalog, enroll in open-access training modules, and take assessments.</p>
    <a href="http://10.18.138.234:5173/" class="button">Access Learning Portal</a>
    """
    await send_email(to_email, "Welcome to the Internal Learning Portal!", get_base_template(content))

async def send_course_assigned_email(to_email: str, name: str, course_title: str, deadline: datetime):
    formatted_deadline = deadline.strftime("%A, %B %d, %Y at %I:%M %p")
    content = f"""
    <h2>New Course Assigned</h2>
    <p>Hello {name},</p>
    <p>You have been assigned a new course: <strong>{course_title}</strong>.</p>
    <p>Please complete this course and its assessment before the deadline:</p>
    <p style="font-size: 18px; font-weight: bold; color: #475569;">⏰ {formatted_deadline}</p>
    <a href="http://10.18.138.234:5173/" class="button">Go to Course Dashboard</a>
    """
    await send_email(to_email, f"Action Required: Course Assigned - {course_title}", get_base_template(content))

async def send_deadline_reminder_email(to_email: str, name: str, course_title: str, deadline: datetime, days_left: int):
    formatted_deadline = deadline.strftime("%A, %B %d, %Y at %I:%M %p")
    urgency = "Urgent Reminder" if days_left <= 1 else "Upcoming Deadline Reminder"
    color = "#475569" if days_left <= 1 else "#64748b"
    content = f"""
    <h2>{urgency}</h2>
    <p>Hello {name},</p>
    <p>This is a reminder that the course <strong>{course_title}</strong> is due in {days_left} day{'s' if days_left > 1 else ''}.</p>
    <p>Please log in and complete the required modules and test before the deadline:</p>
    <p style="font-size: 18px; font-weight: bold; color: {color};">⏰ Deadline: {formatted_deadline}</p>
    <a href="http://10.18.138.234:5173/" class="button">Resume Learning</a>
    """
    await send_email(to_email, f"{urgency}: {course_title}", get_base_template(content))

async def send_assessment_result_email(to_email: str, name: str, course_title: str, score: float, is_passed: bool, retries_left: int):
    status_text = "PASSED 🎉" if is_passed else "FAILED ❌"
    color = "#0060ff" if is_passed else "#475569"
    retry_message = ""
    if not is_passed:
        if retries_left > 0:
            retry_message = f"<p>Don't worry! You have <strong>{retries_left} attempt(s) remaining</strong>. You can review the material and try again.</p>"
        else:
            retry_message = "<p>You have exhausted all attempts. Please contact your administrator for assistance.</p>"
    else:
        retry_message = "<p>Congratulations! You can now download your completion certificate from the dashboard.</p>"

    content = f"""
    <h2>Assessment Result</h2>
    <p>Hello {name},</p>
    <p>You have completed the assessment for <strong>{course_title}</strong>.</p>
    <div style="font-size: 20px; font-weight: bold; padding: 15px; background: #f8fafc; text-align: center; border-radius: 8px; margin: 20px 0;">
        Result: <span style="color: {color}; font-size: 24px;">{status_text}</span><br>
        Score: <span style="font-size: 24px;">{score:.1f}%</span>
    </div>
    {retry_message}
    <a href="http://10.18.138.234:5173/" class="button">View Dashboard</a>
    """
    await send_email(to_email, f"Assessment Result - {course_title}", get_base_template(content))

async def send_course_completed_email(to_email: str, name: str, course_title: str):
    content = f"""
    <h2>Congratulations on completing the course!</h2>
    <p>Hello {name},</p>
    <p>You have successfully completed all modules and passed the assessment for <strong>{course_title}</strong>.</p>
    <p>Thank you for completing this requirement. Keep up the great work!</p>
    <a href="http://10.18.138.234:5173/" class="button">View My Certificate</a>
    """
    await send_email(to_email, f"Course Completed! Congratulations - {course_title}", get_base_template(content))
