# AI Development & Architecture Log

This log records AI usage throughout the development lifecycle of **AI Study Companion**, strictly distinguishing between **AI used to BUILD the product** and **AI used INSIDE the product**.

---

## 1. AI Used to BUILD the Product (Development Tools & Assistants)

| Phase / Milestone | Tool / Agent | Prompt / Intent Summary | Key Architectural Decisions & Outputs |
| :--- | :--- | :--- | :--- |
| **Phase 1: Repo Initialization** | Antigravity AI Assistant | Repository setup, domain schema design, modular FastAPI backend, React Vite frontend, Docker environment, and documentation. | - Established modular monolith architecture with separate `models`, `schemas`, `services`, `repositories`, and `ai` layers.<br>- Enforced Project as core boundary of tenant data isolation.<br>- Set up PostgreSQL + pgvector foundation with SQLite test compatibility.<br>- Defined responsive React + Tailwind application shell. |

---

## 2. AI Used INSIDE the Product (Runtime Systems & Models)

| Component | Target Provider / Model | Responsibility | Safety / Grounding Mechanism |
| :--- | :--- | :--- | :--- |
| **AI Tutor** | OpenAI `gpt-4o-mini` (or equivalent via `BaseLLMClient`) | Answering learner queries with citations to uploaded material, offering simplified explanations and Socratic guidance. | - Vector similarity search retrieves top-k chunks from user's Project materials only.<br>- Strict prompt templates requiring page citations (`Source: [Doc] - Page X`).<br>- Explicit instructions to acknowledge missing evidence when confidence is low. |
| **Document Understanding & Concept Extraction** | LLM Extraction Pipeline | Extracting structured concept tags, definitions, and prerequisite hierarchies from parsed PDFs. | - Pydantic structured output validation.<br>- Asynchronous background queue via Celery to avoid blocking HTTP threads. |
| **Adaptive Quiz & Assessment Evaluator** | Structured Output LLM | Generating targeted MCQ and open-ended questions based on concept mastery; grading learner free-form answers. | - Evaluates conceptual accuracy, missed points, and reasoning quality beyond simple binary scores.<br>- Feeds grading results into Concept Mastery score updates. |
| **Growth & Recommendation Engine** | Analytical Rule Engine + LLM Summarizer | Identifying stagnant or struggling concepts and suggesting next learning steps ("What should I do next?"). | - Evaluates weakness patterns, assessment history, and recent interactions.<br>- Generates actionable study recommendations. |
| **Observability & Cost Tracking** | Langfuse & `AIUsage` DB Entity | Tracking prompt/completion tokens, latency, cost estimates, and error rates per model and feature. | - All model invocations wrap an observability callback recording telemetry. |
