from app.agents.state import InterviewState

def route_after_evaluation(state: InterviewState) -> str:
    if state["score"] < 5:
        if state["hints_used"] < state["max_hints"]:
            return "hint_generator"
        else:
            return "reveal_answer"
    return "end_question"