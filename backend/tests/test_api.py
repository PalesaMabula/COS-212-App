"""API tests using a temporary database."""

import os
import tempfile
import uuid

os.environ["COS212_DB"] = os.path.join(tempfile.mkdtemp(), "test.db")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)
GUEST = str(uuid.uuid4())


def test_health():
    with TestClient(app) as c:
        r = c.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_bfs_endpoint():
    r = client.get("/api/bfs", params={"start": "A"})
    assert r.json()["order"] == ["A", "B", "C", "D", "E"]


def test_unknown_place_is_rejected():
    assert client.get("/api/bfs", params={"start": "Mall"}).status_code == 422


def test_code_trace_endpoint():
    r = client.get("/api/code", params={"start": "E"}).json()
    assert r["source"][-1] == 'print(bfs(graph, "E"))'
    assert r["frames"][-1]["out"] == "['E', 'C', 'A', 'D', 'B']"


def test_practice_round_endpoint_hides_answers():
    r = client.get("/api/practice/round", params={"module": "3", "seed": 99}).json()
    assert len(r["questions"]) == 5 and all(q["mod"] == 3 for q in r["questions"])
    assert all("ans" not in q and "answer" not in q for q in r["questions"])
    assert client.get("/api/practice/round", params={"module": "9"}).status_code == 422


def test_full_quiz_endpoint():
    r = client.get("/api/quiz/full", params={"seed": 5}).json()
    assert len(r["questions"]) == 15 and r["graph"]["listText"]


def test_save_and_load_progress():
    with TestClient(app) as c:
        assert c.put(f"/api/learners/{GUEST}/state/progress", json={"value": {"watched": True}}).status_code == 200
        assert c.get(f"/api/learners/{GUEST}/state").json()["progress"]["value"] == {"watched": True}
        assert c.delete(f"/api/learners/{GUEST}/state/progress").json()["deleted"] == 1


def test_bad_key_and_bad_id():
    with TestClient(app) as c:
        assert c.put(f"/api/learners/{GUEST}/state/password", json={"value": 1}).status_code == 404
        assert c.get("/api/learners/not-a-uuid/state").status_code == 422
