from pydantic import BaseModel,Field,EmailStr,StringConstraints,field_validator
from typing import Annotated
import re

class Register_from(BaseModel):
    name : Annotated[str,Field(...,description="Enter your Name")]
    surname: Annotated[str,Field(...,description="Enter your Surname")]
    Email: Annotated[EmailStr,Field(...,description="Enter your email in proper format")]
    PhoneNumber : Annotated[str,StringConstraints(pattern=r'^\+91[6-9]\d{9}$'),Field(...,description="Enter minimum 10 numbers")]
    Password: Annotated[str,
                        StringConstraints(min_length=10),
                        Field(...,description="Enter minimum length 10 at least (2 uppercase 5 numbers and 3 special chars like:-!@#$)")]
    
    @field_validator('Password')
    @classmethod
    def validate_password(cls,s:str)->str:
        if len(re.findall(r"[A-Z]",s)) < 2:
            raise ValueError(
                "Need 2 uppercase letters"
            )

        if len(re.findall(r"\d",s)) < 5:
            raise ValueError(
                "Need 5 numbers"
            )

        if len(re.findall(r"[!@#$%^&*]",s)) < 3:
            raise ValueError(
                "Need 3 special characters"
            )

        return s
    