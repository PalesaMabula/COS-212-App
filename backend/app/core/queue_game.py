"""
"Be the Queue" (Module 3, section 06): the student runs BFS by hand and Python checks every move.

Each round has two moves:
    1. serve  - take a vertex from the queue (BFS always takes the FRONT)
    2. join   - choose which neighbours of the served place join the back,
                in the fixed neighbour order (the list order taught in Module 2),
                and give each one's hop count
When the queue is empty the student presses Finish.

The server is stateless: the browser sends the start vertex and how many
rounds are done; the true state is rebuilt from the real BFS, so the browser
can never drift out of step or mark itself right.

Mistakes are tagged so feedback (and My analysis) can be specific:
    fifo_lifo          served the newest vertex (back of the queue): that's a stack
    not_in_queue       served a vertex that isn't waiting
    not_front          served a waiting place from the middle of the queue
    duplicate          added a vertex that was already served
    mark_on_serve      added a vertex that is already waiting in the queue
    non_neighbour      added a vertex that isn't one edge away
    skipped_neighbour  left out a new neighbour
    wrong_order        right places, but not in neighbour-list order
    stopped_early      pressed Finish while the queue isn't empty
    finish_missed      tried to serve when the queue is already empty
    wrong_hop          a joining place's hop count is wrong
    wrong_parent       a joining place's parent is wrong
"""

from .graph import ADJ, check_place

TAGS = {
    "fifo_lifo": "A queue serves the front (first in, first out). Taking the newest vertex is how a stack works.",
    "not_in_queue": "Only vertices waiting in the queue can be served.",
    "not_front": "BFS always serves the front of the queue, the vertex that has waited longest.",
    "duplicate": "That vertex was already served. BFS never adds a vertex twice.",
    "mark_on_serve": "That vertex is already waiting. It was marked found when it joined, so it's skipped.",
    "non_neighbour": "Only vertices one edge away from the vertex being served can join.",
    "skipped_neighbour": "Every neighbour that hasn't been found yet joins the queue.",
    "wrong_order": "Neighbours join in the order they're listed (the adjacency list from Module 2).",
    "stopped_early": "BFS keeps going until the queue is empty.",
    "finish_missed": "The queue is empty, so the search is finished.",
    "wrong_hop": "A new vertex is one hop further than the vertex that found it.",
    "wrong_parent": "A new vertex's parent is the vertex being served when it joined.",
}


# Game mistakes that match one of the course misconception tags (content/misconceptions.json).
MISCONCEPTION = {
    "fifo_lifo": "fifo_lifo",
    "duplicate": "duplicate",
    "mark_on_serve": "mark_on_serve",
    "wrong_hop": "wrong_layer",
    "wrong_parent": "parent_reversed",
}


def rounds(start: str, adj: dict[str, list[str]] = ADJ) -> list[dict]:
    """The true BFS, one entry per serve, with the state before and after."""
    check_place(start, adj)
    queue = [start]
    found = [start]
    order: list[str] = []
    parent: dict[str, str | None] = {start: None}
    hop = {start: 0}
    out = []
    while queue:
        before = {"queue": list(queue), "found": list(found), "order": list(order), "parent": dict(parent), "hop": dict(hop)}
        v = queue.pop(0)
        order.append(v)
        joined = [n for n in adj[v] if n not in found]
        for n in joined:
            found.append(n)
            queue.append(n)
            parent[n] = v
            hop[n] = hop[v] + 1
        after = {"queue": list(queue), "found": list(found), "order": list(order), "parent": dict(parent), "hop": dict(hop)}
        out.append({"served": v, "joined": joined, "before": before, "after": after})
    return out


def _state(start: str, done: int, adj: dict[str, list[str]]) -> dict:
    """Canonical state after `done` complete rounds."""
    rs = rounds(start, adj)
    if done == 0:
        return rs[0]["before"] if rs else {"queue": [start], "found": [start], "order": [], "parent": {start: None}, "hop": {start: 0}}
    return rs[min(done, len(rs)) - 1]["after"]


def _no(tag: str, detail: str) -> dict:
    return {"ok": False, "tag": tag, "message": f"Not yet. {detail} {TAGS[tag]}"}


def check_move(start: str, done: int, move: dict, adj: dict[str, list[str]] = ADJ) -> dict:
    """
    start  where the search began
    done   rounds completed so far (each round = serve + join)
    move   {"type": "serve", "place": "A"}
           {"type": "join", "served": "A", "picked": ["B", "C"],
            "hops": {"B": 1, ...}, "parents": {"Library": "A", ...}}   (hops/parents optional)
           {"type": "finish"}
    Returns {"ok", "tag", "message", "state", "row"?, "finished"?}
    """
    rs = rounds(start, adj)
    if not 0 <= done <= len(rs):
        raise ValueError("done is out of range")
    state = _state(start, done, adj)
    queue = state["queue"]
    kind = move.get("type")

    if kind == "finish":
        if queue:
            r = _no("stopped_early", f"The queue still holds {', '.join(queue)}.")
        else:
            r = {"ok": True, "tag": None, "finished": True,
                 "message": f"Yes. The queue is empty, so BFS is done. Served in order: {', '.join(state['order'])}."}
        return r | {"state": state}

    if kind == "serve":
        place = move.get("place")
        if not queue:
            return _no("finish_missed", "There's nothing left to serve.") | {"state": state}
        if place not in queue:
            return _no("not_in_queue", f"{place} isn't in the queue.") | {"state": state}
        if place != queue[0]:
            if place == queue[-1]:
                return _no("fifo_lifo", f"{place} joined last, so it's at the back. The front is {queue[0]}.") | {"state": state}
            return _no("not_front", f"{place} is waiting, but the front is {queue[0]}.") | {"state": state}
        return {"ok": True, "tag": None, "message": f"Yes. {place} is at the front, so it's served. Now choose who joins.",
                "state": state, "serving": place, "neighbours": adj[place]}

    if kind == "join":
        if done >= len(rs):
            return _no("finish_missed", "There's nothing being served.") | {"state": state}
        truth = rs[done]
        served = move.get("served")
        if served != truth["served"]:
            raise ValueError("serve the front vertex before choosing who joins")
        picked = list(move.get("picked") or [])
        found, order = state["found"], state["order"]
        waiting = state["queue"][1:]  # the served place has left the front

        for p in picked:
            if p == served or p in order:
                return _no("duplicate", f"{p} has already been served.") | {"state": state}
            if p in waiting:
                return _no("mark_on_serve", f"{p} is already in the queue.") | {"state": state}
            if p not in adj[served]:
                return _no("non_neighbour", f"{p} isn't a neighbour of {served}.") | {"state": state}
        missing = [n for n in truth["joined"] if n not in picked]
        if missing:
            return _no("skipped_neighbour", f"{missing[0]} is a neighbour of {served} and hasn't been found yet.") | {"state": state}
        if picked != truth["joined"]:
            return _no("wrong_order", f"{served}'s neighbours are listed as {', '.join(adj[served])}.") | {"state": state}

        after = truth["after"]
        for p, h in (move.get("hops") or {}).items():
            if p in after["hop"] and h != after["hop"][p]:
                return _no("wrong_hop", f"{p} is {after['hop'][p]} hop{'s' if after['hop'][p] != 1 else ''} from {start}, not {h}.") | {"state": state}
        for p, par in (move.get("parents") or {}).items():
            if p in after["parent"] and par != after["parent"][p]:
                return _no("wrong_parent", f"{p} was found by {after['parent'][p]}.") | {"state": state}

        joined = truth["joined"]
        names = " and ".join(joined)
        msg = f"Yes. {names[0].upper() + names[1:]} join{'s' if len(joined) == 1 else ''} the back." if joined else "Yes. Nobody new joins."
        row = {"step": done + 1, "served": served, "joined": joined, "queue_after": after["queue"]}
        return {"ok": True, "tag": None, "message": msg, "state": after, "row": row, "done": done + 1}

    raise ValueError("move type must be serve, join or finish")
