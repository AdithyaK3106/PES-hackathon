"""
Session API response models.
"""
from typing import Any, Dict, List
from pydantic import BaseModel, Field

class SessionResponse(BaseModel):
    """
    Metadata response for a session.
    """
    session_id: str = Field(..., description="Unique identifier for the session")
    metadata: Dict[str, Any] = Field(..., description="Metadata associated with the session")

class CreateSessionResponse(BaseModel):
    """
    Response model for session creation.
    """
    session_id: str = Field(..., description="Unique identifier of the newly created session")

class DeleteSessionResponse(BaseModel):
    """
    Response model for session deletion.
    """
    deleted: bool = Field(..., description="Indicates if the deletion was successful")

class ErrorResponse(BaseModel):
    """
    Standard error response model.
    """
    error: str = Field(..., description="A snake_case error identifier")
    message: str = Field(..., description="A human-readable error description")
