"""
"Try a similar one": a parallel question aimed at one misconception tag.

Every answer is computed from graph A–F, so it is always right, and the same
seed always gives the same question (the server re-creates it to check the
answer, so the answer never goes to the browser).

The Practice page and the Full quiz use core/quizgen.py instead, which makes a
new random graph for every round.
"""

from .graph import ADJ, REACHABLE, bfs_frames, bfs_path, hop_distances

_M = 233280


def _rng(seed: int):
    s = seed % _M

    def rnd() -> float:
        nonlocal s
        s = (s * 9301 + 49297) % _M
        return s / _M

    return rnd


def _shuffle(items: list, rnd) -> list:
    keyed = [(rnd(), x) for x in items]
    return [x for _, x in sorted(keyed, key=lambda k: k[0])]


def _unique(items: list) -> list:
    out = []
    for x in items:
        if x and x not in out:
            out.append(x)
    return out


NAMES = ["P", "Q", "R", "S", "T", "U"]


def _q(q, correct, wrong, tag, why, rnd):
    wrong = [w for w in _unique(wrong) if w != correct][:2]
    opts = _shuffle([correct, *wrong], rnd)
    return {"q": q, "opts": opts, "ans": opts.index(correct), "tag": tag, "why": why}


def _start(rnd) -> str:
    return REACHABLE[int(rnd() * len(REACHABLE))]


def _fifo_lifo(rnd):
    people = _shuffle(NAMES, rnd)[:3]
    if rnd() < 0.5:
        return _q(f"{people[0]}, then {people[1]}, then {people[2]} join a queue. Who is served first?",
                  people[0], [people[2], people[1]], "fifo_lifo",
                  f"First in, first out: {people[0]} joined first.", rnd)
    start = _start(rnd)
    frames = bfs_frames(start)
    f = next((x for x in frames[1:] if len(x["q"]) >= 2), None)
    if f is None:
        return _fifo_lifo(lambda: 0.1)
    return _q(f"BFS from {start}. The queue is [{', '.join(f['q'])}] (front first). Which vertex is served next?",
              f["q"][0], [f["q"][-1], *f["q"][1:-1]], "fifo_lifo",
              f"A queue serves the front: {f['q'][0]} has waited longest.", rnd)


def _wrong_layer(rnd):
    start = _start(rnd)
    dist = hop_distances(ADJ, start)
    near = [p for p in REACHABLE if dist.get(p) == 1]
    far = [p for p in REACHABLE if dist.get(p, 0) >= 2]
    if not near or not far:
        return _wrong_layer(lambda: 0.0)
    a, b = near[int(rnd() * len(near))], far[int(rnd() * len(far))]
    return _q(f"BFS from {start}. Which is served first: {a} or {b}?",
              a, [b, "It depends on the drawing"], "wrong_layer",
              f"{a} is 1 edge away and {b} is {dist[b]}. BFS finishes each level before the next.", rnd)


def _skip_cases(want_served: bool):
    """(start, served vertex, neighbour) where the neighbour is already found."""
    out = []
    for start in REACHABLE:
        frames = bfs_frames(start)
        for before, after in zip(frames, frames[1:]):
            v = after["order"][-1]
            for n in ADJ[v]:
                done = n in before["order"]
                waiting = n in before["q"] and n != v
                if (want_served and done) or (not want_served and waiting):
                    out.append((start, v, n))
    return out


def _mark_on_serve(rnd):
    cases = _skip_cases(want_served=False)
    start, v, n = cases[int(rnd() * len(cases))]
    return _q(f"BFS from {start}. {v} is served and sees {n}, which is already waiting in the queue. What happens?",
              f"Skip {n}", [f"Add {n} again", f"Serve {n} straight away"], "mark_on_serve",
              f"{n} was marked found when it joined the queue, so it's skipped.", rnd)


def _duplicate(rnd):
    cases = _skip_cases(want_served=True)
    start, v, n = cases[int(rnd() * len(cases))]
    return _q(f"BFS from {start}. {v} is served and sees {n}, which was served earlier. What happens?",
              f"Skip {n}", [f"Add {n} to the back", f"Serve {n} again"], "duplicate",
              f"{n} is already found. A vertex never joins the queue twice.", rnd)


def _parent_reversed(rnd):
    start = _start(rnd)
    parent = bfs_frames(start)[-1]["parent"]
    child = list(parent)[int(rnd() * len(parent))]
    par = parent[child]
    kids = [c for c, p in parent.items() if p == child]
    others = [n for n in ADJ[child] if n != par]
    return _q(f"BFS from {start}. Which vertex found {child} (its parent)?",
              par, kids + others + ["Nobody, it found itself"], "parent_reversed",
              f"{par} was being served when {child} joined, so {par} is its parent, one edge closer to {start}.", rnd)


def _unreachable(rnd):
    start = _start(rnd)
    if rnd() < 0.5:
        return _q(f'What does shortest_path(graph, "{start}", "F") return?',
                  "None", [f"['{start}', 'F']", "An error"], "unreachable",
                  "No edge reaches F, so it never gets a parent.", rnd)
    return _q(f"BFS from {start}. Is F ever served?", "No", ["Yes, last", "Yes, if we wait long enough"], "unreachable",
              "BFS only travels along edges, and no edge touches F.", rnd)


def _count_places(rnd):
    a, b = _shuffle(REACHABLE, rnd)[:2]
    route = bfs_path(ADJ, a, b)
    hops = len(route) - 1
    return _q(f"How long is the route {' → '.join(route)}?",
              f"{hops} edges", [f"{len(route)} edges", f"{hops + 2} edges"], "count_places_not_edges",
              f"{len(route)} vertices, but {hops} edges crossed. Count the arrows.", rnd)


def _length_is_cost(rnd):
    edges = [(a, b) for a in REACHABLE for b in ADJ[a] if a < b]
    (a, b), (c, d) = _shuffle(edges, rnd)[:2]
    return _q(f"In a drawing, the edge {a}–{b} is three times longer than the edge {c}–{d}. Which one counts as more steps?",
              "Neither, both are 1 step", [f"{a}–{b}", f"{c}–{d}"], "length_is_cost",
              "The graph is unweighted: every edge is one step, however long it's drawn.", rnd)


def _one_way(rnd):
    a = _start(rnd)
    b = ADJ[a][int(rnd() * len(ADJ[a]))]
    if rnd() < 0.5:
        return _q(f'graph["{a}"] lists "{b}". Does graph["{b}"] list "{a}"?',
                  "Yes, always", ["No", "Only if we add it later"], "one_way_edge",
                  "The graph is undirected, so each edge is stored in both lists.", rnd)
    return _q(f"To add an edge between {a} and F, which lists change?",
              f"Both {a}'s and F's", [f"Only {a}'s", "Only F's"], "one_way_edge",
              "An undirected edge goes in both vertices' lists, or it only works one way.", rnd)


SIMILAR = {
    "fifo_lifo": _fifo_lifo, "wrong_layer": _wrong_layer, "mark_on_serve": _mark_on_serve,
    "duplicate": _duplicate, "parent_reversed": _parent_reversed, "unreachable": _unreachable,
    "count_places_not_edges": _count_places, "length_is_cost": _length_is_cost, "one_way_edge": _one_way,
}


def make_similar(tag: str, seed: int) -> dict:
    if tag not in SIMILAR:
        raise ValueError(f"unknown tag {tag!r}")
    q = SIMILAR[tag](_rng(seed))
    return q | {"seed": seed}
