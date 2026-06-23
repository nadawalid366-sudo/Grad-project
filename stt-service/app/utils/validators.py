import os
from fastapi import UploadFile
from .errors import FileValidationError
from .logger import logger

ALLOWED_EXTENSIONS = os.getenv("ALLOWED_EXTENSIONS", "mp3,wav,m4a,webm").split(",")
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", 50))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

def validate_audio_file(file: UploadFile) -> None:
    """
    Validates the uploaded audio file for existence, format, and size.
    Raises FileValidationError if validation fails.
    """
    if not file or not file.filename:
        raise FileValidationError("Missing file or filename")

    # Check extension
    ext = file.filename.split('.')[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise FileValidationError(f"Invalid file type: {ext}. Allowed: {ALLOWED_EXTENSIONS}")

    # File size validation requires reading the spool or seeking
    # We will check the size after saving, or rely on FastAPI's Content-Length if available
    # But for robustness, we handle size check during upload save.
    
    logger.info(f"File {file.filename} passed initial validation.")
