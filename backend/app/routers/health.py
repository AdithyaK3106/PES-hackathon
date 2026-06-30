"""
Health check router.
"""
from fastapi import APIRouter

router = APIRouter(tags=["health"])

@router.get("/health")
async def health_check():
    """
    Service health check endpoint.
    """
    return {
        "status": "healthy",
        "service": "Bank Statement Analyzer Backend",
        "version": "1.0.0"
    }
