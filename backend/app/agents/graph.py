from langgraph.graph import StateGraph, END
from app.agents.state import InterviewState
from app.agents.interviewer import interviewer_agent
from app.agents.evaluator import evaluator_agent
from app.agents.hint_generator import hint_generator_agent
from app.agents.summarizer import summarizer_agent
from app.agents.answer_revealer import answer_revealer_agent
from app.agents.controller import route_after_evaluation

def build_graph():
    workflow = StateGraph(InterviewState)

    workflow.add_node("interviewer", interviewer_agent)
    workflow.add_node("evaluator", evaluator_agent)
    workflow.add_node("hint_generator", hint_generator_agent)
    workflow.add_node("summarizer", summarizer_agent)
    workflow.add_node("reveal_answer", answer_revealer_agent)

    workflow.set_entry_point("evaluator")

    workflow.add_conditional_edges(
        "evaluator",
        route_after_evaluation,
        {
            "hint_generator": "hint_generator",
            "reveal_answer": "reveal_answer",
            "end_question": END
        }
    )

    workflow.add_edge("hint_generator", END)
    workflow.add_edge("reveal_answer", END)

    return workflow.compile()

graph = build_graph()