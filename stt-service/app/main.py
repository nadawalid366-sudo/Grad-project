import os
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from fastapi.responses import JSONResponse
from app.routes import transcription
from app.utils.errors import (
    WhisperProcessingError,
    FileValidationError,
    whisper_processing_exception_handler,
    file_validation_exception_handler,
    general_exception_handler
)
from app.utils.logger import logger

load_dotenv()

import os

os.environ["PATH"] += r";C:\ffmpeg\bin\ffmpeg.exe"

# ── Optional API key protection ───────────────────────────────────────────────
# Set API_KEY in .env to require authentication.
# Leave it empty / unset to allow open access (good for local development).
API_KEY = os.getenv("API_KEY", "")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_key(key: str = Depends(api_key_header)):
    if API_KEY and key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key. Pass it as 'X-API-Key' header.")

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=os.getenv("APP_NAME", "Speech to Text API"),
    version=os.getenv("APP_VERSION", "1.0.0"),
    description="""
## Speech to Text API

Transcribes audio files (Arabic & English) using OpenAI Whisper running locally.

### Integration Guide

**Endpoint:** `POST /transcribe`

**Request:** `multipart/form-data` with a field named `file` containing an audio file.

**Supported formats:** `mp3`, `wav`, `m4a`, `webm`

**Authentication (optional):** If an API key is configured, pass it in the `X-API-Key` header.

**Example (curl):**
```bash
curl -X POST http://<server-ip>:8000/transcribe \\
  -H "X-API-Key: your-key-here" \\
  -F "file=@recording.m4a"
```

**Response:**
```json
{
  "success": true,
  "text": "Hello, this is the transcribed text.",
  "language": "en",
  "processing_time": 3.14
}
```
""",
    contact={
        "name": "Speech to Text API",
    },
)

# ── CORS — allow any origin so mobile apps and third-party clients can connect ─
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Exception handlers ─────────────────────────────────────────────────────────
app.add_exception_handler(WhisperProcessingError, whisper_processing_exception_handler)
app.add_exception_handler(FileValidationError, file_validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# ── Routes ─────────────────────────────────────────────────────────────────────
app.include_router(
    transcription.router,
    tags=["Transcription"],
    dependencies=[Depends(verify_api_key)],
)

# ── Startup ────────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    logger.info("Application starting up. Initializing Whisper service...")
    from app.services.whisper_service import WhisperService
    WhisperService()
    if API_KEY:
        logger.info("API key protection is ENABLED.")
    else:
        logger.info("API key protection is DISABLED (open access).")

# ── Health / Info endpoints ────────────────────────────────────────────────────
@app.get("/", tags=["Info"], summary="Welcome")
def read_root():
    return {
        "name": os.getenv("APP_NAME", "Speech to Text API"),
        "version": os.getenv("APP_VERSION", "1.0.0"),
        "status": "running",
        "docs": "/docs",
        "model": os.getenv("WHISPER_MODEL", "tiny"),
    }

@app.get("/health", tags=["Info"], summary="Health check")
def health_check():
    """Returns 200 OK when the service is up. Use this to verify connectivity from mobile apps."""
    return {"status": "ok"}
