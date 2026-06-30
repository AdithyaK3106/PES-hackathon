"""
Tests for the health check endpoint.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    """Test that the health endpoint returns the correct status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "Bank Statement Analyzer Backend"
    assert data["version"] == "1.0.0"
