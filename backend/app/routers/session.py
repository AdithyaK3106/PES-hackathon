"""
Session management router.
"""
from fastapi import APIRouter, HTTPException, status
from app.models.session import (
    CreateSessionResponse,
    DeleteSessionResponse,
    SessionResponse,
    ErrorResponse
)
from app.storage.session_store import session_store
from app.utils.id_generator import generate_session_id
from app.utils.response import error_response

router = APIRouter(prefix="/api/session", tags=["session"])

@router.post("/new", response_model=CreateSessionResponse)
async def create_new_session():
    """
    Creates a new analysis session.
    """
    session_id = generate_session_id()
    session_store.create_session(session_id)
    return CreateSessionResponse(session_id=session_id)

@router.delete("/{session_id}", response_model=DeleteSessionResponse, responses={404: {"model": ErrorResponse}})
async def delete_session(session_id: str):
    """
    Deletes an existing session and all associated data.
    """
    success = session_store.delete_session(session_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_response("session_not_found", f"Session {session_id} does not exist.")
        )
    return DeleteSessionResponse(deleted=True)

@router.get("", response_model=list[str])
async def list_active_sessions():
    """
    Lists all active session identifiers.
    """
    return session_store.list_sessions()

@router.get("/{session_id}", response_model=SessionResponse, responses={404: {"model": ErrorResponse}})
async def get_session_details(session_id: str):
    """
    Retrieves metadata for a given session.
    """
    metadata = session_store.get_session_metadata(session_id)
    if metadata is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_response("session_not_found", f"Session {session_id} does not exist.")
        )
    return SessionResponse(session_id=session_id, metadata=metadata)
