from langchain_groq import ChatGroq
from app.core.config import GROQ_API_KEY
from app.agents.state import InterviewState
from app.core.langfuse_client import langfuse_handler

llm = ChatGroq(api_key=GROQ_API_KEY, model="openai/gpt-oss-20b")

def answer_elaborator_agent(state: InterviewState) -> str:
    last_entry = state["history"][-1] if state.get("history") else {}

    prompt = f"""{state['user_name']} wants more detail about the feedback/model answer you gave them for this interview question ({state['role']} role):

Question: {last_entry.get('question', state['current_question'])}
Their Answer: {last_entry.get('answer', '')}
Your Previous Feedback: {last_entry.get('feedback', '')}
Model Answer Given: {last_entry.get('model_answer', 'N/A')}

Speak directly and warmly to them. Elaborate further — explain the reasoning more deeply, add examples if helpful, or clarify anything that might be confusing. Keep it focused and genuinely helpful, 3-5 sentences."""

    response = llm.invoke(prompt, config={"callbacks": [langfuse_handler]})
    return response.content.strip()