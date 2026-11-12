"""
Attempt log: every checked attempt with its objective and misconception tag.
Kept per guest in the server-only "answers" record (key "_log"), newest last.
Used by My analysis for "Concept by concept", objective stats and review links.
"""

import time
import uuid

from . import db

LOG_LIMIT = 1000  # attempts kept per guest (oldest dropped)


def valid_id(learner_id: str) -> str:
    """Normalise an anonymous guest id; raises ValueError if it isn't a UUID."""
    return str(uuid.UUID(learner_id))


def log_attempt(learner_id: str, entry: dict) -> None:
    answers = db.get_one(learner_id, "answers") or {}
    log = answers.setdefault("_log", [])
    log.append(entry | {"at": time.time()})
    del log[:-LOG_LIMIT]
    db.put(learner_id, "answers", answers)
