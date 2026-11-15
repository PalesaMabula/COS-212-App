"""
Loads and cross-checks the course content once, at start-up.

    course()          the course (overview, objectives, glossary, modules)
    topics()          every topic in course order
    topic(id)         one topic
    public_topic(id)  the same topic with answers removed (what the browser gets)
    question(...)     look up a question with its answer (for checking)
"""

import json
from functools import lru_cache
from pathlib import Path

from ..core.graph import ADJ, bfs_frames
from .models import Course, Misconception, ModuleFile, PartSection, QuizSection, Topic, TraceSection, TAGS

CONTENT = Path(__file__).resolve().parent

# Fields that would give the answer away. Removed before content is sent to the browser.
SECRET_FIELDS = {"ans", "accept", "ok", "no", "optFeedback", "model", "after", "tags", "tag"}


class ContentError(ValueError):
    pass


@lru_cache
def course() -> Course:
    return Course.model_validate_json((CONTENT / "course.json").read_text(encoding="utf-8"))


@lru_cache
def misconceptions() -> dict[str, Misconception]:
    raw = json.loads((CONTENT / "misconceptions.json").read_text(encoding="utf-8"))
    if set(raw) != set(TAGS):
        raise ContentError(f"misconceptions.json must define exactly these tags: {', '.join(TAGS)}")
    return {k: Misconception.model_validate(v) for k, v in raw.items()}


def misconception(tag: str | None) -> dict | None:
    """The explanation shown after a tagged wrong answer, with a link to the worked state."""
    if not tag:
        return None
    m = misconceptions()[tag]
    return {"tag": tag, **m.model_dump()}


@lru_cache
def _modules() -> tuple[ModuleFile, ...]:
    files = sorted((CONTENT / "modules").glob("module*.json"))
    mods = tuple(ModuleFile.model_validate_json(f.read_text(encoding="utf-8")) for f in files)
    _cross_check(mods)
    return mods


def topics() -> list[Topic]:
    return [t for m in _modules() for t in m.topics]


def topic(topic_id: str) -> Topic | None:
    return next((t for t in topics() if t.id == topic_id), None)


def module_of(topic_id: str) -> int:
    return int(topic_id.split(".")[0])


def parts(t: Topic) -> list[dict]:
    """The numbered sections of a module page, for the Learning guide and search."""
    return [{"id": s.id, "num": s.num, "title": s.title, "short": s.short} for s in t.sections if isinstance(s, PartSection)]


def topic_summaries() -> list[dict]:
    return [
        {"id": t.id, "module": module_of(t.id), "title": t.title, "type": t.type, "minutes": t.minutes,
         "outcome": t.outcome, "bloom": t.bloom, "concept": t.concept, "goal": t.goal, "parts": parts(t)}
        for t in topics()
    ]


def _strip(obj):
    if isinstance(obj, dict):
        return {k: _strip(v) for k, v in obj.items() if k not in SECRET_FIELDS}
    if isinstance(obj, list):
        return [_strip(v) for v in obj]
    return obj


def public_topic(topic_id: str) -> dict | None:
    t = topic(topic_id)
    if t is None:
        return None
    data = _strip(t.model_dump(exclude_none=True))
    ids = [x.id for x in topics()]
    i = ids.index(topic_id)
    data["module"] = module_of(topic_id)
    data["prev"] = ids[i - 1] if i > 0 else None
    data["nextId"] = ids[i + 1] if i + 1 < len(ids) else None
    return data


def find_section(topic_id: str, key: str):
    """A quiz (by quiz id) or trace (by trace id) inside a topic."""
    t = topic(topic_id)
    if t is None:
        return None
    for s in t.sections:
        if isinstance(s, QuizSection) and s.quiz == key:
            return s
        if isinstance(s, TraceSection) and s.trace == key:
            return s
    return None


def _cross_check(mods: tuple[ModuleFile, ...]) -> None:
    ids = [t.id for m in mods for t in m.topics]
    problems = []
    parts: dict[str, set[str]] = {}
    if len(ids) != len(set(ids)):
        problems.append("duplicate topic ids")
    for m in mods:
        for t in m.topics:
            if module_of(t.id) != m.num:
                problems.append(f"{t.id} is in module file {m.num}")
            for s in t.sections:
                if isinstance(s, QuizSection):
                    qids = [q.id for q in s.questions]
                    if len(qids) != len(set(qids)):
                        problems.append(f"{t.id}: duplicate question ids")
                    for q in s.questions:
                        if q.ans is not None and not 0 <= q.ans < len(q.opts):
                            problems.append(f"{t.id} {q.id}: answer index out of range")
                        if q.see and q.see not in ids:
                            problems.append(f"{t.id} {q.id}: links to missing topic {q.see}")
                        if q.type == "route" and (q.start not in ADJ or q.goal not in ADJ):
                            problems.append(f"{t.id} {q.id}: route start/goal must be vertices of graph A–F")
                        if q.optFeedback and len(q.optFeedback) != len(q.opts):
                            problems.append(f"{t.id} {q.id}: optFeedback must match opts")
                if isinstance(s, PartSection):
                    if s.id in parts.setdefault(t.id, set()):
                        problems.append(f"{t.id}: duplicate part id {s.id}")
                    parts[t.id].add(s.id)
                if isinstance(s, TraceSection):
                    if s.start not in ADJ:
                        problems.append(f"{t.id}: unknown start {s.start}")
                        continue
                    n = len(bfs_frames(s.start))
                    for i, st in enumerate(s.steps):
                        if not 0 <= st.ans < len(st.opts):
                            problems.append(f"{t.id} step {i}: answer index out of range")
                        if (st.frame if st.frame is not None else i) >= n:
                            problems.append(f"{t.id} step {i}: frame out of range")
    if problems:
        raise ContentError("Course content problems:\n  " + "\n  ".join(problems))


def quiz_by_mode(mode: str) -> tuple[str, QuizSection] | tuple[None, None]:
    """The first quiz with this mode (e.g. "warmup", "ready") and the topic it's in."""
    for t in topics():
        for s in t.sections:
            if isinstance(s, QuizSection) and s.mode == mode:
                return t.id, s
    return None, None


def _part_ids(topic_id: str) -> set[str]:
    t = topic(topic_id)
    return {p["id"] for p in parts(t)} if t else set()


def load_all() -> None:
    """Validate everything now (called at start-up)."""
    course()
    misconceptions()
    _modules()
    ids = [t.id for t in topics()]
    for k, m in misconceptions().items():
        if m.topic not in ids:
            raise ContentError(f"misconception {k} links to missing module {m.topic}")
        if m.go not in _part_ids(m.topic):
            raise ContentError(f"misconception {k} links to missing part {m.topic}?go={m.go}")

    a = course().analysis
    names = {c.name for c in a.concepts}
    problems = []
    for c in a.concepts:
        if c.topic not in ids:
            problems.append(f"analysis concept {c.name} links to missing module {c.topic}")
        elif c.go not in _part_ids(c.topic):
            problems.append(f"analysis concept {c.name} links to missing part {c.topic}?go={c.go}")
    for k, m in misconceptions().items():
        if m.concept not in names:
            problems.append(f"misconception {k} uses concept '{m.concept}', which isn't in analysis.concepts")
    objectives = {o.num for o in course().objectives}
    for k, m in misconceptions().items():
        if m.objective not in objectives:
            problems.append(f"misconception {k} points at missing objective {m.objective}")
    if quiz_by_mode("ready")[1] is None:
        problems.append("no quiz with mode \"ready\" (the lecture-ready check)")
    if problems:
        raise ContentError("Course content problems:\n  " + "\n  ".join(problems))
