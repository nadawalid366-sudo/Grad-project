from fastapi import Request
from fastapi.responses import JSONResponse
from .logger import logger

class WhisperProcessingError(Exception):
    """Exception raised for errors during Whisper processing."""
    def __init__(self, detail: str):
        self.detail = detail

class FileValidationError(Exception):
    """Exception raised for file validation errors."""
    def __init__(self, detail: str):
        self.detail = detail

async def whisper_processing_exception_handler(request: Request, exc: WhisperProcessingError):
    logger.error(f"Whisper processing error: {exc.detail}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Transcription failed", "detail": exc.detail},
    )

async def file_validation_exception_handler(request: Request, exc: FileValidationError):
    logger.warning(f"File validation error: {exc.detail}")
    return JSONResponse(
        status_code=400,
        content={"success": False, "error": "Invalid file", "detail": exc.detail},
    )

async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error", "detail": str(exc)},
    )
