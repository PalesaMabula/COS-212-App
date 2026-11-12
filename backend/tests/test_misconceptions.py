"""Misconception tags (audit E04): content tagging, feedback, 'Try a similar one', and recording by objective + tag."""

import os
import tempfile
import uuid

import pytest
from pydantic import ValidationError

os.environ.setdefault("COS212_DB", os.path.join(tempfile.mkdtemp(), "mis.db"))

from fastapi.testclient import TestClient  # noqa: E402

from app import db  # noqa: E402
from app.content import loader  # noqa: E402
from app.content.models import TAGS, Question  # noqa: E402
from app.core.graph import ADJ, bfs_frames, hop_distances  # noqa: E402
from app.core.practice import SIMILAR, make_similar  # noqa: E402
from app.main import app  # noqa: E402

db.init_db()
client = TestClient(app)

# Wrong options that don't reflect any of the 9 misconceptions, left untagged on purpose
# (a forced tag would show students a wrong explanation). Adding a new one must be deliberate.
UNTAGGED_ON_PURPOSE = {
    ("1", "W1", 1), ("1", "W1", 2), ("1", "W2", 2), ("1", "W3", 0), ("1", "W5", 2),
    ("2", "1", 0), ("2", "1", 2), ("2", "1", 3), ("2", "2", 0), ("2", "2", 2), ("2", "2", 3),
    ("2", "3", 0), ("2", "3", 1), ("2", "3", 3), ("2", "4", 1), ("2", "4", 2), ("2", "4", 3), ("2", "5", 3),
    ("3", "1", 2), ("3", "1", 3), ("3", "2", 0), ("3", "5", 2),
    ("4", "R1", 0), ("4", "R1", 1), ("4", "R1", 3), ("4", "R2", 1), ("4", "R2", 3), ("4", "R6", 3),
}


def wrong_options():
    """Every wrong option in quizzes and traces: (topic, question, option index, tag)."""
    for t in loader.topics():
        for s in t.sections:
            if s.kind == "quiz":
                for q in s.questions:
                    if q.type == "choice":
                        for i in range(len(q.opts)):
                            if i != q.ans:
                                yield t.id, q.id, i, (q.tags[i] if q.tags else None)
            if s.kind == "trace":
                for n, st in enumerate(s.steps):
                    for i in range(len(st.opts)):
                        if i != st.ans:
                            yield t.id, f"step{n}", i, (st.tags[i] if st.tags else None)


def test_misconception_file_defines_every_tag_with_a_real_link():
    ms = loader.misconceptions()
    assert set(ms) == set(TAGS)
    ids = {t.id for t in loader.topics()}
    for m in ms.values():
        assert m.topic in ids and 1 <= m.objective <= 5


def test_every_wrong_option_is_tagged_or_listed_as_untagged_on_purpose():
    untagged = {(t, q, i) for t, q, i, tag in wrong_options() if tag is None}
    assert untagged == UNTAGGED_ON_PURPOSE
    assert sum(1 for *_, tag in wrong_options() if tag) == 26


def test_tags_must_be_known_and_never_on_the_right_option():
    with pytest.raises(ValidationError):
        Question(id="x", q="?", opts=["a", "b"], ans=0, tags=[None, "made_up"])
    with pytest.raises(ValidationError):
        Question(id="x", q="?", opts=["a", "b"], ans=0, tags=["fifo_lifo", None])
    with pytest.raises(ValidationError):
        Question(id="x", q="?", opts=["a", "b"], ans=0, tags=[None])


def test_tags_are_not_sent_to_the_browser():
    for t in loader.topics():
        text = str(loader.public_topic(t.id))
        assert "'tags'" not in text and "'tag'" not in text


def guest():
    return str(uuid.uuid4())


def answer(g, topic, section, q, **kw):
    return client.post(f"/api/learners/{g}/answers", json={"topic": topic, "section": section, "question": q, **kw}).json()


def test_wrong_answer_returns_explanation_link_and_tag():
    g = guest()
    r = answer(g, "3", "m3quiz", "1", choice=0)  # "A stack"
    m = r["misconception"]
    assert r["right"] is False and m["tag"] == "fifo_lifo"
    assert m["topic"] == "3" and m["go"] == "s02" and "first in, first out" in m["explain"]
    assert "misconception" not in answer(g, "3", "m3quiz", "1", choice=1)


def test_route_and_explain_answers_are_tagged_too():
    g = guest()
    assert answer(g, "4", "route", "1", text="A, B, A, C, D")["misconception"]["tag"] == "wrong_layer"
    answer(g, "4", "ready", "R4")  # reveal model
    assert answer(g, "4", "ready", "R4", rating=2)["misconception"]["tag"] == "mark_on_serve"


def test_warmup_shows_no_tag_but_logs_it():
    g = guest()
    r = answer(g, "1", "warmup", "W2", choice=1)
    assert r == {"right": None, "after": r["after"], "tries": 1}
    log = client.get(f"/api/learners/{g}/answers").json()["_log"]
    assert log[-1]["tag"] == "fifo_lifo" and log[-1]["source"] == "warmup"


# ----------------------------- similar questions -----------------------------


def test_similar_questions_are_valid_for_every_tag_and_seed():
    for tag in SIMILAR:
        for seed in range(1, 400):
            q = make_similar(tag, seed)
            assert len(q["opts"]) >= 2 and len(set(q["opts"])) == len(q["opts"]), (tag, seed)
            assert 0 <= q["ans"] < len(q["opts"])


def test_similar_answers_are_true_on_graph_a_to_f():
    for seed in range(1, 200):
        c = make_similar("count_places_not_edges", seed)
        route = c["q"].split("route ")[1].rstrip("?").split(" → ")
        assert c["opts"][c["ans"]] == f"{len(route) - 1} edges"
        w = make_similar("wrong_layer", seed)
        start = w["q"].split("BFS from ")[1].split(".")[0]
        a = w["opts"][w["ans"]]
        others = [o for o in w["opts"] if o in ADJ and o != a]
        assert all(hop_distances(ADJ, start)[a] < hop_distances(ADJ, start)[b] for b in others)
        f = make_similar("fifo_lifo", seed)
        if "BFS from" in f["q"]:
            start = f["q"].split("BFS from ")[1].split(".")[0]
            queue = f["q"].split("The queue is [")[1].split("] (front")[0].split(", ")
            assert queue in [fr["q"] for fr in bfs_frames(start)] and f["opts"][f["ans"]] == queue[0]


def test_similar_endpoint_hides_answer_and_records_by_objective_and_tag():
    g = guest()
    q = client.get("/api/practice/similar", params={"tag": "one_way_edge", "seed": 7}).json()
    assert "ans" not in q and q["tag"] == "one_way_edge"
    truth = make_similar("one_way_edge", 7)
    wrong = (truth["ans"] + 1) % len(truth["opts"])
    r = client.post(f"/api/learners/{g}/similar", json={"tag": "one_way_edge", "seed": 7, "choice": wrong}).json()
    assert r["right"] is False and r["feedback"].startswith("Not yet.")
    log = client.get(f"/api/learners/{g}/answers").json()["_log"][-1]
    assert log["objective"] == 2 and log["tag"] == "one_way_edge" and log["source"] == "similar"
    assert client.get("/api/practice/similar", params={"tag": "nope"}).status_code == 422


def test_analysis_shows_slips_by_concept_and_attempts_by_objective():
    g = guest()
    answer(g, "3", "m3quiz", "1", choice=0)  # fifo_lifo (Queues, objective 3)
    answer(g, "3", "m3quiz", "2", choice=2)  # fifo_lifo again
    answer(g, "2", "m2quiz", "5", choice=0)  # length_is_cost (Graphs, objective 1)
    a = client.get(f"/api/learners/{g}/analysis").json()
    assert a["slips"][0]["tag"] == "fifo_lifo" and a["slips"][0]["count"] == 2
    queues = next(c for c in a["concepts"] if c["name"] == "Queues")
    assert queues["slips"][0]["tag"] == "fifo_lifo" and queues["review"] == "3?go=s02"
    obj3 = next(o for o in a["goals"] if o["num"] == 3)
    assert obj3["attempts"] == {"right": 0, "total": 2}


def test_queue_game_mistakes_are_logged_with_a_tag():
    g = guest()
    r = client.post("/api/queue-game/move", json={"start": "A", "done": 1, "move": {"type": "serve", "place": "C"}, "learner": g}).json()
    assert r["misconception"]["tag"] == "fifo_lifo"
    log = client.get(f"/api/learners/{g}/answers").json()["_log"][-1]
    assert log["source"] == "queue" and log["tag"] == "fifo_lifo" and log["objective"] == 3
