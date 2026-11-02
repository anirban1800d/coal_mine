from register_app.schemas import Register_from
from fastapi.responses import JSONResponse
from register_app.models import load_users,save_user
from argon2 import PasswordHasher

ph = PasswordHasher()

def valid_registration(user: Register_from):
    users = load_users()

    # duplicate email check
    for u in users:
        if u["Email"] == user.Email:
            return JSONResponse(status_code=403,content={'message':"Email already exists"})
        if u["PhoneNumber"] == user.PhoneNumber:
            return JSONResponse(status_code=403,content={'message':"Phnumber already exists"})

    # convert pydantic model -> dictionary
    user_data = user.model_dump()

    # hash the password
    user_data["Password"] = ph.hash(user_data["Password"])

    save_user(user_data)

    return JSONResponse(status_code=200,content={'message':"User registered","data":user_data})