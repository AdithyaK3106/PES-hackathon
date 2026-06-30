"""
Helper functions for unique identifier generation.
"""
import uuid
import secrets

def generate_uuid() -> str:
    """
    Generates a standard UUID4 string.
    
    Returns:
        str: A randomly generated UUID string.
    """
    return str(uuid.uuid4())

def generate_session_id() -> str:
    """
    Generates a secure, readable session identifier.
    
    Returns:
        str: A session identifier prefixed with 'sess_'.
    """
    # Using 8 bytes (16 hex characters) for the session identifier
    random_hex = secrets.token_hex(8)
    return f"sess_{random_hex}"
