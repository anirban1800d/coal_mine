import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def send_otp_email(to_email: str, otp: str):
    """Send a password reset OTP email via SMTP.

    Uses environment variables for SMTP configuration.
    Never logs or returns the OTP — it is only placed in the email body.
    """
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM_EMAIL", smtp_username)

    if not smtp_host or not smtp_username or not smtp_password:
        raise RuntimeError("SMTP is not configured. Set SMTP_HOST, SMTP_USERNAME, and SMTP_PASSWORD in .env")

    subject = "Password Reset OTP"

    html_body = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0f172a; color: #e2e8f0; border-radius: 16px;">
        <h2 style="color: #22d3ee; margin-top: 0;">Nexus Auth</h2>
        <p>You requested a password reset. Use the following OTP to verify your identity:</p>
        <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #22d3ee; background: rgba(34,211,238,0.1); padding: 12px 24px; border-radius: 12px; border: 1px solid rgba(34,211,238,0.3);">
                {otp}
            </span>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">This OTP expires in <strong>5 minutes</strong>.</p>
        <hr style="border: none; border-top: 1px solid rgba(100,220,255,0.15); margin: 20px 0;">
        <p style="color: #ef4444; font-size: 13px;">⚠️ <strong>Do not share this OTP with anyone.</strong> Nexus Auth will never ask you for this code via phone or chat.</p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = smtp_from
    msg["To"] = to_email

    # Plain text fallback
    text_body = (
        f"Nexus Auth - Password Reset OTP\n\n"
        f"Your OTP is: {otp}\n\n"
        f"This OTP expires in 5 minutes.\n\n"
        f"WARNING: Do not share this OTP with anyone."
    )

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.sendmail(smtp_from, to_email, msg.as_string())

