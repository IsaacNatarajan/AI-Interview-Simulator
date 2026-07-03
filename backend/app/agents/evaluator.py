from langchain_groq import ChatGroq
from app.core.config import GROQ_API_KEY
from app.agents.state import InterviewState
from app.core.langfuse_client import langfuse_handler

llm = ChatGroq(api_key=GROQ_API_KEY, model="openai/gpt-oss-120b")

def evaluator_agent(state: InterviewState) -> InterviewState:
    topic_context = f", focused on {state['topic']}" if state.get('topic') else ""

    prompt = f"""You are a warm, encouraging interview trainer having a real coaching conversation with {state['user_name']}, who is preparing for a {state['role']} role{topic_context}.

Question: {state['current_question']}
Their Answer: {state['user_answer']}

React to their SPECIFIC answer directly, like a real mentor would in conversation — reference what they actually said, not generic praise/criticism. Speak in first/second person ("you", "I"), never third person like "the candidate".

Then, unless their answer is a near-perfect 9-10, briefly show them a strong, interview-ready way to phrase that same answer — natural spoken language, not robotic, 2-4 sentences, as if you were answering it yourself in the interview.

Respond ONLY in this exact format:
Score: <number between 0-10>
Feedback: <your direct, conversational reaction to their specific answer, 2-3 sentences>
ModelAnswer: <a strong interview-ready spoken answer, 2-4 sentences. Write "SKIP" here only if score is 9 or 10>"""

    response = llm.invoke(prompt, config={"callbacks": [langfuse_handler]})
    content = response.content.strip()

    lines = content.split("\n")
    score_line = next((l for l in lines if l.startswith("Score:")), "Score: 0")
    feedback_line = next((l for l in lines if l.startswith("Feedback:")), "Feedback: N/A")
    model_answer_line = next((l for l in lines if l.startswith("ModelAnswer:")), "ModelAnswer: SKIP")

    state["score"] = float(score_line.replace("Score:", "").strip())
    state["feedback"] = feedback_line.replace("Feedback:", "").strip()
    model_answer = model_answer_line.replace("ModelAnswer:", "").strip()
    if state["score"] < 9 and model_answer.upper() == "SKIP":
        # LLM incorrectly skipped despite low score - this shouldn't happen but guard anyway
        state["model_answer"] = None
    elif model_answer.upper() == "SKIP":
        state["model_answer"] = None
    else:
        state["model_answer"] = model_answer

    state["history"].append({
        "question": state["current_question"],
        "answer": state["user_answer"],
        "score": state["score"],
        "feedback": state["feedback"],
        "model_answer": state["model_answer"]
    })

    return state

async def evaluator_agent_stream(state: InterviewState):
    topic_context = f", focused on {state['topic']}" if state.get('topic') else ""

    prompt = f"""You are a warm, encouraging interview trainer having a real coaching conversation with {state['user_name']}, who is preparing for a {state['role']} role{topic_context}.

Question: {state['current_question']}
Their Answer: {state['user_answer']}

React to their SPECIFIC answer directly, like a real mentor would in conversation — reference what they actually said, not generic praise/criticism. Speak in first/second person ("you", "I"), never third person like "the candidate".

Then, unless their answer is a near-perfect 9-10, briefly show them a strong, interview-ready way to phrase that same answer — natural spoken language, not robotic, 2-4 sentences, as if you were answering it yourself in the interview.

Respond ONLY in this exact format:
Score: <number between 0-10>
Feedback: <your direct, conversational reaction to their specific answer, 2-3 sentences>
ModelAnswer: <a strong interview-ready spoken answer, 2-4 sentences. Write "SKIP" here only if score is 9 or 10>"""

    full_content = ""
    async for chunk in llm.astream(prompt, config={"callbacks": [langfuse_handler]}):
        full_content += chunk.content
        yield chunk.content

    lines = full_content.strip().split("\n")
    score_line = next((l for l in lines if l.startswith("Score:")), "Score: 0")
    feedback_line = next((l for l in lines if l.startswith("Feedback:")), "Feedback: N/A")
    model_answer_line = next((l for l in lines if l.startswith("ModelAnswer:")), "ModelAnswer: SKIP")

    state["score"] = float(score_line.replace("Score:", "").strip())
    state["feedback"] = feedback_line.replace("Feedback:", "").strip()
    model_answer = model_answer_line.replace("ModelAnswer:", "").strip()
    state["model_answer"] = None if model_answer.upper() == "SKIP" else model_answer

    state["history"].append({
        "question": state["current_question"],
        "answer": state["user_answer"],
        "score": state["score"],
        "feedback": state["feedback"],
        "model_answer": state["model_answer"]
    })