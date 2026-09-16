# System Architecture & Technical Design

## 1. System Overview

**AI Study Companion** is a persistent, contextual, and measurable learning workspace engineered to facilitate the full learning cycle:

```
Create Space
    │
    ▼
Create Project (Core Ownership & Context Boundary)
    │
    ▼
Add Learning Material (PDFs, Markdown, Notes)
    │
    ▼
Asynchronous Processing (Parsing, Chunking, Extraction, Vector Embeddings)
    │
    ▼
Learn with AI Tutor (Grounded in Material, Citing Pages, Guarding against hallucinations)
    │
    ▼
Take Adaptive Quiz (MCQ & Open-ended with AI evaluation)
    │
    ▼
Evaluate Understanding & Update Concept Mastery (0% - 100%, Trend Analysis)
    │
    ▼
Analyze Growth & Recommend Next Action ("What should I do next?")
    │
    ▼
Continue Learning Cycle
```

---

## 2. Frontend / Backend Separation

The system follows a strict decoupled monorepo architecture:

* **Frontend (`/frontend`)**:
  * Single Page Application built with **React**, **Vite**, **TypeScript**, and **Tailwind CSS**.
  * Consumes the backend exclusively through typed REST APIs via an abstracted API client layer.
  * State management partitions UI state, active learning session state, and cached API entities.
  * Provides responsive views: Home, Spaces, Project Dashboard, Materials Manager, AI Tutor workspace, Adaptive Quiz, Growth/Mastery Visualizer, and Admin Monitoring.

* **Backend (`/backend`)**:
  * High-performance asynchronous API engine built with **Python**, **FastAPI**, **Pydantic v2**, and **SQLAlchemy 2.0**.
  * Modular monolith pattern where business logic resides in `services/`, database operations in `repositories/`, domain logic in `models/`, and validation in `schemas/`.
  * No database queries or external AI client calls are placed inside route handlers.

---

## 3. Database Architecture & Vector Retrieval

* **Primary Store**: PostgreSQL 16+.
* **Vector Engine**: `pgvector` extension for efficient cosine / Euclidean distance similarity searches over document chunk embeddings.
* **ORM & Migrations**: SQLAlchemy 2.0 with Alembic for traceable database schema evolution.

### Core Domain Entities & Ownership Hierarchy

```
User (Tenant / Learner)
  └── Space (Broad Domain: "Machine Learning", "Cloud Certification")
        └── Project (Core Learning Journey & Ownership Boundary)
              ├── Material (Uploaded PDFs, status: Queued -> Processing -> Ready -> Failed)
              │     └── MaterialChunk (Text segments, page numbers, vector embeddings)
              ├── Concept (Extracted key topics & knowledge nodes)
              ├── ConceptMastery (Estimated proficiency, status: improving/stable/attention)
              ├── Conversation (Tutor threads scoped to Project context)
              │     └── Message (Learner questions, AI Tutor responses, citations)
              ├── Quiz (Adaptive tests)
              │     ├── Question (MCQ & open-ended)
              │     └── QuizAttempt (Learner answers, AI grading, explanation)
              ├── Assessment (Comprehensive evaluation aggregate)
              ├── Recommendation (Generated guidance: targeted next steps)
              └── ActivityEvent (Event log for learning actions & analytics)
```

---

## 4. AI Layer & Provider Abstraction

The AI subsystem is structured under `backend/app/ai/`:

* **Provider Abstraction**: A unified `BaseLLMClient` interface decoupling business logic from proprietary APIs (e.g., OpenAI, Anthropic, or local open-weights models).
* **Controlled Capabilities (Tool/Action Protocol)**: The AI layer never queries the raw database directly. Capabilities such as `search_project_materials`, `get_concept_mastery`, and `record_quiz_result` are exposed as validated backend tools.
* **Groundedness & Citations**: Responses require source references (e.g. `Source: ML_Guide.pdf — Page 14`). When context is insufficient, the system gracefully admits uncertainty instead of hallucinating.
* **Future LangChain / LangGraph Integration**: Prepared hooks and state graph definitions for multi-turn structured tutoring and assessment pipelines.

---

## 5. Asynchronous Background Processing

* **Message Broker & Task Queue**: Redis + Celery.
* **Long-Running Workflows**:
  1. **Document Processing Workflow**: PDF parsing, OCR fallback, structural markdown extraction, chunking, and embedding generation.
  2. **Assessment & Grading Workflow**: Evaluating open-ended student answers, updating mastery scores, and detecting knowledge gaps.
  3. **Growth & Recommendation Engine**: Aggregating weekly study metrics, identifying stagnant or declining concepts, and calculating recommended actions.

---

## 6. Document Storage Abstraction

* A flexible `StorageService` interface (`backend/app/services/storage/`) providing uniform file operations (`upload`, `get`, `delete`, `get_url`).
* Local filesystem storage provider for frictionless local development.
* S3-compatible provider for production object storage (AWS S3, MinIO, Cloudflare R2).

---

## 7. Security, Authorization & Data Isolation

* **Project-Level Data Isolation**: All queries and vector similarity searches strictly filter by `project_id` and authorized `user_id`.
* **Authentication**: JWT-based bearer authentication with secure password hashing (Argon2 / bcrypt).
* **AI Safety**: User prompts and uploaded materials are sanitized and treated as untrusted data inputs, mitigating prompt injection attacks against internal application instructions.

---

## 8. Observability & AI Telemetry

* **AI Usage Tracking (`AIUsage` model)**: Captures model name, prompt tokens, completion tokens, latency (ms), estimated cost, and status.
* **Structured Logging**: JSON-formatted application logs with correlation IDs.
* **Langfuse Ready**: Pre-configured environment hooks for tracing LLM execution chains.
