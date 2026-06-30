"""
In-memory singleton storage for sessions and transactions.
"""
import threading
from datetime import datetime
from typing import Dict, List, Optional, Any
from app.models.transaction import Transaction

class SessionStore:
    """
    Thread-safe in-memory store for user sessions.
    
    Structure:
    {
        session_id: {
            "transactions": List[Transaction],
            "metadata": {
                "created_at": datetime,
                "last_updated": datetime,
                "filename": str | None,
                "parse_confidence": float | None
            }
        }
    }
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(SessionStore, cls).__new__(cls)
                cls._instance._store: Dict[str, Dict[str, Any]] = {}
                cls._instance._store_lock = threading.Lock()
        return cls._instance

    def create_session(self, session_id: str) -> None:
        """Creates a new empty session."""
        with self._store_lock:
            now = datetime.utcnow().isoformat()
            self._store[session_id] = {
                "transactions": [],
                "metadata": {
                    "created_at": now,
                    "last_updated": now,
                    "filename": None,
                    "parse_confidence": None
                }
            }

    def delete_session(self, session_id: str) -> bool:
        """Deletes a session. Returns True if deleted, False if not found."""
        with self._store_lock:
            if session_id in self._store:
                del self._store[session_id]
                return True
            return False

    def session_exists(self, session_id: str) -> bool:
        """Checks if a session exists."""
        with self._store_lock:
            return session_id in self._store

    def save_transactions(self, session_id: str, transactions: List[Transaction]) -> None:
        """Appends transactions to a session."""
        with self._store_lock:
            if session_id in self._store:
                self._store[session_id]["transactions"].extend(transactions)
                self._store[session_id]["metadata"]["last_updated"] = datetime.utcnow().isoformat()

    def get_transactions(self, session_id: str) -> List[Transaction]:
        """Retrieves all transactions for a session."""
        with self._store_lock:
            if session_id in self._store:
                return self._store[session_id]["transactions"]
            return []

    def clear_transactions(self, session_id: str) -> None:
        """Clears all transactions for a session."""
        with self._store_lock:
            if session_id in self._store:
                self._store[session_id]["transactions"] = []
                self._store[session_id]["metadata"]["last_updated"] = datetime.utcnow().isoformat()

    def list_sessions(self) -> List[str]:
        """Returns a list of all active session IDs."""
        with self._store_lock:
            return list(self._store.keys())

    def get_session_metadata(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves the metadata for a specific session."""
        with self._store_lock:
            if session_id in self._store:
                return self._store[session_id]["metadata"]
            return None

# Singleton instance for application use
session_store = SessionStore()
