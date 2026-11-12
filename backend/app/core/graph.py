"""
The running example: graph A–F (undirected, unweighted).

    A–B, A–C, B–D, C–D, C–E, and an isolated vertex F.

Neighbour lists are in alphabetical order, so "which neighbour comes first?"
always has one answer. BFS from A gives A, B, C, D, E; F is never found.
The graph has no odd cycle, so no route from A to D or E has exactly 3 edges.
Everything the lessons animate (animations, stepper, code, Be the Queue) comes from here.
"""

from collections import deque

ADJ: dict[str, list[str]] = {
    "A": ["B", "C"],
    "B": ["A", "D"],
    "C": ["A", "D", "E"],
    "D": ["B", "C"],
    "E": ["C"],
    "F": [],
}

PLACES = list(ADJ)
REACHABLE = ["A", "B", "C", "D", "E"]

# Positions in % of the drawing box (A on the left, F alone on the right).
POS = {"A": [12, 50], "B": [38, 20], "C": [38, 80], "D": [66, 20], "E": [66, 80], "F": [90, 50]}

EDGES = [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"], ["C", "E"]]


def graph_in_words(adj: dict[str, list[str]] = ADJ) -> list[str]:
    """Text alternative for the map picture."""
    return [
        f"{p} is joined to {' and '.join(ns)}." if ns else f"{p} has no edges, so nothing is joined to it."
        for p, ns in adj.items()
    ]


def check_place(start: str, adj: dict[str, list[str]] = ADJ) -> None:
    if start not in adj:
        raise ValueError(f"Unknown vertex {start!r}. Choose one of: {', '.join(adj)}")


def bfs(graph: dict[str, list[str]], start: str) -> list[str]:
    """The exact algorithm shown to students in the code lab."""
    queue = deque([start])
    found = {start}
    order = []
    while queue:
        place = queue.popleft()
        order.append(place)
        for n in graph[place]:
            if n not in found:
                found.add(n)
                queue.append(n)
    return order


def bfs_frames(start: str, adj: dict[str, list[str]] = ADJ) -> list[dict]:
    """
    BFS as one frame per "serve".
    frame = {q: queue front-first, order: served so far, added: joined this step,
             parent: who found whom, hop: rings from the start}
    """
    check_place(start, adj)
    q = deque([start])
    found = {start}
    order: list[str] = []
    parent: dict[str, str] = {}
    hop = {start: 0}
    frames = [{"q": [start], "order": [], "added": [start], "parent": {}, "hop": dict(hop)}]
    while q:
        v = q.popleft()
        order.append(v)
        added = []
        for n in adj[v]:
            if n not in found:
                found.add(n)
                q.append(n)
                added.append(n)
                parent[n] = v
                hop[n] = hop[v] + 1
        frames.append({"q": list(q), "order": list(order), "added": added, "parent": dict(parent), "hop": dict(hop)})
    return frames


def bfs_path(graph: dict[str, list[str]], start: str, goal: str) -> list[str] | None:
    """
    Fewest-hops route from start to goal, as taught in 4.1: BFS records each
    place's parent when it joins the queue; walk the parents back from the goal
    and reverse. Returns [start] when start == goal, or None when unreachable.
    """
    if start not in graph or goal not in graph:
        raise ValueError("start and goal must both be places in the graph")
    queue = deque([start])
    parent: dict[str, str | None] = {start: None}  # also works as "found"
    while queue:
        place = queue.popleft()
        if place == goal:
            break
        for n in graph[place]:
            if n not in parent:
                parent[n] = place
                queue.append(n)
    if goal not in parent:
        return None
    path, node = [], goal
    while node is not None:
        path.append(node)
        node = parent[node]
    return path[::-1]


def hop_distances(graph: dict[str, list[str]], start: str) -> dict[str, int]:
    """Hops from start to every reachable place (BFS rings)."""
    dist = {start: 0}
    queue = deque([start])
    while queue:
        v = queue.popleft()
        for n in graph[v]:
            if n not in dist:
                dist[n] = dist[v] + 1
                queue.append(n)
    return dist


def all_shortest_paths(graph: dict[str, list[str]], start: str, goal: str) -> list[list[str]]:
    """
    Every route from start to goal with the fewest hops (ties included), e.g.
    A → D gives [A, B, D] and [A, C, D].
    Empty list when the goal is unreachable.
    """
    if start not in graph or goal not in graph:
        raise ValueError("start and goal must both be places in the graph")
    dist = hop_distances(graph, start)
    if goal not in dist:
        return []
    routes: list[list[str]] = []

    def back(node: str, tail: list[str]) -> None:
        if node == start:
            routes.append([start, *tail])
            return
        # Step back to any neighbour exactly one ring closer to the start.
        for n in graph[node]:
            if dist.get(n) == dist[node] - 1:
                back(n, [node, *tail])

    back(goal, [])
    return sorted(routes)


def is_shortest_route(graph: dict[str, list[str]], route: list[str], start: str, goal: str) -> bool:
    """True if route is a real walk along edges from start to goal with the fewest possible hops."""
    if not route or route[0] != start or route[-1] != goal:
        return False
    if any(b not in graph.get(a, []) for a, b in zip(route, route[1:])):
        return False
    dist = hop_distances(graph, start)
    return goal in dist and len(route) - 1 == dist[goal]


def dfs_order(start: str, adj: dict[str, list[str]] = ADJ) -> list[str]:
    """Depth-first order: the "stack instead of queue" misconception."""
    seen: set[str] = set()
    out: list[str] = []

    def go(v: str) -> None:
        seen.add(v)
        out.append(v)
        for n in adj[v]:
            if n not in seen:
                go(n)

    go(start)
    return out


# ------------------------------- Code lab -------------------------------


def python_source(start: str) -> list[str]:
    return [
        "from collections import deque",
        "",
        "def bfs(graph, start):",
        "    queue = deque([start])",
        "    found = {start}",
        "    order = []",
        "    while queue:",
        "        vertex = queue.popleft()",
        "        order.append(vertex)",
        "        for n in graph[vertex]:",
        "            if n not in found:",
        "                found.add(n)",
        "                queue.append(n)",
        "    return order",
        "",
        "graph = {",
        '    "A": ["B", "C"],',
        '    "B": ["A", "D"],',
        '    "C": ["A", "D", "E"],',
        '    "D": ["B", "C"],',
        '    "E": ["C"],',
        '    "F": [],',
        "}",
        f'print(bfs(graph, "{start}"))',
    ]


def code_frames(start: str, adj: dict[str, list[str]] = ADJ) -> list[dict]:
    """
    Line-by-line trace of python_source(start).
    frame = {line, note, q, found, order, place, n, out}
    The final frame's `out` is checked against the real bfs() in the tests.
    """
    check_place(start, adj)
    queue: list[str] = []
    found: list[str] = []
    order: list[str] = []
    frames: list[dict] = []
    place = "—"
    n = "—"

    def f(line: int, note: str) -> None:
        frames.append({"line": line, "note": note, "q": list(queue), "found": list(found),
                       "order": list(order), "place": place, "n": n, "out": ""})

    f(24, f'Call bfs(graph, "{start}").')
    queue.append(start)
    f(4, f"Make a queue holding {start}.")
    found.append(start)
    f(5, f"Mark {start} as found.")
    f(6, "Start an empty list to record the order.")
    while queue:
        f(7, "The queue is not empty, so keep going.")
        place = queue.pop(0)
        n = "—"
        f(8, f"Take {place} from the front.")
        order.append(place)
        f(9, f"Record {place} in the order.")
        for x in adj[place]:
            n = x
            f(10, f"Look at neighbour {x}.")
            if x in found:
                f(11, f"{x} is already found. Skip it.")
                continue
            f(11, f"{x} is new.")
            found.append(x)
            f(12, f"Mark {x} as found.")
            queue.append(x)
            f(13, f"Add {x} to the back.")
    f(7, "The queue is empty, so the loop ends.")
    f(14, "Return the order.")
    frames.append({**frames[-1], "line": 24, "note": "Printed the result.", "out": str(order)})
    return frames
