from fastapi import APIRouter, HTTPException
from google.oauth2 import id_token
from google.auth.transport import requests
from app.db.database import get_db
from datetime import datetime
from app.core.security import create_access_token
import os

router = APIRouter()

@router.post("/auth/google")
async def google_auth(token: str):
    try:
        idinfo = id_token.verify_oauth2_token(
            token, requests.Request(), os.getenv("GOOGLE_CLIENT_ID")
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_db()
    users = db["users"]

    user = users.find_one({"google_id": idinfo["sub"]})

    if not user:
        new_user = {
            "google_id": idinfo["sub"],
            "email": idinfo["email"],
            "name": idinfo["name"],
            "picture": idinfo.get("picture"),
            "created_at": datetime.utcnow(),
            "last_login": datetime.utcnow(),
        }
        result = users.insert_one(new_user)
        user_id = result.inserted_id
    else:
        users.update_one({"_id": user["_id"]}, {"$set": {"last_login": datetime.utcnow()}})
        user_id = user["_id"]

    access_token = create_access_token(data={"user_id": str(user_id)})

    return {"access_token": access_token, "user": {"email": idinfo["email"], "name": idinfo["name"]}}