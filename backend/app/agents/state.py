from typing import TypedDict, List, Optional

class InterviewState(TypedDict):
    session_id: str
    user_id: str
    user_name: str
    role: str
    experience_level: str
    job_description: Optional[str]
    topic: str
    difficulty: str
    total_questions: int
    current_question: str
    user_answer: Optional[str]
    score: Optional[float]
    feedback: Optional[str]
    hint: Optional[str]
    model_answer: Optional[str]
    hints_used: int
    max_hints: int
    question_count: int
    history: List[dict]
    next_action: Optional[str]