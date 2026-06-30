"""
Main entry point for the FastAPI application.
"""
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import setup_logging
from app.routers import health, session
from app.utils.response import error_response

# Configure logging
setup_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager. Handles startup and shutdown events.
    """
    logger.info("Starting up Bank Statement Analyzer Backend...")
    # Add any startup logic here (e.g. model loading, database connections)
    yield
    logger.info("Shutting down Bank Statement Analyzer Backend...")
    # Add any teardown logic here

app = FastAPI(
    title="Bank Statement Analysis API",
    description="Automated backend for parsing and analyzing bank statements.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware (Hackathon mode: Allow all)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Middleware for logging request details and execution time.
    """
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(
        f"Method: {request.method} Path: {request.url.path} "
        f"Status: {response.status_code} Time: {process_time:.4f}s"
    )
    return response

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Standardize standard HTTP exceptions into JSON response.
    """
    # If the detail is already a dict (from our routers), use it, otherwise format it.
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        payload = exc.detail
    else:
        payload = error_response("http_error", str(exc.detail))
    return JSONResponse(
        status_code=exc.status_code,
        content=payload
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Standardize validation errors.
    """
    return JSONResponse(
        status_code=422,
        content=error_response("validation_error", "Request validation failed. " + str(exc))
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Catch-all global exception handler to prevent raw stacktraces.
    """
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content=error_response("internal_server_error", "An unexpected error occurred.")
    )

# Router Registration
app.include_router(health.router)
app.include_router(session.router)

# Placeholder routers for future modules
# app.include_router(upload.router)
# app.include_router(transactions.router)
# app.include_router(analyze.router)
# app.include_router(summary.router)
# app.include_router(graph.router)
# app.include_router(report.router)

@app.get("/", include_in_schema=False)
async def root():
    """
    Redirects root to API documentation.
    """
    return RedirectResponse(url="/docs")
