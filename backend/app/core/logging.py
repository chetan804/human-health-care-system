import json
import logging
from datetime import datetime, timezone


class JSONFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "service": "hcs-api",
                "level": record.levelname,
                "operation": record.getMessage(),
                **getattr(record, "safe_context", {}),
            }
        )


def configure_logging():
    logger = logging.getLogger("hcs")
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    return logger
