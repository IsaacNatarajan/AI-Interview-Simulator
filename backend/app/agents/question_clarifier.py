from langchain_groq import ChatGroq
from app.core.config import GROQ_API_KEY
from app.agents.state import InterviewState
from app.core.langfuse_client import langfuse_handler

llm = ChatGroq(api_key=GROQ_API_KEY, model="openai/gpt-oss-20b")

def question_clarifier_agent(state: InterviewState) -> str:
    prompt = f"""You are personally interviewing {state['user_name']} for a {state['role']} role, and you just asked them this question, but they didn't understand it:

Question: {state['current_question']}

You are the one who asked this question — so rephrase it yourself in simpler terms, as if you're clarifying what YOU meant, not explaining someone else's question. Use phrases like "What I mean is..." or "Let me put it differently..." NEVER refer to "the interviewer" or "the interview" as a third party — YOU are the interviewer. Don't give away the answer. Break it down if it has multiple parts. Keep it clear, warm, and direct, 2-4 sentences."""

    response = llm.invoke(prompt, config={"callbacks": [langfuse_handler]})
    return response.content.strip()