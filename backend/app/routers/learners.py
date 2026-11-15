"""
Saved student data for an anonymous guest id (no login, no personal details).
The browser keeps its own copy too, so the app still works if the server is off.
"""

import random
import time
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel

from .. import db
from ..content import loader
from ..content.models import ExplainSection, Question, QuizSection, TraceSection
from ..core import analysis as an
from ..core.checker import check_question, check_step
from ..core import quizgen
from ..core.practice import make_similar
from ..attempts import log_attempt

router = APIRouter(prefix="/api/learners", tags=["Saved progress"])


class StateIn(BaseModel):
    value: Any


def _id(learner_id: str) -> str:
    try:
        return str(uuid.UUID(learner_id))
    except ValueError:
        raise HTTPException(status_code=422, detail="learner_id must be a UUID")


def _key(key: str) -> str:
    if key not in db.ALLOWED_KEYS:
        raise HTTPException(status_code=404, detail=f"Unknown key. Use one of: {', '.join(sorted(db.ALLOWED_KEYS))}")
    return key


@router.get("/{learner_id}/state", summary="Everything saved for this guest")
def get_state(learner_id: str = Path(description="Anonymous guest id (UUID)")):
    return db.get_all(_id(learner_id))


@router.get("/{learner_id}/state/{key}", summary="One saved part")
def get_key(learner_id: str, key: str):
    value = db.get_one(_id(learner_id), _key(key))
    if value is None:
        raise HTTPException(status_code=404, detail="Nothing saved yet")
    return {"value": value}


@router.put("/{learner_id}/state/{key}", summary="Save one part")
def put_key(learner_id: str, key: str, body: StateIn):
    try:
        updated = db.put(_id(learner_id), _key(key), body.value)
    except ValueError as e:
        raise HTTPException(status_code=413, detail=str(e))
    return {"ok": True, "updated": updated}


@router.delete("/{learner_id}/state/{key}", summary="Clear one part (e.g. tracked time)")
def delete_key(learner_id: str, key: str):
    return {"deleted": db.delete(_id(learner_id), _key(key))}


START_OVER_KEYS = ("topics", "progress", "answers")


@router.post("/{learner_id}/start-over", summary="Start the course again: clear progress, answers and quiz history (keeps name, settings, plans)")
def start_over(learner_id: str):
    lid = _id(learner_id)
    return {"cleared": [k for k in START_OVER_KEYS if db.delete(lid, k)]}


@router.delete("/{learner_id}", summary="Clear everything for this guest")
def delete_learner(learner_id: str):
    return {"deleted": db.delete(_id(learner_id))}


# ------------------------------- answers -------------------------------


class AnswerIn(BaseModel):
    topic: str
    section: str  # quiz id, trace id or explain id
    question: str  # question id, or step number for traces
    choice: int | None = None
    text: str | None = None
    conf: int | None = None  # 0 Guessing, 1 Unsure, 2 Sure
    rating: int | None = None  # explain questions: 0 Got it, 1 Partly, 2 Not yet


def _find(topic_id: str, key: str):
    t = loader.topic(topic_id)
    if t is None:
        return None
    for s in t.sections:
        if isinstance(s, (QuizSection, TraceSection)) and key in (getattr(s, "quiz", None), getattr(s, "trace", None)):
            return s
        if isinstance(s, ExplainSection) and s.id == key:
            return s
    return None


@router.post("/{learner_id}/answers", summary="Check an answer and record it")
def answer(learner_id: str, body: AnswerIn):
    """Checks against the course content on the server. The first try and the latest try are kept."""
    lid = _id(learner_id)
    s = _find(body.topic, body.section)
    if s is None:
        raise HTTPException(status_code=404, detail="No such quiz, trace or explain section")
    try:
        objective, concept = None, loader.topic(body.topic).concept
        if isinstance(s, TraceSection):
            i = int(body.question)
            if not 0 <= i < len(s.steps):
                raise HTTPException(status_code=404, detail="No such step")
            result = check_step(s.steps[i], body.choice if body.choice is not None else -1)
            store_key, qid = f"trace:{s.trace}", str(i)
            objective = 3
        elif isinstance(s, ExplainSection):
            q = Question(id="1", type="explain", q=s.q, model=s.model, concept=s.concept)
            result = check_question(q, rating=body.rating)
            store_key, qid = f"explain:{s.id}", "1"
            objective, concept = 4, s.concept
        else:
            q = next((q for q in s.questions if q.id == body.question), None)
            if q is None:
                raise HTTPException(status_code=404, detail="No such question")
            result = check_question(q, body.choice, body.text, body.rating)
            store_key, qid = s.quiz, q.id
            objective, concept = q.objective, q.concept or concept
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # An explain question with no rating yet only reveals the model answer.
    if result.get("model") is not None and body.rating is None:
        return result

    tag = result.get("tag")
    rec = {"right": result["right"], "conf": body.conf, "choice": body.choice, "rating": body.rating, "tag": tag, "at": time.time()}
    warmup = isinstance(s, QuizSection) and s.mode == "warmup"
    # Warm-up: no marks. The result is recorded (for the 4.3 comparison) but only the neutral line is shown.
    if warmup:
        result = {"right": None, "after": result.get("after")}
    elif tag:
        result = result | {"misconception": loader.misconception(tag)}

    answers = db.get_one(lid, "answers") or {}
    group = answers.setdefault(store_key, {})
    old = group.get(qid)
    group[qid] = {"first": old["first"] if old else rec, "last": rec, "tries": (old["tries"] + 1) if old else 1}
    db.put(lid, "answers", answers)
    log_attempt(lid, {"source": "warmup" if warmup else "quiz", "topic": body.topic, "section": store_key, "q": qid,
                      "objective": objective, "concept": concept, "tag": tag, "right": rec["right"], "first": old is None})
    return result | {"tries": group[qid]["tries"]}


@router.get("/{learner_id}/answers", summary="Every recorded answer (first and latest try)")
def get_answers(learner_id: str):
    return db.get_one(_id(learner_id), "answers") or {}


@router.get("/{learner_id}/report", summary="Readiness report (after the lecture-ready check)")
def report(learner_id: str):
    lid = _id(learner_id)
    r = an.readiness(db.get_one(lid, "answers") or {}, db.get_one(lid, "questions"))
    if r is None:
        raise HTTPException(status_code=404, detail="The lecture-ready check (4.3) hasn't been answered yet")
    return r


@router.get("/{learner_id}/analysis", summary="My analysis: time, accuracy, suggestions, plan")
def get_analysis(learner_id: str):
    lid = _id(learner_id)
    state = {k: v["value"] for k, v in db.get_all(lid).items()}
    return an.analysis(state, state.get("answers") or {})


# ------------------------- "Try a similar one" -------------------------


class SimilarIn(BaseModel):
    tag: str
    seed: int
    choice: int


@router.post("/{learner_id}/similar", summary="Check a 'Try a similar one' answer and record it")
def similar(learner_id: str, body: SimilarIn):
    lid = _id(learner_id)
    try:
        q = make_similar(body.tag, body.seed)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if not 0 <= body.choice < len(q["opts"]):
        raise HTTPException(status_code=422, detail="choose one of the options")
    right = body.choice == q["ans"]
    m = loader.misconception(body.tag)
    log_attempt(lid, {"source": "similar", "topic": m["topic"], "section": f"similar:{body.tag}", "q": str(body.seed),
                      "objective": m["objective"], "concept": m["concept"], "tag": None if right else body.tag, "practised": body.tag,
                      "right": right, "first": True})
    return {"right": right, "answer": q["opts"][q["ans"]], "why": q["why"],
            "feedback": ("Yes. " if right else "Not yet. ") + q["why"]}


# ------------------------- "Retry this objective" -------------------------


class RetryIn(BaseModel):
    seed: int
    choice: int
    conf: int | None = None


@router.get("/{learner_id}/retry/{objective}", summary="A fresh question for an objective marked Review")
def retry_question(learner_id: str, objective: int, seed: int | None = None):
    lid = _id(learner_id)
    if objective not in an.objective_tags():
        raise HTTPException(status_code=404, detail="No such objective")
    tag = an.retry_tag(objective, db.get_one(lid, "answers") or {})
    q = make_similar(tag, seed or random.randint(1, 233279))
    return {"objective": objective, "tag": tag, "seed": q["seed"], "q": q["q"], "opts": q["opts"]}


@router.post("/{learner_id}/retry/{objective}", summary="Check a retry; a right answer marks the objective Ready")
def retry_answer(learner_id: str, objective: int, body: RetryIn):
    lid = _id(learner_id)
    if objective not in an.objective_tags():
        raise HTTPException(status_code=404, detail="No such objective")
    answers = db.get_one(lid, "answers") or {}
    tag = an.retry_tag(objective, answers)
    q = make_similar(tag, body.seed)
    if not 0 <= body.choice < len(q["opts"]):
        raise HTTPException(status_code=422, detail="choose one of the options")
    right = body.choice == q["ans"]
    retries = answers.setdefault("retry", {})
    retries[str(objective)] = {"right": right, "tag": tag, "seed": body.seed, "conf": body.conf, "at": time.time()}
    db.put(lid, "answers", answers)
    log_attempt(lid, {"source": "retry", "topic": "4.3", "section": f"retry:{objective}", "q": str(body.seed),
                      "objective": objective, "concept": loader.misconception(tag)["concept"],
                      "tag": None if right else tag, "right": right, "first": False})
    return {"right": right, "feedback": ("Yes. " if right else "Not yet. ") + q["why"],
            "ready": right, "misconception": None if right else loader.misconception(tag)}


# ------------------------- Practice and the Full quiz -------------------------


class PracticeIn(BaseModel):
    module: str
    seed: int
    index: int
    choice: int | None = None
    text: str | None = None


def _round_module(module: str):
    if module == "mix":
        return "mix"
    if module in ("2", "3", "4"):
        return int(module)
    raise HTTPException(status_code=422, detail="module must be 2, 3, 4 or mix")


def _log_generated(lid: str, source: str, seed: int, q: dict, result: dict) -> None:
    log_attempt(lid, {"source": source, "topic": q["link"]["module"], "section": f"{source}:{seed}", "q": str(q["i"]),
                      "objective": quizgen.KIND_OBJECTIVE[q["kind"]], "concept": quizgen.CONCEPT[q["mod"]],
                      "kind": q["kind"], "tag": result["tag"], "right": result["right"], "first": True})


@router.post("/{learner_id}/practice/check", summary="Check one practice answer and record it")
def practice_check(learner_id: str, body: PracticeIn):
    lid = _id(learner_id)
    r = quizgen.practice_round(_round_module(body.module), body.seed)
    if not 0 <= body.index < len(r["questions"]):
        raise HTTPException(status_code=404, detail="No such question")
    q = r["questions"][body.index]
    try:
        result = quizgen.check(q, r["graph"], body.choice, body.text)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    _log_generated(lid, "practice", body.seed, q, result)
    if result["tag"]:
        result = result | {"misconception": loader.misconception(result["tag"])}
    return result


class QuizAnswer(BaseModel):
    choice: int | None = None
    text: str | None = None


class QuizIn(BaseModel):
    seed: int
    answers: list[QuizAnswer]


@router.post("/{learner_id}/quiz/submit", summary="Mark a whole Full quiz and record it")
def quiz_submit(learner_id: str, body: QuizIn):
    lid = _id(learner_id)
    r = quizgen.full_quiz(body.seed)
    if len(body.answers) != len(r["questions"]):
        raise HTTPException(status_code=422, detail=f"send one answer per question ({len(r['questions'])})")
    results = []
    for q, a in zip(r["questions"], body.answers):
        blank = a.choice is None and not (a.text or "").strip()
        if blank:
            res = {"right": False, "answer": q["opts"][q["ans"]] if q["type"] == "mcq" else q["answer"],
                   "explain": q["explain"], "tag": None, "blank": True}
        else:
            try:
                res = quizgen.check(q, r["graph"], a.choice, a.text)
            except ValueError as e:
                raise HTTPException(status_code=422, detail=f"question {q['i'] + 1}: {e}")
            _log_generated(lid, "fullquiz", body.seed, q, res)
        results.append(res | {"i": q["i"], "link": q["link"]})
    by_mod = []
    for m, name in ((2, "Module 2 · Graphs"), (3, "Module 3 · BFS"), (4, "Module 4 · Shortest routes")):
        idx = [q["i"] for q in r["questions"] if q["mod"] == m]
        ok = sum(results[i]["right"] for i in idx)
        by_mod.append({"module": m, "name": name, "right": ok, "of": len(idx), "ready": ok / len(idx) >= 0.75})
    score = sum(x["right"] for x in results)
    answers = db.get_one(lid, "answers") or {}
    answers.setdefault("_quizzes", []).append({"seed": body.seed, "score": score, "of": len(results), "at": time.time()})
    db.put(lid, "answers", answers)
    return {"score": score, "of": len(results), "results": results, "byModule": by_mod}


@router.get("/{learner_id}/quiz/history", summary="Past Full quiz scores")
def quiz_history(learner_id: str):
    return (db.get_one(_id(learner_id), "answers") or {}).get("_quizzes", [])