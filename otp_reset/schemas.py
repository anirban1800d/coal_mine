from pydantic import BaseModel, EmailStr, field_validator
import re


class ForgotPasswordRequest(BaseModel):
    Email: EmailStr


class VerifyOTPRequest(BaseModel):
    Email: EmailStr
    OTP: str

    @field_validator('OTP')
    @classmethod
    def validate_otp(cls, v: str) -> str:
        if not re.fullmatch(r'\d{6}', v):
            raise ValueError("OTP must be exactly 6 digits")
        return v


class ResetPasswordRequest(BaseModel):
    Email: EmailStr
    NewPassword: str

    @field_validator('NewPassword')
    @classmethod
    def validate_password(cls, s: str) -> str:
        """Reuses the exact same password rules as register_app/schemas.py"""
        if len(s) < 10:
            raise ValueError("Password must be at least 10 characters")

        if len(re.findall(r"[A-Z]", s)) < 2:
            raise ValueError("Need 2 uppercase letters")

        if len(re.findall(r"\d", s)) < 5:
            raise ValueError("Need 5 numbers")

        if len(re.findall(r"[!@#$%^&*]", s)) < 3:
            raise ValueError("Need 3 special characters")

        return s

