"""
Tests for the session management endpoints.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_session():
    """Test creating a new session."""
    response = client.post("/api/session/new")
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["session_id"].startswith("sess_")

def test_list_and_get_session():
    """Test listing sessions and retrieving metadata."""
    # Create session
    create_resp = client.post("/api/session/new")
    session_id = create_resp.json()["session_id"]
    
    # List sessions
    list_resp = client.get("/api/session")
    assert list_resp.status_code == 200
    assert session_id in list_resp.json()
    
    # Get specific session
    get_resp = client.get(f"/api/session/{session_id}")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["session_id"] == session_id
    assert "metadata" in data
    assert "created_at" in data["metadata"]

def test_delete_session():
    """Test deleting a session."""
    # Create session
    create_resp = client.post("/api/session/new")
    session_id = create_resp.json()["session_id"]
    
    # Delete session
    delete_resp = client.delete(f"/api/session/{session_id}")
    assert delete_resp.status_code == 200
    assert delete_resp.json()["deleted"] is True
    
    # Verify deletion
    get_resp = client.get(f"/api/session/{session_id}")
    assert get_resp.status_code == 404
    # With global exception handler, the response should be standard {"error": "...", "message": "..."}
    assert get_resp.json()["error"] == "session_not_found"

    # Duplicate deletion should also return 404
    delete_again_resp = client.delete(f"/api/session/{session_id}")
    assert delete_again_resp.status_code == 404
    assert delete_again_resp.json()["error"] == "session_not_found"

def test_get_invalid_session():
    """Test retrieving an invalid session."""
    get_resp = client.get("/api/session/sess_invalid123")
    assert get_resp.status_code == 404
    assert get_resp.json()["error"] == "session_not_found"
