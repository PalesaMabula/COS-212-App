"""Readiness wording, 'Retry this objective', and behaviour (not learning-style) wording (audit E03)."""

import os
import tempfile
import uuid

os.environ.setdefault("COS212_DB", os.path.join(tempfile.mkdtemp(), "retry.db"))

from fastapi.testclient import TestClient  # noqa: E402

from app import db  # noqa: E402
from app.content import loader  # noqa: E402
from app.core.practice import make_similar  # noqa: E402
from app.main import app  # noqa: E402

db.init_db()
client = TestClient(app)


def take_check(g, r3_choice=1):
    def a(q, **kw):
        client.post(f"/api/learners/{g}/answers", json={"topic": "4", "section": "ready", "question": q, **kw})

    a("R1", choice=2)
    a("R2", choice=0)
    a("R3", choice=r3_choice)  # 1 = "C, A, B, D, E" (wrong, wrong_layer)
    a("R4")
    a("R4", rating=0)
    a("R5", choice=1)
    a("R6", choice=1)


def objective(report, n):
    return next(o for o in report["objectives"] if o["num"] == n)


def test_report_says_ready_is_not_about_time():
    g = str(uuid.uuid4())
    take_check(g)
    r = client.get(f"/api/learners/{g}/report").json()
    assert r["note"] == "Ready is based on your answers, not on time spent."


def test_time_never_changes_readiness():
    g = str(uuid.uuid4())
    take_check(g)
    before = client.get(f"/api/learners/{g}/report").json()["objectives"]
    client.put(f"/api/learners/{g}/state/track", json={"value": {"modes": {"Watching": 99999}, "concepts": {"BFS": 99999}, "acc": {}, "days": {}}})
    after = client.get(f"/api/learners/{g}/report").json()["objectives"]
    assert before == after


def test_retry_right_marks_objective_ready():
    g = str(uuid.uuid4())
    take_check(g)
    report = client.get(f"/api/learners/{g}/report").json()
    assert objective(report, 3)["status"] == "Review" and objective(report, 3)["can_retry"]
    q = client.get(f"/api/learners/{g}/retry/3", params={"seed": 11}).json()
    assert q["tag"] == "wrong_layer" and "ans" not in q  # retries the mistake actually made in R3
    truth = make_similar("wrong_layer", 11)
    r = client.post(f"/api/learners/{g}/retry/3", json={"seed": 11, "choice": truth["ans"]}).json()
    assert r["right"] and r["ready"]
    o3 = objective(client.get(f"/api/learners/{g}/report").json(), 3)
    assert o3["status"] == "Ready" and o3["retried"] is True


def test_retry_wrong_keeps_review_and_explains():
    g = str(uuid.uuid4())
    take_check(g)
    truth = make_similar("wrong_layer", 5)
    r = client.post(f"/api/learners/{g}/retry/3", json={"seed": 5, "choice": (truth["ans"] + 1) % len(truth["opts"])}).json()
    assert r["right"] is False and r["feedback"].startswith("Not yet.") and r["misconception"]["tag"] == "wrong_layer"
    assert objective(client.get(f"/api/learners/{g}/report").json(), 3)["status"] == "Review"


def test_retry_unknown_objective():
    g = str(uuid.uuid4())
    assert client.get(f"/api/learners/{g}/retry/9").status_code == 404


def test_analysis_describes_behaviour_not_a_learning_style():
    for m in loader.course().analysis.modes.values():
        head, body = m.head, m.body
        assert head.startswith("You've spent most of your time")
        assert "learn a lot" not in head and " so " not in body
    g = str(uuid.uuid4())
    client.put(f"/api/learners/{g}/state/track", json={"value": {"modes": {"Listening": 600, "Coding": 5}, "concepts": {}, "acc": {}, "days": {}}})
    a = client.get(f"/api/learners/{g}/analysis").json()
    assert a["insight"]["head"] == "You've spent most of your time listening."
    assert a["insight"]["stretch"]  # stretch tip kept
