from register_app.models import load_users
from Login.schemas import Login_Form
from fastapi import HTTPException
from argon2 import PasswordHasher

ph = PasswordHasher()

def validate_login(user:Login_Form):
    users = load_users()
    found_user = None
    for u in users:
        if u["Email"] == user.Email:
            found_user = u
            break
    if found_user is None:
        raise HTTPException(status_code=404,detail="User not found")

    try:
        ph.verify(found_user["Password"], user.Password)
    except:
        raise HTTPException(status_code=401,detail="Incorrect Password")

    return {
            "message":"Login successful",
            "user_id":found_user["id"],
            "email":found_user["Email"]
    }