"""BFS correctness on the campus graph, including the misconceptions the lesson targets."""

import ast

from app.core.graph import ADJ, PLACES, bfs, bfs_frames, code_frames, dfs_order


def test_bfs_from_library_matches_the_lesson():
    assert bfs(ADJ, "A") == ["A", "B", "C", "D", "E"]


def test_clinic_is_unreachable():
    assert "F" not in bfs(ADJ, "A")
    assert bfs(ADJ, "F") == ["F"]


def test_graph_is_undirected():
    for a, ns in ADJ.items():
        for b in ns:
            assert a in ADJ[b], f"{a}–{b} is missing its reverse edge"


def test_no_place_joins_the_queue_twice():
    """Marking on join (not on serve) means the D is queued once, even though B and C both see it."""
    for start in PLACES:
        joined = [p for f in bfs_frames(start) for p in f["added"]]
        assert len(joined) == len(set(joined))


def test_frames_end_with_an_empty_queue_and_hops_are_rings():
    frames = bfs_frames("A")
    assert frames[-1]["q"] == []
    assert frames[-1]["hop"] == {"A": 0, "B": 1, "C": 1, "D": 2, "E": 2}


def test_bfs_differs_from_dfs():
    """The stack-vs-queue misconception: DFS goes deep first."""
    assert dfs_order("A") == ["A", "B", "D", "C", "E"]
    assert dfs_order("A") != bfs(ADJ, "A")


def test_code_trace_prints_what_real_python_returns():
    for start in PLACES:
        out = code_frames(start)[-1]["out"]
        assert ast.literal_eval(out) == bfs(ADJ, start)
