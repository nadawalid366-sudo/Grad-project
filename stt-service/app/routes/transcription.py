import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File
from fastapi.concurrency import run_in_threadpool
from app.utils.validators import validate_audio_file, MAX_FILE_SIZE_BYTES
from app.utils.errors import FileValidationError
from app.services.whisper_service import WhisperService
from app.utils.logger import logger

router = APIRouter()
whisper_service = WhisperService()

UPLOAD_DIR = os.path.join(os.getcwd(), "app", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/transcribe")
async def transcribe_audio_endpoint(file: UploadFile = File(...)):
    logger.info(f"Received transcription request for file: {file.filename}")

    # Validate basic file properties
    validate_audio_file(file)

    # Generate a unique filename and save locally
    ext = file.filename.split('.')[-1].lower()
    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        # Save file to disk in chunks and check size
        file_size = 0
        with open(file_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                file_size += len(chunk)
                if file_size > MAX_FILE_SIZE_BYTES:
                    raise FileValidationError(f"File size exceeds maximum limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB")
                buffer.write(chunk)

        if file_size == 0:
            raise FileValidationError("Empty file uploaded")

        logger.info(f"Saved file temporarily at {file_path} (Size: {file_size} bytes)")

        # Run transcription in a thread pool so we don't block the event loop
        result = await run_in_threadpool(whisper_service.transcribe_audio, file_path)

        return {
            "success": True,
            "text": result["text"],
            "language": result["language"],
            "processing_time": result["duration"]
        }

    except FileValidationError as e:
        raise e
    except Exception as e:
        logger.error(f"Transcription endpoint failed: {e}")
        raise e
    finally:
        # Clean up the temporary file
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Cleaned up temporary file: {file_path}")
