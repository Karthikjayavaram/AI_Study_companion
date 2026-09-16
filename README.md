# AI Study Companion – AI-Powered Learning & Growth Workspace

> **A persistent, contextual, and measurable AI learning companion designed to help learners understand, practice, measure, and continuously improve a skill or area of knowledge.**

---

## 1. Product Overview & Goal

The **AI Study Companion** transforms online learning from disconnected chatbot queries into a connected, evidence-grounded learning loop:

```
Create Space
    │
    ▼
Create Project (Context Boundary)
    │
    ▼
Add Learning Material (PDFs, notes)
    │
    ▼
Process & Understand Material (OCR, chunking, embeddings)
    │
    ▼
Learn with AI Tutor (Grounded responses, page citations, guardrails)
    │
    ▼
Take Adaptive Quiz (MCQ & open-ended questions)
    │
    ▼
Evaluate Understanding (Qualitative AI grading)
    │
    ▼
Update Concept Mastery (Dynamic scoring: improving, stable, attention)
    │
    ▼
Analyze Growth & Recommend Next Action ("What should I do next?")
    │
    ▼
Continue Learning Cycle
```

The system continuously answers three questions for the learner:
1. **What am I learning?** (Represented by Spaces, Projects, materials, conversations, and concepts)
2. **How well am I learning it?** (Measured through quizzes, assessments, mistake patterns, and mastery estimates)
3. **What should I do next?** (Driven by growth trends, weaknesses, and targeted recommendations)

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, React Router v6, Tailwind CSS, Lucide Icons |
| **Backend** | Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic |
| **Database** | PostgreSQL 16+ with `pgvector` extension (with SQLite test fallback) |
| **AI Layer** | Hugging Face Inference API (`mistralai/Mistral-7B-Instruct-v0.3`, `sentence-transformers/all-MiniLM-L6-v2`), decoupled `ChatProvider` & `EmbeddingProvider` abstractions |
| **Background Processing** | Redis, Celery |
| **Storage** | Abstracted Storage Service (Local filesystem provider + S3/MinIO provider) |
| **Observability** | Structured Logging, Custom `AIUsage` Telemetry, Langfuse tracing hooks |

---

## 3. Repository Structure

```
.
├── frontend/                     # React + Vite + TypeScript Single Page Application
│   ├── src/
│   │   ├── api/                  # Typed API client abstraction
│   │   ├── components/layout/    # AppLayout, Navbar, Sidebar
│   │   ├── context/              # AuthContext & Session management
│   │   ├── pages/                # Home, Spaces, Projects, Materials, Tutor, Quiz, Growth, Analytics, Admin
│   │   ├── App.tsx               # Application routing table
│   │   └── main.tsx              # DOM entry point
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/                      # FastAPI Modular Monolith Backend
│   ├── app/
│   │   ├── api/                  # Modular API routers (/v1/auth, /spaces, /projects, /materials, /tutor, /quiz, /growth, /analytics, /admin)
│   │   ├── core/                 # Config, security (JWT & bcrypt), logging, errors
│   │   ├── db/                   # Database session, base model, pgvector integration
│   │   ├── models/               # SQLAlchemy domain entities (User, Space, Project, Material, Concept, Quiz, Assessment, etc.)
│   │   ├── schemas/              # Pydantic validation schemas
│   │   ├── repositories/         # Scoped data access layer
│   │   ├── services/             # Business logic & storage abstraction (Local / S3)
│   │   ├── ai/                   # AI provider abstraction & telemetry recorder
│   │   ├── workers/              # Celery background queue configuration
│   │   └── main.py               # FastAPI application entry & health check
│   ├── alembic/                  # Database migration versions
│   ├── tests/                    # Pytest test suite (health, auth, config)
│   ├── requirements.txt
│   └── pyproject.toml
├── docs/                         # Architecture, PRD traceability, AI dev logs
│   ├── architecture.md
│   ├── requirements-mapping.md
│   └── ai-development-log.md
├── scripts/                      # Convenience dev & test runner scripts
│   ├── run_dev.ps1
│   └── run_tests.ps1
├── .env.example                  # Environment configuration template
├── .gitignore                    # Git ignore rules
├── docker-compose.yml            # Local PostgreSQL + pgvector & Redis services
└── README.md
```

---

## 4. Local Setup & Quickstart

### Prerequisites
* **Python 3.11+** installed
* **Node.js 18+** & **npm** installed
* *(Optional)* **Docker** & **Docker Compose** (for PostgreSQL + pgvector & Redis)

### Step 1: Clone and Configure Environment
```bash
git clone https://github.com/Karthikjayavaram/AI_Study_Companion.git
cd AI_Study_Companion
cp .env.example .env
```
Update `.env` with your Hugging Face API key (`HF_API_KEY`) and desired configuration.

### Step 2: Backend Setup
```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Run initial migrations
alembic upgrade head

# Start backend dev server
uvicorn app.main:app --reload --port 8000
```
Backend API interactive documentation is available at:
* Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
* Health Check: [http://localhost:8000/health](http://localhost:8000/health)

### Step 3: Frontend Setup
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend web application is available at [http://localhost:5173](http://localhost:5173).

---

## 5. Running with Docker Compose

To start local PostgreSQL with `pgvector` and Redis:
```bash
docker-compose up -d
```
This starts:
* PostgreSQL (with `pgvector/pgvector:pg16`) on `localhost:5432`
* Redis on `localhost:6379`

---

## 6. Running Verification Tests

### Automated Suite:
```powershell
# Windows PowerShell
./scripts/run_tests.ps1
```

### Manual Commands:
* **Backend Tests**:
  ```bash
  cd backend
  .venv/Scripts/pytest tests -v
  ```
* **Frontend Build & Typecheck**:
  ```bash
  cd frontend
  npm run build
  ```

---

## 7. AI Layer & Provider Architecture

The AI layer follows a clean, provider-agnostic architecture where application services interact exclusively with decoupled abstract interfaces:

```text
Application Services (AITutorService, QuizService)
        │
        ▼
   ChatProvider (app/ai/base.py)
        │
        ▼
HuggingFaceChatProvider (app/ai/huggingface_provider.py)
        │
        ▼
Hugging Face Inference API (mistralai/Mistral-7B-Instruct-v0.3)

Application Services (RetrievalService, MaterialProcessor)
        │
        ▼
 EmbeddingProvider (app/ai/base.py)
        │
        ▼
HuggingFaceEmbeddingProvider (app/ai/huggingface_provider.py)
        │
        ▼
Hugging Face Feature Extraction API (sentence-transformers/all-MiniLM-L6-v2, 384 dims)
```

### Key Design Principles
* **Hugging Face is the External AI Provider**: The application uses the Hugging Face Inference API for chat generation and dense vector embeddings. No OpenAI API keys are required.
* **Separation of Concerns**: Chat generation and embedding generation are cleanly decoupled into `ChatProvider` and `EmbeddingProvider` interfaces.
* **Factory / Dependency Injection**: `get_chat_provider()` and `get_embedding_provider()` instantiate providers based on `AI_PROVIDER=huggingface`.
* **Configurable Embedding Dimension**: The default embedding dimension is `384` (matching `sentence-transformers/all-MiniLM-L6-v2`). The dimension is strictly validated before storage—no silent padding or truncation.
* **Safe Secrets & Error Handling**: `HF_API_KEY` is backend-only and never exposed to the frontend, in API responses, or in logs. API keys and bearer tokens are automatically scrubbed from exception messages.
* **Deterministic Scoring & RAG Grounding**: Quizzes and tutor answers are grounded in project materials with page/chunk citations. Concepts are extracted and tracked with atomic mastery updates.
* **AI Telemetry & Cost Tracking**: Every AI invocation logs model, feature, token usage, latency in milliseconds, and status in the `ai_usages` table.

> [!NOTE]
> **PostgreSQL + pgvector Runtime Verification**:
> Native PostgreSQL + pgvector runtime verification is currently **PENDING** because Docker, WSL, and local PostgreSQL are not installed in this development environment. SQLite fallback tests verify all application logic and migrations 001 through 007.

---

## 8. Development Status & Next Steps

This repository represents the completed **Phase 1: Foundation & Architecture Initialization**.

* [x] Monorepo structure, modern dependencies, and Docker compose configuration
* [x] 16 Core domain entities modeled in SQLAlchemy with Alembic migration
* [x] Fast, modular FastAPI backend with CORS, auth, and health endpoint
* [x] React + Vite + TypeScript frontend with PRD navigation shell & dashboard views
* [x] Passing backend test suite & verified frontend production build
* [ ] *Next Phase*: Implement PDF text extraction, OCR fallback, and pgvector embeddings pipeline
* [ ] *Next Phase*: Implement live Hugging Face Tutor chat with streaming responses and vector retrieval
* [ ] *Next Phase*: Wire adaptive quiz generator and open-ended AI grading pipeline