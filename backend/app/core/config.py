"""
Configuration management using pydantic-settings.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application settings derived from environment variables.
    """
    BACKEND_PORT: int = 8000
    ALLOWED_ORIGINS: str = "*"
    GEMINI_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

# Global settings instance
settings = Settings()
