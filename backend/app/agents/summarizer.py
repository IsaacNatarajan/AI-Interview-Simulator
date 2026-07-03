from langchain_groq import ChatGroq
from app.core.config import GROQ_API_KEY
from app.agents.state import InterviewState
from app.core.langfuse_client import langfuse_handler
import json

llm = ChatGroq(api_key=GROQ_API_KEY, model="openai/gpt-oss-120b")

def summarizer_agent(state: InterviewState) -> InterviewState:
    history_text = json.dumps(state["history"], indent=2)

    topic_context = f", topic: {state['topic']}" if state.get('topic') else ""

    prompt = f"""Here is {state['user_name']}'s full interview preparation session for a {state['role']} role{topic_context}:

{history_text}

Write a warm, encouraging performance summary speaking DIRECTLY to {state['user_name']} (use "you" not "the candidate"), covering:
1. Overall performance
2. Strengths
3. Weak areas to improve
4. Suggested topics to study next

Sound like a supportive mentor who's proud of their effort, not a formal report."""

    response = llm.invoke(prompt, config={"callbacks": [langfuse_handler]})
    state["feedback"] = response.content.strip()
    return state