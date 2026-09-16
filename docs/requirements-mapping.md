# Requirements to Architecture Mapping (PRD Traceability)

This matrix maps requirements from the Product Requirements Document (v3.0) to system architectural components and tracks implementation status across development phases.

| PRD Section & Requirement | Target Architectural Module | Subsystem / Files | Status |
| :--- | :--- | :--- | :--- |
| **1. Space & Project Management** | Core Domain & API | `app/models/space.py`, `app/models/project.py`, `app/api/v1/endpoints/spaces.py`, `app/api/v1/endpoints/projects.py` | **In Progress** (Foundation) |
| **2. Learning Materials & PDF Upload** | Ingestion & Storage | `app/models/material.py`, `app/services/storage/`, `app/api/v1/endpoints/materials.py`, `app/workers/document_tasks.py` | **In Progress** (Foundation) |
| **3. Asynchronous Document Processing** | Workers & Parsing | `app/workers/`, `Celery + Redis pipeline` | **Planned** |
| **4. Vector Retrieval & Grounding (pgvector)** | Vector Knowledge Base | `pgvector` schema, `app/models/material.py (MaterialChunk)`, `app/ai/retrieval.py` | **In Progress** (Schema ready) |
| **5. AI Tutor & Grounded Citations** | AI Service & Tutor API | `app/ai/providers/`, `app/services/tutor_service.py`, `app/api/v1/endpoints/tutor.py` | **In Progress** (Foundation) |
| **6. Unsupported Question Handling** | AI Guardrails | `app/ai/guardrails.py`, Tutor prompt templates | **Planned** |
| **7. Adaptive Quiz & Assessment (MCQ/Open)** | Assessment Engine | `app/models/assessment.py`, `app/api/v1/endpoints/quiz.py`, `app/services/assessment_service.py` | **In Progress** (Foundation) |
| **8. Concept Mastery Tracking & Growth** | Mastery & Analytics | `app/models/concept.py`, `app/api/v1/endpoints/growth.py`, `app/services/mastery_service.py` | **In Progress** (Foundation) |
| **9. Recommendation Engine ("What next?")** | Recommendation Service | `app/models/recommendation.py`, `app/services/recommendation_service.py` | **In Progress** (Foundation) |
| **10. Event-Driven Activity Tracking** | Event Pipeline | `app/models/activity.py`, `app/services/activity_service.py` | **In Progress** (Foundation) |
| **11. Admin Operational Dashboard** | Admin & System Telemetry | `app/api/v1/endpoints/admin.py`, `app/services/admin_service.py` | **In Progress** (Foundation) |
| **12. AI Observability & Cost Tracking** | AI Telemetry | `app/models/ai_usage.py`, `app/ai/observability.py`, Langfuse hooks | **In Progress** (Foundation) |
| **13. Authentication & Authorization** | Security & Auth | `app/core/security.py`, `app/api/v1/endpoints/auth.py`, `app/models/user.py` | **In Progress** (Foundation) |
| **14. Frontend Application Shell & Views** | Single Page Application | `frontend/src/pages/`, `frontend/src/components/layout/`, `frontend/src/routes.tsx` | **In Progress** (Foundation) |

---

### Status Definitions
* **Planned**: Architectural placeholders, schemas, or interfaces established; business logic and workflows scheduled for subsequent phases.
* **In Progress**: Core modules, schemas, endpoints, and UI shells active and validated in current phase.
* **Implemented**: Full feature set verified end-to-end with unit tests, integration tests, and UI interactions.
