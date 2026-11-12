"""
Storage: one small SQLite file (backend/data/cos212.db), created on first run.

There is no login. The browser makes an anonymous guest id (a random UUID) and
saves each part of the student's data under a key, for example:
    progress   lecture-ready checklist ticks
    plans      study calendar
    todos      to-do list
    track      study time by way of learning, answers per concept
    questions  questions to bring to the lecture
    settings   accessibility and display settings
    topics     topics finished
    profile    the name the student chose to show (optional)
    answers    every checked answer (written by the server only)
Values are stored as JSON text, exactly as the browser sends them.
"""

import json
import os
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(os.environ.get("COS212_DB", Path(__file__).resolve().parent.parent / "data" / "cos212.db"))

# Keys the browser may save (it keeps its own copy too).
ALLOWED_KEYS = {"progress", "plans", "todos", "track", "questions", "settings", "topics", "profile"}
# Keys only the server writes (checked answers), so the browser can't mark itself right.
SERVER_KEYS = {"answers"}
MAX_VALUE_BYTES = 200_000

SCHEMA = """
CREATE TABLE IF NOT EXISTS learner_state (
    learner_id TEXT NOT NULL,
    key        TEXT NOT NULL,
    value      TEXT NOT NULL,
    updated    REAL NOT NULL,
    PRIMARY KEY (learner_id, key)
);
"""


@contextmanager
def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    try:
        yield con
        con.commit()
    finally:
        con.close()


def init_db() -> None:
    with connect() as con:
        con.executescript(SCHEMA)


def get_all(learner_id: str) -> dict:
    with connect() as con:
        rows = con.execute("SELECT key, value, updated FROM learner_state WHERE learner_id = ?", (learner_id,)).fetchall()
    return {k: {"value": json.loads(v), "updated": u} for k, v, u in rows}


def get_one(learner_id: str, key: str):
    with connect() as con:
        row = con.execute("SELECT value FROM learner_state WHERE learner_id = ? AND key = ?", (learner_id, key)).fetchone()
    return json.loads(row[0]) if row else None


def put(learner_id: str, key: str, value) -> float:
    text = json.dumps(value, ensure_ascii=False)
    if len(text.encode()) > MAX_VALUE_BYTES:
        raise ValueError("That value is too large to save.")
    now = time.time()
    with connect() as con:
        con.execute(
            "INSERT INTO learner_state (learner_id, key, value, updated) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(learner_id, key) DO UPDATE SET value = excluded.value, updated = excluded.updated",
            (learner_id, key, text, now),
        )
    return now


def delete(learner_id: str, key: str | None = None) -> int:
    with connect() as con:
        if key is None:
            cur = con.execute("DELETE FROM learner_state WHERE learner_id = ?", (learner_id,))
        else:
            cur = con.execute("DELETE FROM learner_state WHERE learner_id = ? AND key = ?", (learner_id, key))
        return cur.rowcount
