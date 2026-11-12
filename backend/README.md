# COS212 back end (Python · FastAPI)

The application server. It holds and validates the course content, runs BFS and the course's Python examples, checks answers, works out the readiness report and My analysis, saves each guest's progress in SQLite, and serves the built React front end. No login: the browser sends an anonymous id.

The easiest way to run everything is `..\run.ps1` from the project folder. The steps below are for working on the back end on its own.

## First-time setup (Windows, VS Code terminal)

Needs **Python 3.10 or newer** (`python --version`).

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Run it

```powershell
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

- API docs (try every endpoint in the browser): http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

## Run the tests

```powershell
python -m pytest -q
```

## Endpoints

| Method | Path | What |
|---|---|---|
| GET | `/api/health` | server status |
| GET | `/api/course` | overview, modules, topic list, objectives, glossary, checklist |
| GET | `/api/topics/{id}` | one topic, ready to display (answers removed) |
| POST | `/api/topics/{id}/run` | run a code example from that topic |
| POST | `/api/graph/neighbours-check` | check a "name the neighbours" answer |
| POST | `/api/learners/{id}/answers` | check and record an answer |
| GET | `/api/learners/{id}/report` | readiness report (after 4.3) |
| GET | `/api/learners/{id}/analysis` | My analysis |
| GET | `/api/graph` | campus graph, positions, edges, graph in words |
| GET | `/api/bfs?start=Library` | BFS order and one frame per serve |
| GET | `/api/code?start=Library` | Python source lines and a line-by-line trace |
| GET | `/api/practice?level=1&seed=123` | a practice question (0 Warm-up, 1 Standard, 2 Challenge) |
| GET | `/api/learners/{id}/state` | everything saved for a guest |
| PUT | `/api/learners/{id}/state/{key}` | save one part (`progress`, `topics`, `plans`, `todos`, `track`, `questions`, `settings`) |
| DELETE | `/api/learners/{id}/state/{key}` | clear one part |
| DELETE | `/api/learners/{id}` | clear everything for a guest |

## Layout

See the main README in the project folder.
