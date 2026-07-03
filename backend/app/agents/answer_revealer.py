from langchain_groq import ChatGroq
from app.core.config import GROQ_API_KEY
from app.agents.state import InterviewState
from app.core.langfuse_client import langfuse_handler

llm = ChatGroq(api_key=GROQ_API_KEY, model="openai/gpt-oss-20b")

def answer_revealer_agent(state: InterviewState) -> InterviewState:
    prompt = f"""{state['user_name']} has used all their hints and is still working through this question for a {state['role']} role:

Question: {state['current_question']}

Speak directly to them, warmly and encouragingly (no judgment). Provide the correct answer with a brief, clear explanation to help them learn. Start with something supportive like "No worries, let's walk through this together" before explaining."""

    response = llm.invoke(prompt, config={"callbacks": [langfuse_handler]})
    state["feedback"] = response.content.strip() + "\n\n(Correct answer revealed)"
    return state