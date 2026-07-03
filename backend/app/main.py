from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.db.database import get_db
from langchain_groq import ChatGroq
from app.core.config import GROQ_API_KEY
from app.api.auth import router as auth_router
from app.agents.graph import graph
from app.api.session import router as session_router
import os

load_dotenv()

app = FastAPI(title="AI Interview Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(session_router)

@app.get("/")
async def root():
    return {"message": "AI Interview Assistant API is running"}