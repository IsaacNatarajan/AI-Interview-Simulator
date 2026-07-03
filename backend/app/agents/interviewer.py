from langchain_groq import ChatGroq
from app.core.config import GROQ_API_KEY
from app.agents.state import InterviewState
from app.core.langfuse_client import langfuse_handler

llm = ChatGroq(api_key=GROQ_API_KEY, model="openai/gpt-oss-20b")

def interviewer_agent(state: InterviewState) -> InterviewState:
    jd_context = ""
    if state.get("job_description"):
        jd_context = f"\nJob Description context: {state['job_description']}"

    previous_questions = ""
    if state.get("history"):
        questions_list = "\n".join([f"- {h['question']}" for h in state["history"]])
        previous_questions = f"\n\nPreviously asked questions (do NOT repeat these or ask something very similar):\n{questions_list}"

    topic_context = f", focused on the topic: {state['topic']}" if state.get('topic') else ", covering general role-relevant topics"

    prompt = f"""You are a friendly interview trainer conducting a practice interview for {state['user_name']}, who is preparing for a {state['role']} role ({state['experience_level']} level){topic_context}.{jd_context}
Difficulty level: {state['difficulty']}
Questions asked so far: {state['question_count']}{previous_questions}

Generate ONE clear, relevant interview question appropriate for this role, experience level, and topic. Ensure it is meaningfully different from any previously asked questions. Only return the question itself, nothing else — no greeting, just the question."""

    response = llm.invoke(prompt, config={"callbacks": [langfuse_handler]})
    state["current_question"] = response.content.strip()
    state["question_count"] += 1
    return state