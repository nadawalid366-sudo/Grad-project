import os
import whisper
import time
from typing import Dict, Any
from app.utils.logger import logger
from app.utils.errors import WhisperProcessingError

# Phrases Whisper commonly invents from silence/noise on the smaller models.
_HALLUCINATION_PHRASES = {
    "thank you.",
    "thank you",
    "thanks for watching!",
    "thanks for watching.",
    "thank you for watching.",
    "thank you for watching!",
    "you",
    "you.",
    "bye.",
    "bye bye.",
    ".",
    "subscribe.",
    "please subscribe.",
}


def _is_hallucination(text: str) -> bool:
    return text.strip().lower() in _HALLUCINATION_PHRASES


class WhisperService:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(WhisperService, cls).__new__(cls)
            cls._instance.initialize_model()
        return cls._instance

    def initialize_model(self):
        model_name = os.getenv("WHISPER_MODEL", "tiny")
        logger.info(f"Loading Whisper model: {model_name}. This may take a while on first run...")
        try:
            self._model = whisper.load_model(model_name)
            logger.info("Whisper model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            raise RuntimeError(f"Could not load Whisper model: {e}")

    def transcribe_audio(self, file_path: str) -> Dict[str, Any]:
        """
        Transcribes the given audio file using the loaded Whisper model.
        Returns the transcribed text, detected language, and duration.
        Uses fp16=False to prevent hanging on CPU-only machines.
        """
        if not self._model:
            raise WhisperProcessingError("Model is not initialized.")

        try:
            logger.info(f"Starting transcription for {file_path}")
            start_time = time.time()

            # fp16=False is critical on CPU - prevents infinite hang
            # condition_on_previous_text=False speeds things up significantly
            result = self._model.transcribe(
                file_path,
                fp16=False,
                condition_on_previous_text=False,
                temperature=0,          # greedy decoding — fastest
                no_speech_threshold=0.6,
                logprob_threshold=-1.0,
            )

            processing_time = time.time() - start_time
            text = result.get("text", "").strip()

            # Whisper hallucinates stock phrases ("Thank you.", "Thanks for
            # watching.", etc.) on silent / near-silent audio. Suppress these so
            # the client can tell the user no speech was detected instead of
            # logging a bogus phrase.
            segments = result.get("segments", []) or []
            if segments:
                avg_no_speech = sum(
                    s.get("no_speech_prob", 0.0) for s in segments
                ) / len(segments)
                if avg_no_speech > 0.6:
                    logger.info(
                        f"Suppressing likely-silence transcription "
                        f"(avg no_speech_prob={avg_no_speech:.2f}): {text!r}"
                    )
                    text = ""

            if text and _is_hallucination(text):
                logger.info(f"Suppressing known hallucination phrase: {text!r}")
                text = ""

            logger.info(
                f"Transcription completed in {processing_time:.2f}s -> {text!r}"
            )

            return {
                "text": text,
                "language": result.get("language", "unknown"),
                "duration": processing_time
            }
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            raise WhisperProcessingError(str(e))
