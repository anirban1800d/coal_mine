import secrets
import time
import json

from argon2 import PasswordHasher
from fastapi import HTTPException
from starlette.requests import Request

from register_app.models import load_users
from otp_reset.store import otp_store
from otp_reset.email_service import send_otp_email

# Reuse the same Argon2 hasher used by existing register/login code
ph = PasswordHasher()

USERS_FILE = "users.json"

# Constants
OTP_EXPIRY_SECONDS = 300       # 5 minutes
RESEND_COOLDOWN_SECONDS = 60   # 60 seconds
MAX_OTP_ATTEMPTS = 5           # 5 failed attempts
RESET_AUTH_EXPIRY_SECONDS = 600  # 10 minutes


def _normalize_email(email: str) -> str:
    """Normalize email the same way the existing system does — strip + lowercase."""
    return email.strip().lower()


def _find_user_by_email(email: str):
    """Find a user by email in users.json, matching the existing lookup pattern."""
    users = load_users()
    for u in users:
        if u["Email"].lower() == email.lower():
            return u
    return None


def handle_forgot_password(email: str, request: Request):
    """Generate OTP, hash it, store it, and send it via email.

    Always returns the same generic message regardless of whether the account exists.
    This prevents email enumeration.
    """
    normalized = _normalize_email(email)
    generic_response = {"message": "If an account exists for this email, an OTP has been sent."}

    # Check resend cooldown (even for non-existent accounts, to prevent timing attacks)
    existing_entry = otp_store.get(normalized)
    if existing_entry:
        elapsed = time.time() - existing_entry.get("last_sent_at", 0)
        if elapsed < RESEND_COOLDOWN_SECONDS:
            remaining = int(RESEND_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {remaining} seconds before requesting a new OTP."
            )

    # Look up the user
    user = _find_user_by_email(email)
    if not user:
        # Do not reveal that the account doesn't exist
        return generic_response

    # Google-only accounts (no local password) — still return generic response
    # to avoid revealing provider information
    # The OTP will be sent but if they try to reset, it will work and set a local password

    # Generate cryptographically secure 6-digit OTP
    otp = str(secrets.randbelow(900000) + 100000)

    # Hash the OTP — never store plaintext
    otp_hash = ph.hash(otp)

    # Store OTP state (separate from users.json)
    now = time.time()
    otp_store[normalized] = {
        "otp_hash": otp_hash,
        "created_at": now,
        "expires_at": now + OTP_EXPIRY_SECONDS,
        "attempts": 0,
        "last_sent_at": now,
        "verified": False,
    }

    # Send the OTP via email
    try:
        send_otp_email(user["Email"], otp)
    except Exception:
        # If email sending fails, clean up the OTP entry
        otp_store.pop(normalized, None)
        raise HTTPException(
            status_code=500,
            detail="Failed to send OTP email. Please try again later."
        )

    return generic_response


def handle_verify_otp(email: str, otp: str, request: Request):
    """Verify the OTP against the stored hash.

    Enforces expiration and attempt limits.
    On success, creates a short-lived reset authorization in the session.
    """
    normalized = _normalize_email(email)

    entry = otp_store.get(normalized)
    if not entry:
        raise HTTPException(status_code=400, detail="No OTP request found. Please request a new OTP.")

    # Check if already verified (OTP already used)
    if entry["verified"]:
        raise HTTPException(status_code=400, detail="OTP already used. Please request a new OTP.")

    # Check expiration
    if time.time() > entry["expires_at"]:
        otp_store.pop(normalized, None)
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new OTP.")

    # Check attempt limit
    if entry["attempts"] >= MAX_OTP_ATTEMPTS:
        otp_store.pop(normalized, None)
        raise HTTPException(
            status_code=400,
            detail="Maximum OTP attempts exceeded. Please request a new OTP."
        )

    # Verify OTP hash
    try:
        ph.verify(entry["otp_hash"], otp)
    except Exception:
        # Increment attempt counter
        entry["attempts"] += 1
        remaining = MAX_OTP_ATTEMPTS - entry["attempts"]

        if remaining <= 0:
            otp_store.pop(normalized, None)
            raise HTTPException(
                status_code=400,
                detail="Maximum OTP attempts exceeded. Please request a new OTP."
            )

        raise HTTPException(
            status_code=400,
            detail=f"Invalid OTP. {remaining} attempt(s) remaining."
        )

    # OTP is valid — mark as verified
    entry["verified"] = True

    # Create short-lived reset authorization in session
    request.session["password_reset_email"] = normalized
    request.session["password_reset_authorized"] = True
    request.session["password_reset_expires"] = time.time() + RESET_AUTH_EXPIRY_SECONDS

    return {"message": "OTP verified successfully."}


def handle_reset_password(email: str, new_password: str, request: Request):
    """Reset the user's password after verifying session-based reset authorization.

    Reuses the existing Argon2 password hashing.
    Updates users.json with the new password hash.
    Clears OTP and reset session state.
    """
    normalized = _normalize_email(email)

    # Verify server-side reset authorization
    session_email = request.session.get("password_reset_email")
    authorized = request.session.get("password_reset_authorized", False)
    expires = request.session.get("password_reset_expires", 0)

    if not authorized or session_email != normalized:
        raise HTTPException(
            status_code=403,
            detail="Password reset not authorized. Please verify your OTP first."
        )

    if time.time() > expires:
        # Clear expired authorization
        request.session.pop("password_reset_email", None)
        request.session.pop("password_reset_authorized", None)
        request.session.pop("password_reset_expires", None)
        raise HTTPException(
            status_code=403,
            detail="Reset authorization has expired. Please start over."
        )

    # Find the user
    users = load_users()
    target_user = None
    for u in users:
        if u["Email"].lower() == normalized:
            target_user = u
            break

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Hash the new password using the existing Argon2 hasher
    target_user["Password"] = ph.hash(new_password)

    # Save updated users to users.json
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=4)

    # Invalidate OTP entry
    otp_store.pop(normalized, None)

    # Clear reset authorization from session
    request.session.pop("password_reset_email", None)
    request.session.pop("password_reset_authorized", None)
    request.session.pop("password_reset_expires", None)

    return {"message": "Password reset successful."}

