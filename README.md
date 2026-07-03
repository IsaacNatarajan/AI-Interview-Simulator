# 🎯 AI Interview Assistant

> A multi-agent AI system that conducts realistic, adaptive interview practice for **any professional field** — software engineering, nursing, biology, cybersecurity, and more. Built as a hands-on exploration of LangGraph, agentic routing, and multi-agent orchestration.

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Python](https://img.shields.io/badge/python-3.11-blue)
![React](https://img.shields.io/badge/react-18-61DAFB)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## ✨ What It Does

Most interview prep tools are glorified flashcards. This one **actually interviews you** — and coaches you like a mentor would.

- 🎙️ **Role-aware questions** — tell it your role, experience level, and (optionally) a job description, and it generates tailored interview questions
- 🧠 **Agentic conversation routing** — the system understands *intent*, not just answers. Say "I don't get the question," "give me a hint," "skip this," or "can you elaborate?" — it responds appropriately, every time
- 📊 **Real evaluation, real coaching** — every answer gets a score, warm conversational feedback, and (for anything short of perfect) a model answer showing how to phrase it in a real interview
- 💡 **On-demand hints** — stuck? Ask for a hint anytime, no penalty for trying
- 📈 **Performance tracking** — see your average scores and strengths/weaknesses across topics over time
- 🗂️ **Session history** — pick up any past interview exactly where you left off

---

## 🏗️ Architecture

This isn't a single prompt wrapped in a chat UI — it's a genuine multi-agent system orchestrated with **LangGraph**.

```
                        ┌─────────────────────┐
                        │  Intent Classifier    │
                        │  (routes every msg)   │
                        └──────────┬───────────┘
                                   │
        ┌──────────────┬──────────┼──────────┬───────────────┬──────────────┐
        ▼              ▼          ▼          ▼               ▼              ▼
   Evaluator      Hint Gen   Question    Answer          Off-Topic      Skip
   Agent          Agent      Clarifier   Elaborator      Handler        Logic
        │                                                 
        ▼
   Answer Revealer (if hints exhausted)
        
   Interviewer Agent — generates the next question
   Summarizer Agent — end-of-session performance report
```

**9 specialized agents**, each with a single responsibility, coordinated through conditional routing based on real-time intent classification — not a fixed, rigid pipeline.

### Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, Tailwind CSS, Framer Motion, Shadcn/ui |
| **Backend** | FastAPI, LangGraph, LangChain |
| **LLM Provider** | Groq (`openai/gpt-oss-120b` for reasoning, `openai/gpt-oss-20b` for speed) |
| **Database** | MongoDB |
| **Auth** | Google OAuth 2.0 + JWT |
| **Observability** | Langfuse |
| **Infra** | Docker & Docker Compose |

---

## 🚀 Getting Started

### Prerequisites

All you need installed is **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**. That's it — Python, Node.js, and MongoDB all run inside containers, nothing else to set up on your machine.

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-interview-assistant.git
   cd ai-interview-assistant
   ```

2. **Set up environment variables**

   Copy the example file and fill in your own keys:
   ```bash
   cp .env.example .env
   ```

   You'll need:
   - A free [Groq API key](https://console.groq.com)
   - A [Google OAuth Client ID & Secret](https://console.cloud.google.com/apis/credentials) (Authorized JavaScript origin: `http://localhost:5173`)
   - *(Optional)* A [Langfuse](https://cloud.langfuse.com) account for observability
   - A generated `SECRET_KEY` for JWT signing:
     ```bash
     python -c "import secrets; print(secrets.token_hex(32))"
     ```

   Also create `frontend/.env`:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   VITE_BACKEND_URL=http://localhost:8000
   ```

3. **Run everything with one command**
   ```bash
   docker compose up --build
   ```

   Or run it in the background:
   ```bash
   docker compose up --build -d
   ```

4. **Open the app**

   Visit **[http://localhost:5173](http://localhost:5173)**, sign in with Google, and start your first practice interview.

### Stopping

```bash
docker compose down
```

Your data persists in a Docker volume — restart anytime with `docker compose up` and pick up right where you left off.

---

## 🧩 Key Design Decisions

- **No RAG / vector database.** Questions are generated live by the LLM rather than retrieved from a static knowledge base — this keeps the system flexible across *any* field without needing a pre-built corpus.
- **MongoDB as the single memory layer** for sessions, users, and performance — simpler than juggling multiple databases for a system with this scope.
- **Model routing** — smaller, faster models handle question generation and hints; larger models handle evaluation and summarization, balancing speed and quality.
- **Agentic intent classification** sits in front of every user message, so the system reacts appropriately whether you're answering, asking for a hint, confused about the question, or just chatting off-topic — rather than treating every input as "an answer to grade."

---

## 🙋 About This Project

This was built as a hands-on way to learn **LangGraph** and multi-agent system design, on top of prior experience with LangChain and LangSmith. If you're exploring agentic architectures yourself, feel free to open an issue or reach out — always happy to talk shop.
