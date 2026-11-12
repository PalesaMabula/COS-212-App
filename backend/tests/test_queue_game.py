"""Be the Queue (3.4): every move is checked against the real BFS, mistakes are tagged."""

from fastapi.testclient import TestClient

from app.core.graph import ADJ, bfs
from app.core.queue_game import check_move, rounds
from app.main import app

client = TestClient(app)


def play_correctly(start):
    """Play a whole game with the right moves; return the ledger."""
    done, ledger = 0, []
    for r in rounds(start):
        s = check_move(start, done, {"type": "serve", "place": r["served"]})
        assert s["ok"], s
        hops = {p: r["after"]["hop"][p] for p in r["joined"]}
        parents = {p: r["served"] for p in r["joined"]}
        j = check_move(start, done, {"type": "join", "served": r["served"], "picked": r["joined"], "hops": hops, "parents": parents})
        assert j["ok"], j
        ledger.append(j["row"])
        done = j["done"]
    f = check_move(start, done, {"type": "finish"})
    assert f["ok"] and f["finished"]
    return ledger


def test_correct_run_from_every_start_matches_real_bfs():
    for start in ADJ:
        ledger = play_correctly(start)
        assert [row["served"] for row in ledger] == bfs(ADJ, start)
        assert ledger[-1]["queue_after"] == []


def test_ledger_from_cafe():
    ledger = play_correctly("B")
    assert [(r["served"], r["joined"], r["queue_after"]) for r in ledger] == [
        ("B", ["A", "D"], ["A", "D"]),
        ("A", ["C"], ["D", "C"]),
        ("D", [], ["C"]),
        ("C", ["E"], ["E"]),
        ("E", [], []),
    ]


def test_serving_the_newest_is_tagged_lifo():
    # From the A after one round the queue is B, Lab: serving the C is stack order.
    r = check_move("A", 1, {"type": "serve", "place": "C"})
    assert not r["ok"] and r["tag"] == "fifo_lifo"
    assert r["state"]["queue"] == ["B", "C"]  # nothing changed


def test_serving_a_place_not_waiting():
    r = check_move("A", 1, {"type": "serve", "place": "E"})
    assert r["tag"] == "not_in_queue"


def test_adding_an_already_served_place_is_duplicate():
    r = check_move("A", 1, {"type": "join", "served": "B", "picked": ["A", "D"]})
    assert r["tag"] == "duplicate"


def test_adding_a_waiting_place_is_mark_on_serve():
    # A → B served; queue is C, Gym. Serving Lab: D is already waiting.
    r = check_move("A", 2, {"type": "join", "served": "C", "picked": ["D", "E"]})
    assert r["tag"] == "mark_on_serve"


def test_adding_a_non_neighbour():
    r = check_move("A", 0, {"type": "join", "served": "A", "picked": ["B", "C", "E"]})
    assert r["tag"] == "non_neighbour"


def test_skipping_a_new_neighbour():
    r = check_move("A", 0, {"type": "join", "served": "A", "picked": ["B"]})
    assert r["tag"] == "skipped_neighbour" and "C" in r["message"]


def test_wrong_neighbour_order():
    r = check_move("A", 0, {"type": "join", "served": "A", "picked": ["C", "B"]})
    assert r["tag"] == "wrong_order" and "B, C" in r["message"]


def test_stopping_while_queue_not_empty():
    r = check_move("A", 2, {"type": "finish"})
    assert r["tag"] == "stopped_early"


def test_serving_when_queue_is_empty():
    assert check_move("F", 1, {"type": "serve", "place": "F"})["tag"] == "finish_missed"


def test_wrong_hop_and_wrong_parent():
    hop = check_move("A", 1, {"type": "join", "served": "B", "picked": ["D"], "hops": {"D": 1}})
    assert hop["tag"] == "wrong_hop" and "2 hops" in hop["message"]
    par = check_move("A", 1, {"type": "join", "served": "B", "picked": ["D"], "parents": {"D": "C"}})
    assert par["tag"] == "wrong_parent"


def test_join_message_names_the_vertices():
    r = check_move("B", 0, {"type": "join", "served": "B", "picked": ["A", "D"]})
    assert r["message"] == "Yes. A and D join the back."


def test_mistakes_say_not_yet():
    r = check_move("A", 1, {"type": "serve", "place": "C"})
    assert r["message"].startswith("Not yet.")


def test_api_round_trip():
    ok = client.post("/api/queue-game/move", json={"start": "B", "done": 0, "move": {"type": "serve", "place": "B"}}).json()
    assert ok["ok"] and ok["neighbours"] == ["A", "D"]
    bad = client.post("/api/queue-game/move", json={"start": "Mall", "done": 0, "move": {"type": "finish"}})
    assert bad.status_code == 422
