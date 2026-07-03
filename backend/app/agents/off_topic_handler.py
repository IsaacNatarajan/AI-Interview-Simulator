from langchain_groq import ChatGroq
from app.core.config import GROQ_API_KEY
from app.agents.state import InterviewState
from app.core.langfuse_client import langfuse_handler

llm = ChatGroq(api_key=GROQ_API_KEY, model="openai/gpt-oss-20b")

def off_topic_handler_agent(state: InterviewState) -> str:
    prompt = f"""You are a friendly interview trainer helping {state['user_name']} practice for a {state['role']} role, topic: {state['topic']}.

They just said something unrelated to answering the current question: "{state['user_answer']}"

Current Question they should be answering: {state['current_question']}

Respond briefly and warmly, speaking directly to them, acknowledge what they said if relevant, then gently guide them back to answering the current question. Keep it short (1-2 sentences)."""

    response = llm.invoke(prompt, config={"callbacks": [langfuse_handler]})
    return response.content.strip()