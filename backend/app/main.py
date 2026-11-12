"""
COS212 Graphs and BFS: the application server (FastAPI).

One server, one address (http://localhost:8000):
    /api/...   course content, BFS, practice, saved progress, analysis (JSON)
    /docs      interactive API documentation
    /          the React front end (built files from ../frontend/dist)

Run from the backend folder:
    uvicorn app.main:app --reload --port 8000
"""

import os
import platform
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from . import db
from .content import loader
from .routers import content, graph, learners, practice

VERSION = "0.2.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    loader.load_all()  # stops start-up with a clear message if the content has a problem
    db.init_db()
    yield


app = FastAPI(
    title="COS212 · Graphs and BFS API",
    version=VERSION,
    description=(
        "Backend for the COS212 pre-lecture tutor app. Serves graph A–F, breadth-first "
        "search frames, the Python code-lab trace and endless practice questions, and saves each "
        "guest's progress (no login)."
    ),
    lifespan=lifespan,
)

# The React dev server and preview server may call the API directly.
# Add more origins (e.g. a hosted front end) with COS212_ORIGINS="https://a.com,https://b.com".
origins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://127.0.0.1:4173"]
origins += [o.strip() for o in os.environ.get("COS212_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])

app.include_router(content.router)
app.include_router(graph.router)
app.include_router(practice.router)
app.include_router(learners.router)


@app.get("/api/health", tags=["Health"], summary="Is the server running?")
def health():
    return {"status": "ok", "version": VERSION, "python": platform.python_version()}



# ---------------------------------------------------------------------------
# The front end. Mounted last so /api and /docs always win.
# ---------------------------------------------------------------------------
FRONTEND_DIST = Path(os.environ.get("COS212_FRONTEND", Path(__file__).resolve().parents[2] / "frontend" / "dist"))

if (FRONTEND_DIST / "index.html").exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
else:

    @app.get("/", include_in_schema=False, response_class=HTMLResponse)
    def frontend_missing():
        return (
            "<h1>COS212 server is running</h1>"
            "<p>The front end hasn't been built yet. In a terminal run:</p>"
            "<pre>cd frontend\nnpm install\nnpm run build</pre>"
            "<p>then restart this server. The API docs are at <a href='/docs'>/docs</a>.</p>"
        )
