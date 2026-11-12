"""Answer checking, the warm-up (no marks), and the readiness rules."""

import os
import tempfile
import uuid

os.environ["COS212_DB"] = os.path.join(tempfile.mkdtemp(), "answers.db")

from fastapi.testclient import TestClient  # noqa: E402

from app import db  # noqa: E402
from app.content import loader  # noqa: E402
from app.main import app  # noqa: E402

db.init_db()
client = TestClient(app)


def new_guest():
    return str(uuid.uuid4())


def ans(guest, topic, section, question, **kw):
    return client.post(f"/api/learners/{guest}/answers", json={"topic": topic, "section": section, "question": question, **kw})


def test_choice_feedback_says_not_yet():
    with TestClient(app):
        g = new_guest()
        r = ans(g, "2", "m2quiz", "2", choice=0).json()
        assert r["right"] is False and r["feedback"].startswith("B's list")
        assert ans(g, "2", "m2quiz", "2", choice=1).json()["right"] is True


def test_route_answer_accepts_letters_in_any_style():
    g = new_guest()
    assert ans(g, "4", "route", "1", text="a, b, d").json()["right"] is True
    assert ans(g, "4", "route", "1", text="ACD").json()["right"] is True
    assert ans(g, "4", "route", "1", text="A, D").json()["right"] is False


def test_warmup_shows_no_mark_but_records_it():
    g = new_guest()
    r = ans(g, "1", "warmup", "W1", choice=0).json()
    assert r["right"] is None and "Module 2" in r["after"]
    saved = client.get(f"/api/learners/{g}/answers").json()
    assert saved["warmup"]["W1"]["first"]["right"] is True


def test_explain_reveals_model_then_records_rating():
    g = new_guest()
    first = ans(g, "4", "ready", "R4").json()
    assert "found set" in first["model"]
    assert ans(g, "4", "ready", "R4", rating=0).json()["right"] is True


def test_browser_cannot_write_answers():
    g = new_guest()
    assert client.put(f"/api/learners/{g}/state/answers", json={"value": {}}).status_code == 404


def test_readiness_report_rules():
    """Warm-up 2 of 6 → now 5 of 6. Ready = right; Review = not right yet. No confidence ratings."""
    g = new_guest()
    warm = {"W1": 0, "W2": 0, "W3": 0, "W4": 1, "W5": 1, "W6": 0}  # W1, W2 right
    for q, c in warm.items():
        ans(g, "1", "warmup", q, choice=c)
    ans(g, "4", "ready", "R1", choice=2)
    ans(g, "4", "ready", "R2", choice=0)
    ans(g, "4", "ready", "R3", choice=1)  # wrong
    ans(g, "4", "ready", "R4", rating=0)
    ans(g, "4", "ready", "R5", choice=1)
    ans(g, "4", "ready", "R6", choice=1)
    r = client.get(f"/api/learners/{g}/report").json()
    status = {i["id"]: i["status"] for i in r["items"]}
    assert status == {"R1": "Ready", "R2": "Ready", "R3": "Review", "R4": "Ready", "R5": "Ready", "R6": "Ready"}
    assert r["comparison"] == "Warm-up: 2 of 6. Now: 5 of 6."
    objs = {o["num"]: o["status"] for o in r["objectives"]}
    assert objs == {1: "Ready", 2: "Ready", 3: "Review", 4: "Ready", 5: "Ready"}
    assert all("conf" not in i for i in r["items"])


def test_analysis_uses_sample_until_there_is_data():
    g = new_guest()
    a = client.get(f"/api/learners/{g}/analysis").json()
    assert a["sample"] is True and a["top"] == "Listening"
    client.put(f"/api/learners/{g}/state/track", json={"value": {"modes": {"Coding": 300}, "concepts": {"BFS": 300}, "acc": {}, "days": {}}})
    a = client.get(f"/api/learners/{g}/analysis").json()
    assert a["sample"] is False and a["top"] == "Coding"


def _code_section(topic_id):
    return next(i for i, s in enumerate(loader.topic(topic_id).sections) if s.kind == "code")


def test_run_only_course_code():
    i = _code_section("2")
    r = client.post("/api/topics/2/run", json={"section": i, "task": 0}).json()
    assert r["output"] == "[]" and r["answer"] == "[]"
    assert client.post("/api/topics/2/run", json={"section": 0}).status_code == 422


def test_practice_check_records_and_never_trusts_the_browser():
    from app.core import quizgen

    g = new_guest()
    r = quizgen.practice_round(3, 77)
    q = r["questions"][0]
    right = {"choice": q["ans"]} if q["type"] == "mcq" else {"text": q["answer"]}
    res = client.post(f"/api/learners/{g}/practice/check", json={"module": "3", "seed": 77, "index": 0, **right}).json()
    assert res["right"] is True and res["explain"]
    log = client.get(f"/api/learners/{g}/answers").json()["_log"]
    assert log[-1]["source"] == "practice" and log[-1]["right"] is True


def test_full_quiz_submit_scores_by_module_and_keeps_history():
    from app.core import quizgen

    g = new_guest()
    r = quizgen.full_quiz(31)
    answers = [({"choice": q["ans"]} if q["type"] == "mcq" else {"text": q["answer"]}) for q in r["questions"]]
    answers[0] = {}  # one left blank
    res = client.post(f"/api/learners/{g}/quiz/submit", json={"seed": 31, "answers": answers}).json()
    assert res["score"] == 14 and res["of"] == 15
    assert [m["of"] for m in res["byModule"]] == [4, 6, 5]
    assert res["results"][0]["blank"] is True
    assert client.get(f"/api/learners/{g}/quiz/history").json()[0]["score"] == 14
    bad = client.post(f"/api/learners/{g}/quiz/submit", json={"seed": 31, "answers": []})
    assert bad.status_code == 422
