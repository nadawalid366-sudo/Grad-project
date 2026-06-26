import logging
import sys

def setup_logger():
    """
    Configure and return the application logger.
    """
    logger = logging.getLogger("speech-to-text")
    logger.setLevel(logging.INFO)

    # Console handler with formatting
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)

    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    ch.setFormatter(formatter)

    if not logger.handlers:
        logger.addHandler(ch)

    return logger

logger = setup_logger()
