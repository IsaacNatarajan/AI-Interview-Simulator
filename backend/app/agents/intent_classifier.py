from langchain_groq import ChatGroq
from app.core.config import GROQ_API_KEY
from app.agents.state import InterviewState
from app.core.langfuse_client import langfuse_handler

llm = ChatGroq(api_key=GROQ_API_KEY, model="openai/gpt-oss-20b")

def intent_classifier_agent(state: InterviewState) -> str:
    last_feedback_context = ""
    if state.get("history"):
        last_entry = state["history"][-1]
        last_feedback_context = f"\n\nMost recent feedback/model answer given to them:\nFeedback: {last_entry.get('feedback', '')}\nModel Answer: {last_entry.get('model_answer', '')}"

    prompt = f"""You are classifying a candidate's message during a technical interview session.

Current Question: {state['current_question']}
Candidate's Message: {state['user_answer']}{last_feedback_context}

Classify into EXACTLY ONE category:

"answer" — a genuine attempt to answer the CURRENT question with technical/relevant content, even if incomplete or wrong.

"request_hint" — explicitly asking for help solving it, or saying they don't know/are stuck (e.g. "I don't know", "give me a hint", "I'm stuck").

"request_clarification" — they don't understand what the QUESTION itself is asking (e.g. "I didn't get it", "what does this question mean", "can you explain the question differently").

"request_elaboration" — asking for more detail about feedback/model answer ALREADY given to them (e.g. "can you elaborate", "explain that more", "what do you mean by that").

"skip_question" — explicitly wants to move past THIS question without answering (e.g. "skip", "next question please", "pass").

"off_topic" — anything about the SESSION itself rather than the current question (e.g. "how many questions left", "can we stop", general chit-chat).

Respond with ONLY the category name, nothing else."""

    response = llm.invoke(prompt, config={"callbacks": [langfuse_handler]})
    intent = response.content.strip().lower().replace('"', '')

    valid_intents = ["answer", "request_hint", "request_clarification", "request_elaboration", "skip_question", "off_topic"]
    if intent not in valid_intents:
        intent = "answer"

    return intent