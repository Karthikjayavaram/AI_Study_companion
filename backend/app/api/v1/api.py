from fastapi import APIRouter
from app.api.v1.endpoints import (
    admin,
    analytics,
    auth,
    growth,
    materials,
    projects,
    quiz,
    retrieval,
    spaces,
    tutor,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(spaces.router, prefix="/spaces", tags=["spaces"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(retrieval.router, prefix="/projects", tags=["retrieval"])
api_router.include_router(materials.router, prefix="/materials", tags=["materials"])

api_router.include_router(tutor.router, prefix="/tutor", tags=["tutor"])
api_router.include_router(quiz.router, prefix="/quiz", tags=["quiz"])
api_router.include_router(growth.router, prefix="/growth", tags=["growth"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
