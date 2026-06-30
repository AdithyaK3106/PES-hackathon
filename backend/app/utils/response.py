"""
Response builder utility for standardizing API responses.
"""
from typing import Any, Dict

def success_response(data: Any, message: str = "Success") -> Dict[str, Any]:
    """
    Builds a standard success response.
    
    Args:
        data (Any): The payload to return.
        message (str): Optional success message.
        
    Returns:
        Dict[str, Any]: Standardized success payload.
    """
    return {
        "status": "success",
        "message": message,
        "data": data
    }

def error_response(error_code: str, message: str) -> Dict[str, Any]:
    """
    Builds a standard error response.
    
    Args:
        error_code (str): A snake_case error identifier.
        message (str): A human-readable error description.
        
    Returns:
        Dict[str, Any]: Standardized error payload.
    """
    return {
        "error": error_code,
        "message": message
    }
