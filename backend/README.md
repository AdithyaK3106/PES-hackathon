# Automated Bank Statement Analysis System - Backend

This is the FastAPI backend for the Automated Bank Statement Analysis System.

## Installation

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and fill in your configurations.
   ```bash
   cp .env.example .env
   ```

## Running the Application

Start the FastAPI server using Uvicorn:
```bash
uvicorn app.main:app --reload --port 8000
```
Or use python module execution (if configured in `__main__`):
```bash
python -m uvicorn app.main:app --reload --port 8000
```

## Folder Structure

- `app/main.py`: Application entry point and router registration.
- `app/core/`: Configuration and central logging.
- `app/models/`: Pydantic data models for validation.
- `app/routers/`: FastAPI route handlers (endpoints).
- `app/storage/`: State and data storage management.
- `app/utils/`: Helper functions (ID generation, responses).
- `tests/`: Pytest suite.

## API Endpoints

- `GET /health` - Health check.
- `POST /api/session/new` - Create a new analysis session.
- `GET /api/session` - List all active sessions.
- `GET /api/session/{session_id}` - Retrieve metadata for a specific session.
- `DELETE /api/session/{session_id}` - Delete a session and its transactions.

## Example Requests

**Create Session**
```bash
curl -X 'POST' \
  'http://127.0.0.1:8000/api/session/new' \
  -H 'accept: application/json'
```
*Response:*
```json
{
  "session_id": "sess_a1b2c3d4e5f6g7h8"
}
```

**Get Session Metadata**
```bash
curl -X 'GET' \
  'http://127.0.0.1:8000/api/session/sess_a1b2c3d4e5f6g7h8' \
  -H 'accept: application/json'
```
*Response:*
```json
{
  "session_id": "sess_a1b2c3d4e5f6g7h8",
  "metadata": {
    "created_at": "2023-10-27T10:00:00.000000",
    "last_updated": "2023-10-27T10:00:00.000000",
    "filename": null,
    "parse_confidence": null
  }
}
```

## Development Notes

- **Phase 1 Completion:** The foundational FastAPI application, models, logging, configurations, and session management endpoints are fully built and tested.
- **Testing:** Run `pytest` to execute all unit tests located in the `tests/` directory.
- **Session Store:** In-memory threading-safe session state holds active parsing progress. Ensure sessions are deleted upon completion or expiration to free memory.
