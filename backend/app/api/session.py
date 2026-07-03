from fastapi import APIRouter
from pydantic import BaseModel
from app.db.database import get_db
from app.agents.interviewer import interviewer_agent
from datetime import datetime
from app.agents.graph import graph
from bson import ObjectId
from typing import Optional
from app.agents.summarizer import summarizer_agent
from sse_starlette.sse import EventSourceResponse
from app.agents.evaluator import evaluator_agent_stream
import json
import uuid

router = APIRouter()

class StartSessionRequest(BaseModel):
    user_id: str
    role: str
    experience_level: str
    job_description: Optional[str] = None
    topic: Optional[str] = None
    difficulty: str
    total_questions: int
    max_hints: int = 2

@router.post("/session/start")
async def start_session(req: StartSessionRequest):
    session_id = str(uuid.uuid4())

    db = get_db()
    user_doc = db["users"].find_one({"_id": ObjectId(req.user_id)})
    user_name = user_doc["name"] if user_doc else "there"

    state = {
        "session_id": session_id,
        "user_id": req.user_id,
        "user_name": user_name,
        "role": req.role,
        "experience_level": req.experience_level,
        "job_description": req.job_description,
        "topic": req.topic,
        "difficulty": req.difficulty,
        "total_questions": req.total_questions,
        "current_question": "",
        "user_answer": None,
        "score": None,
        "feedback": None,
        "hint": None,
        "hints_used": 0,
        "max_hints": req.max_hints,
        "question_count": 0,
        "history": [],
        "next_action": None
    }

    state = interviewer_agent(state)

    db["sessions"].insert_one({
        "session_id": session_id,
        "user_id": req.user_id,
        "user_name": user_name,
        "role": req.role,
        "experience_level": req.experience_level,
        "job_description": req.job_description,
        "topic": req.topic,
        "difficulty": req.difficulty,
        "total_questions": req.total_questions,
        "max_hints": req.max_hints,
        "current_question": state["current_question"],
        "hints_used": 0,
        "status": "in_progress",
        "started_at": datetime.utcnow(),
        "history": []
    })

    return state

class SubmitAnswerRequest(BaseModel):
    session_id: str
    user_answer: str

@router.post("/session/answer")
async def submit_answer(req: SubmitAnswerRequest):
    db = get_db()
    session_doc = db["sessions"].find_one({"session_id": req.session_id})

    state = {
        "session_id": session_doc["session_id"],
        "user_id": session_doc["user_id"],
        "user_name": session_doc.get("user_name", "there"),
        "role": session_doc["role"],
        "experience_level": session_doc["experience_level"],
        "job_description": session_doc.get("job_description"),
        "topic": session_doc["topic"],
        "difficulty": session_doc["difficulty"],
        "total_questions": session_doc["total_questions"],
        "current_question": session_doc.get("current_question", ""),
        "user_answer": req.user_answer,
        "score": None,
        "feedback": None,
        "hint": None,
        "hints_used": session_doc.get("hints_used", 0),
        "max_hints": session_doc["max_hints"],
        "question_count": len(session_doc["history"]),
        "history": session_doc["history"],
        "next_action": None
    }

    from app.agents.intent_classifier import intent_classifier_agent
    intent = intent_classifier_agent(state)

    if intent == "off_topic":
        from app.agents.off_topic_handler import off_topic_handler_agent
        message = off_topic_handler_agent(state)
        return {"intent": "off_topic", "message": message}
    
    if intent == "request_clarification":
        from app.agents.question_clarifier import question_clarifier_agent
        message = question_clarifier_agent(state)
        return {"intent": "request_clarification", "message": message}

    if intent == "request_elaboration":
        from app.agents.answer_elaborator import answer_elaborator_agent
        message = answer_elaborator_agent(state)
        return {"intent": "request_elaboration", "message": message}
    
    if intent == "request_hint":
        from app.agents.hint_generator import hint_generator_agent
        state = hint_generator_agent(state)
        db["sessions"].update_one(
            {"session_id": req.session_id},
            {"$set": {"hints_used": state["hints_used"]}}
        )
        return {"intent": "request_hint", "hint": state["hint"], "hints_used": state["hints_used"]}

    if intent == "skip_question":
        state["history"].append({
            "question": state["current_question"],
            "answer": "(skipped)",
            "score": 0,
            "feedback": "Question skipped by candidate."
        })
        db["sessions"].update_one(
            {"session_id": req.session_id},
            {"$set": {"history": state["history"], "hints_used": 0}}
        )
        return {"intent": "skip_question", "history": state["history"]}

    # intent == "answer" - proceed with normal evaluation flow
    result = graph.invoke(state)

    db["sessions"].update_one(
        {"session_id": req.session_id},
        {"$set": {"history": result["history"], "hints_used": result["hints_used"]}}
    )

    result["intent"] = "answer"
    return result

class NextQuestionRequest(BaseModel):
    session_id: str
    extend: bool = False

@router.post("/session/next-question")
async def next_question(req: NextQuestionRequest):
    db = get_db()
    session_doc = db["sessions"].find_one({"session_id": req.session_id})

    if req.extend:
        new_total = session_doc["total_questions"] + 1
        db["sessions"].update_one({"session_id": req.session_id}, {"$set": {"total_questions": new_total}})
        session_doc["total_questions"] = new_total
    elif len(session_doc["history"]) >= session_doc["total_questions"]:
        return {"message": "All questions completed", "session_complete": True}

    state = {
        "session_id": session_doc["session_id"],
        "user_id": session_doc["user_id"],
        "user_name": session_doc.get("user_name", "there"),
        "role": session_doc["role"],
        "experience_level": session_doc["experience_level"],
        "job_description": session_doc.get("job_description"),
        "topic": session_doc["topic"],
        "difficulty": session_doc["difficulty"],
        "total_questions": session_doc["total_questions"],
        "current_question": "",
        "user_answer": None,
        "score": None,
        "feedback": None,
        "hint": None,
        "hints_used": 0,
        "max_hints": session_doc["max_hints"],
        "question_count": len(session_doc["history"]),
        "history": session_doc["history"],
        "next_action": None
    }

    state = interviewer_agent(state)

    db["sessions"].update_one(
        {"session_id": req.session_id},
        {"$set": {"current_question": state["current_question"], "hints_used": 0}}
    )

    return {"current_question": state["current_question"], "question_count": state["question_count"], "session_complete": False}

class EndSessionRequest(BaseModel):
    session_id: str

@router.post("/session/end")
async def end_session(req: EndSessionRequest):
    db = get_db()
    session_doc = db["sessions"].find_one({"session_id": req.session_id})

    state = {
        "session_id": session_doc["session_id"],
        "user_id": session_doc["user_id"],
        "user_name": session_doc.get("user_name", "there"),
        "role": session_doc["role"],
        "experience_level": session_doc["experience_level"],
        "job_description": session_doc.get("job_description"),
        "topic": session_doc["topic"],
        "difficulty": session_doc["difficulty"],
        "total_questions": session_doc["total_questions"],
        "current_question": "",
        "user_answer": None,
        "score": None,
        "feedback": None,
        "hint": None,
        "hints_used": 0,
        "max_hints": session_doc["max_hints"],
        "question_count": len(session_doc["history"]),
        "history": session_doc["history"],
        "next_action": None
    }

    result = summarizer_agent(state)

    scores = [h["score"] for h in session_doc["history"] if h.get("score") is not None]
    final_score = sum(scores) / len(scores) if scores else 0

    db["sessions"].update_one(
        {"session_id": req.session_id},
        {"$set": {
            "status": "completed",
            "ended_at": datetime.utcnow(),
            "summary": result["feedback"],
            "final_score": final_score
        }}
    )

    return {"summary": result["feedback"], "final_score": final_score}

@router.get("/session/{session_id}/history")
async def get_session_history(session_id: str):
    db = get_db()
    session_doc = db["sessions"].find_one({"session_id": session_id}, {"_id": 0})
    return session_doc

@router.get("/user/{user_id}/performance")
async def get_user_performance(user_id: str):
    db = get_db()
    sessions = list(db["sessions"].find({"user_id": user_id, "status": "completed"}, {"_id": 0}))

    if not sessions:
        return {"message": "No completed sessions found", "sessions_count": 0}

    total_sessions = len(sessions)
    avg_score = sum(s.get("final_score", 0) for s in sessions) / total_sessions

    topic_stats = {}
    for s in sessions:
        topic = s["topic"]
        if topic not in topic_stats:
            topic_stats[topic] = {"scores": [], "count": 0}
        topic_stats[topic]["scores"].append(s.get("final_score", 0))
        topic_stats[topic]["count"] += 1

    topic_summary = {
        topic: {
            "average_score": sum(data["scores"]) / len(data["scores"]),
            "sessions_count": data["count"]
        }
        for topic, data in topic_stats.items()
    }

    return {
        "sessions_count": total_sessions,
        "overall_average_score": round(avg_score, 2),
        "topic_breakdown": topic_summary
    }

@router.get("/user/{user_id}/sessions")
async def get_user_sessions(user_id: str):
    db = get_db()
    sessions = list(db["sessions"].find(
        {"user_id": user_id},
        {"_id": 0, "session_id": 1, "role": 1, "topic": 1, "status": 1, "started_at": 1, "final_score": 1}
    ).sort("started_at", -1))

    return {"sessions": sessions}

# NOTE: This SSE streaming endpoint predates the intent-classifier/model-answer upgrades
# and is not currently wired into the frontend. Needs updating to match the current
# agentic flow before re-enabling. Kept here as working proof-of-concept for SSE streaming.
@router.post("/session/answer/stream")
async def submit_answer_stream(req: SubmitAnswerRequest):
    db = get_db()
    session_doc = db["sessions"].find_one({"session_id": req.session_id})

    state = {
        "session_id": session_doc["session_id"],
        "user_id": session_doc["user_id"],
        "role": session_doc["role"],
        "experience_level": session_doc["experience_level"],
        "job_description": session_doc.get("job_description"),
        "topic": session_doc["topic"],
        "difficulty": session_doc["difficulty"],
        "total_questions": session_doc["total_questions"],
        "current_question": session_doc.get("current_question", ""),
        "user_answer": req.user_answer,
        "score": None,
        "feedback": None,
        "hint": None,
        "hints_used": session_doc.get("hints_used", 0),
        "max_hints": session_doc["max_hints"],
        "question_count": len(session_doc["history"]),
        "history": session_doc["history"],
        "next_action": None
    }

    async def event_generator():
        async for chunk in evaluator_agent_stream(state):
            yield {"event": "chunk", "data": chunk}

        # After evaluation completes, run controller logic
        from app.agents.controller import route_after_evaluation
        next_step = route_after_evaluation(state)
        
        if next_step == "hint_generator":
            from app.agents.hint_generator import hint_generator_agent
            updated_state = hint_generator_agent(state)
            state["hint"] = updated_state["hint"]
            state["hints_used"] = updated_state["hints_used"]
        elif next_step == "reveal_answer":
            from app.agents.answer_revealer import answer_revealer_agent
            updated_state = answer_revealer_agent(state)
            state["feedback"] = updated_state["feedback"]

        db["sessions"].update_one(
            {"session_id": req.session_id},
            {"$set": {"history": state["history"], "hints_used": state["hints_used"]}}
        )

        yield {"event": "done", "data": json.dumps({
            "score": state["score"],
            "hint": state.get("hint"),
            "hints_used": state["hints_used"]
        })}

    return EventSourceResponse(event_generator())

class HintRequest(BaseModel):
    session_id: str

@router.post("/session/hint")
async def get_hint(req: HintRequest):
    db = get_db()
    session_doc = db["sessions"].find_one({"session_id": req.session_id})

    if session_doc.get("hints_used", 0) >= session_doc["max_hints"]:
        return {"message": "No hints remaining", "hint": None}

    state = {
        "session_id": session_doc["session_id"],
        "user_id": session_doc["user_id"],
        "role": session_doc["role"],
        "experience_level": session_doc["experience_level"],
        "job_description": session_doc.get("job_description"),
        "topic": session_doc["topic"],
        "difficulty": session_doc["difficulty"],
        "total_questions": session_doc["total_questions"],
        "current_question": session_doc.get("current_question", ""),
        "user_answer": None,
        "score": None,
        "feedback": None,
        "hint": None,
        "hints_used": session_doc.get("hints_used", 0),
        "max_hints": session_doc["max_hints"],
        "question_count": len(session_doc["history"]),
        "history": session_doc["history"],
        "next_action": None
    }

    from app.agents.hint_generator import hint_generator_agent
    state = hint_generator_agent(state)

    db["sessions"].update_one(
        {"session_id": req.session_id},
        {"$set": {"hints_used": state["hints_used"]}}
    )

    return {"hint": state["hint"], "hints_used": state["hints_used"], "max_hints": session_doc["max_hints"]}

@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    db = get_db()
    result = db["sessions"].delete_one({"session_id": session_id})
    if result.deleted_count == 0:
        return {"message": "Session not found"}
    return {"message": "Session deleted successfully"}