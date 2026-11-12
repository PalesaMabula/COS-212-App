# COS212 · Graphs and BFS

A pre-lecture tutor app for COS212 students meeting **undirected, unweighted graphs and breadth-first search (BFS)** for the first time. Built for the COS750 (Educational Software Development) exam, University of Pretoria.

**One app, one address:** the Python server serves the course API *and* the React front end at **http://localhost:8000**.

| Part | Folder | Does |
|---|---|---|
| Back end | `backend/` | Python · FastAPI · SQLite. Course content (validated), BFS, code tracing, running the course's Python examples, practice questions, answer checking, saved progress, readiness report and My analysis. |
| Front end | `frontend/` | React · Vite · styled-components. Display only: it holds no course content or answers. |

No login: each browser gets an anonymous guest id.

## Run it

You need **Python 3.10+** and **Node.js 20+**.

**Windows (PowerShell / VS Code terminal), from this folder:**

```powershell
.\run.ps1
```

The first run sets everything up (Python virtual environment, packages, front-end build). Then open **http://localhost:8000**.
Next time, `.\run.ps1 -SkipBuild` starts faster if you haven't changed the front end.

**macOS / Linux:** `./run.sh`

### Useful addresses

- App: http://localhost:8000
- API docs (try every endpoint): http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

## Developing

Working on the front end with instant reload (two terminals):

```powershell
# terminal 1: back end
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000

# terminal 2: front end (opens http://localhost:5173, forwards /api to :8000)
cd frontend
npm run dev
```

Checks:

```powershell
cd backend;  python -m pytest -q     # 33 tests: content, BFS, answers, readiness rules, API
cd frontend; npm run lint            # ESLint
```

## Project layout

```
backend/
  app/
    main.py              FastAPI app: API routes, /docs, and serves frontend/dist at /
    db.py                SQLite storage per guest (data/cos212.db, created on first run)
    content/
      course.json        overview, modules, objectives (CS2023 levels), glossary, checklist
      modules/*.json     the 16 topics: goal, video scenes, notes, words, examples, code, labs, quizzes
      models.py          Pydantic schema: content is validated at start-up
      loader.py          loads + cross-checks content; strips answers before sending to the browser
    core/
      graph.py           campus graph, BFS frames, DFS, line-by-line code trace
      practice.py        endless practice generator (3 levels)
      runner.py          runs the course's own Python examples in a separate process
      checker.py         checks answers ("Not yet" feedback)
      analysis.py        readiness report (4.3) and My analysis
    routers/             content, graph, practice, learners (state, answers, report, analysis)
  tests/
frontend/
  src/
    api/                 client (status), sync (save to server), useApi, learner actions
    context/             Course (from server), Settings, Speech (read-aloud), Page
    components/shell/    sidebar, top bar, theme switch, solar system, error boundary
    components/dashboard/
    components/topic/    video player, scene drawings, campus map, IDE, labs, quizzes
    components/ui/       icons, buttons, pixel radio, wave checkbox, slider switch, astronaut
    pages/               Dashboard, Topic (any of the 16), Course overview, My analysis, Settings
run.ps1 / run.sh         one command to set up and run
```

## Editing course content

Edit `backend/app/content/modules/moduleN.json` and restart the server. If anything is inconsistent (an answer index out of range, a link to a topic that doesn't exist, a trace step past the end of BFS), the server refuses to start and says exactly what to fix. `pytest` also checks that every quiz answer about BFS matches the real algorithm and that every code example runs.

## Accessibility

- Every control is a real button, link or input with a label; touch targets are at least 44px; full keyboard use (skip link, arrow keys in the calendar and tabs, focus kept on the control you used).
- Nothing relies on colour alone: served = tick, waiting = clock and dashed border, right/"Not yet" in words.
- Text alternatives: captions and transcripts on every video, a live announcement per chapter, "the map in words".
- Read-aloud on every paragraph (`en-ZA`), voice answers (Chrome/Edge, typing always works), no timers on questions.
- Settings: text size, dyslexia and low-vision fonts, wide spacing, dark/light/high contrast, letter labels, slow or step-by-step animation, reduce motion (also follows the OS setting), captions, read-aloud speed.

## Saved data

Per guest on the server (and in the browser for offline use): `progress`, `topics`, `plans`, `todos`, `track`, `questions`, `settings`. `answers` is written by the server only. Settings → "Clear all my progress and data" removes everything.

## Placeholders

The lecture date "Thu 19 Nov" (`course.json`) is an example. Key-word translations are marked "to be checked".
