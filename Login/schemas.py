from pydantic import BaseModel,EmailStr

class Login_Form(BaseModel):
    Email : EmailStr
    Password : str