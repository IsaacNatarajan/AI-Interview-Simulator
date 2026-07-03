from langchain_groq import ChatGroq
from app.core.config import GROQ_API_KEY
from app.agents.state import InterviewState
from app.core.langfuse_client import langfuse_handler

llm = ChatGroq(api_key=GROQ_API_KEY, model="openai/gpt-oss-20b")

def hint_generator_agent(state: InterviewState) -> InterviewState:
    prompt = f"""{state['user_name']} is preparing for a {state['role']} role and is stuck on this question:

Question: {state['current_question']}

Speak directly to them, warmly, like a supportive mentor (e.g. "Think about..." or "Try considering..."). Give ONE short, helpful hint that guides them toward the answer WITHOUT revealing it directly."""

    response = llm.invoke(prompt, config={"callbacks": [langfuse_handler]})
    state["hint"] = response.content.strip()
    state["hints_used"] += 1
    return state