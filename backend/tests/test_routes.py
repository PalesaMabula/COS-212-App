"""BFS queue states, hop distances, fewest-hops routes and route checking (audit E02, E06)."""

import os
import tempfile
import uuid

os.environ.setdefault("COS212_DB", os.path.join(tempfile.mkdtemp(), "routes.db"))

from fastapi.testclient import TestClient  # noqa: E402

from app import db  # noqa: E402
from app.core.checker import check_route, check_route_list, parse_route  # noqa: E402
from app.core.graph import ADJ, all_shortest_paths, bfs_frames, bfs_path, hop_distances, is_shortest_route  # noqa: E402
from app.main import app  # noqa: E402

db.init_db()
client = TestClient(app)

# A second small graph with a triangle (so a 3-hop route can lose to a 2-hop one)
# and deliberately "unsorted" neighbour lists.
TRI = {
    "A": ["C", "B"],
    "B": ["A", "C"],
    "C": ["D", "B", "A"],
    "D": ["C"],
}


# ------------------------------- BFS states -------------------------------


def test_queue_after_each_serve_from_library():
    queues = [f["q"] for f in bfs_frames("A")]
    assert queues[1] == ["B", "C"]
    assert queues[2] == ["C", "D"]
    assert queues[3] == ["D", "E"]
    assert queues[-1] == []


def test_hops_from_library():
    want = {"A": 0, "B": 1, "C": 1, "D": 2, "E": 2}
    assert hop_distances(ADJ, "A") == want
    assert bfs_frames("A")[-1]["hop"] == want


def test_start_at_clinic_reaches_only_clinic():
    assert hop_distances(ADJ, "F") == {"F": 0}
    assert bfs_frames("F")[-1]["order"] == ["F"]
    assert bfs_path(ADJ, "F", "A") is None


# --------------------------------- routes ---------------------------------


def test_same_start_and_goal_is_a_zero_hop_path():
    assert bfs_path(ADJ, "A", "A") == ["A"]
    assert all_shortest_paths(ADJ, "A", "A") == [["A"]]


def test_unreachable_goal_is_none():
    assert bfs_path(ADJ, "A", "F") is None
    assert all_shortest_paths(ADJ, "A", "F") == []


def test_library_to_gym_has_two_tied_routes():
    assert all_shortest_paths(ADJ, "A", "D") == [["A", "B", "D"], ["A", "C", "D"]]
    # bfs_path returns whichever it found first (list order: B before C), as 4.1 says.
    assert bfs_path(ADJ, "A", "D") == ["A", "B", "D"]


def test_bfs_path_matches_the_4_1_code_output():
    assert bfs_path(ADJ, "B", "E") == ["B", "A", "C", "E"]
    assert bfs_path(ADJ, "A", "E") == ["A", "C", "E"]


def test_every_bfs_path_is_a_shortest_route():
    for a in ADJ:
        for b in ADJ:
            p = bfs_path(ADJ, a, b)
            if p is not None:
                assert is_shortest_route(ADJ, p, a, b)
                assert p in all_shortest_paths(ADJ, a, b)


def test_second_graph_with_different_neighbour_order():
    assert hop_distances(TRI, "A") == {"A": 0, "C": 1, "B": 1, "D": 2}
    assert bfs_path(TRI, "A", "D") == ["A", "C", "D"]
    assert all_shortest_paths(TRI, "A", "D") == [["A", "C", "D"]]
    # Reordering every neighbour list must not change any distance.
    flipped = {k: list(reversed(v)) for k, v in TRI.items()}
    for s in TRI:
        assert hop_distances(flipped, s) == hop_distances(TRI, s)


# ------------------------------ route checker ------------------------------


def test_parse_route_understands_typed_and_spoken_answers():
    assert parse_route("a -> b -> d") == ["A", "B", "D"]
    assert parse_route("From A to C, then D") == ["A", "C", "D"]
    assert parse_route("A, C, E") == ["A", "C", "E"]
    assert parse_route("ACE") == ["A", "C", "E"]


def test_checker_accepts_both_tied_routes():
    a = check_route("A, B, D", "A", "D")
    b = check_route("a → c → d", "A", "D")
    assert a["right"] and b["right"]
    assert "Another route ties" in a["feedback"]


def test_checker_rejects_longer_walk_on_campus():
    # No 3-edge A→D route exists on graph A–F (it has no odd cycles),
    # so the longer walk to reject here is 4 edges.
    r = check_route("A, B, A, C, D", "A", "D")
    assert r["right"] is False and "4 edges" in r["feedback"]


def test_checker_rejects_a_3_hop_route_when_2_is_possible():
    """On the triangle graph A→D is 2 hops (A, C, D); the 3-hop A, B, C, D is a real walk but not shortest."""
    assert check_route_list(["A", "C", "D"], "A", "D", TRI)["right"] is True
    r = check_route_list(["A", "B", "C", "D"], "A", "D", TRI)
    assert r["right"] is False and "3 edges" in r["feedback"] and "one with 2" in r["feedback"]


def test_unreachable_route_answer():
    assert check_route("none", "A", "F")["right"] is True
    assert check_route("A, C, F", "A", "F")["right"] is False


def test_checker_rejects_non_edges_and_wrong_ends():
    assert "aren't joined" in check_route("A, D", "A", "D")["feedback"]
    assert "start at A" in check_route("B, D", "A", "D")["feedback"]


def test_module_4_route_question_through_the_api():
    g = str(uuid.uuid4())

    def ans(text):
        return client.post(f"/api/learners/{g}/answers", json={"topic": "4", "section": "route", "question": "1", "text": text}).json()

    assert ans("A, C, D")["right"] is True
    assert ans("A, B, D")["right"] is True
    assert ans("A, B, A, C, D")["right"] is False
