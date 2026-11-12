"""
Checks a student's answer against the course content. Answers never leave the server.

Returns the feedback to show. Wording follows the course rules: "Not yet", never
"Wrong"; warm-up answers get a neutral "after" line only (no marks).
"""

import re

from ..content.models import Question, TraceStep
from .graph import ADJ, all_shortest_paths, hop_distances, is_shortest_route

# Vertex letters as students type or say them: "A, C, E", "a -> c -> e", "ACE".
_VERTEX = re.compile(r"(?<![A-Za-z])([A-Fa-f])(?![A-Za-z])")


def parse_route(text: str) -> list[str]:
    """'A, C, E', 'a -> c -> e', 'A C E' or 'ACE' → ['A', 'C', 'E']."""
    t = (text or "").strip()
    if re.fullmatch(r"[A-Fa-f]{2,6}", t):  # typed without separators
        return [c.upper() for c in t]
    return [m.upper() for m in _VERTEX.findall(t)]


def check_route(text: str, start: str, goal: str, graph: dict = ADJ) -> dict:
    """Check a typed or spoken route of vertex letters."""
    said = (text or "").lower()
    return check_route_list(parse_route(text), start, goal, graph, says_none="none" in said or "no route" in said)


def check_route_list(route: list[str], start: str, goal: str, graph: dict = ADJ, says_none: bool = False) -> dict:
    """Right if route is ANY route with the fewest hops (ties are all accepted)."""
    best = all_shortest_paths(graph, start, goal)
    arrow = " → ".join
    if not best:
        right = route == [] or says_none
        return {"right": right, "feedback": f"{goal} can't be reached from {start}: no chain of edges leads there."}
    if is_shortest_route(graph, route, start, goal):
        others = [r for r in best if r != route]
        tie = f" Another route ties: {', '.join(arrow(r) for r in others)}." if others else ""
        return {"right": True, "feedback": f"Yes: {arrow(route)} is {len(route) - 1} edges, the fewest possible.{tie}", "routes": [arrow(r) for r in best]}
    if not route:
        fb = "Not yet. Type the vertices in order, for example: A, C, E."
    elif route[0] != start or route[-1] != goal:
        fb = f"Not yet. The route should start at {start} and end at {goal}."
    else:
        gap = next(((a, b) for a, b in zip(route, route[1:]) if b not in graph.get(a, [])), None)
        if gap:
            fb = f"Not yet. {gap[0]} and {gap[1]} aren't joined by an edge, so that step isn't possible."
        else:
            fb = f"Not yet. That route works, but it's {len(route) - 1} edges. There's one with {hop_distances(graph, start)[goal]}."
    return {"right": False, "feedback": fb}

CONFIDENCE = ["Guessing", "Unsure", "Sure"]
SELF_RATE = ["Got it", "Partly", "Not yet"]


def check_question(q: Question, choice: int | None = None, text: str | None = None, rating: int | None = None) -> dict:
    if q.type == "choice":
        if choice is None or not 0 <= choice < len(q.opts):
            raise ValueError("choose one of the options")
        right = choice == q.ans
        tag = q.tags[choice] if q.tags and not right else None
        if q.optFeedback:
            feedback = q.optFeedback[choice]
        else:
            feedback = (q.ok or "Yes, that's it.") if right else (q.no or "Not yet.")
        return {"right": right, "feedback": feedback, "answer": q.opts[q.ans], "after": q.after, "tag": tag}

    if q.type == "text":
        said = (text or "").strip()
        if not said:
            raise ValueError("type or say an answer first")
        right = all(re.search(p, said, re.IGNORECASE) for p in q.accept)
        feedback = (q.ok or "Yes, that's it.") if right else (q.no or "Not yet.")
        return {"right": right, "feedback": feedback, "after": q.after, "tag": None if right else q.tag}

    if q.type == "route":
        if not (text or "").strip():
            raise ValueError("type or say a route first")
        r = check_route(text, q.start, q.goal)
        return r | {"tag": None if r["right"] else q.tag}

    # explain: first call (no rating) reveals the model answer; second call records the self-rating.
    if rating is None:
        return {"right": None, "model": q.model, "feedback": None}
    if not 0 <= rating < len(SELF_RATE):
        raise ValueError("rating must be 0 (Got it), 1 (Partly) or 2 (Not yet)")
    right = rating == 0
    return {"right": right, "model": q.model, "feedback": None if right else q.no, "tag": None if right else q.tag}


def check_step(step: TraceStep, choice: int) -> dict:
    if not 0 <= choice < len(step.opts):
        raise ValueError("choose one of the options")
    right = choice == step.ans
    tag = step.tags[choice] if step.tags and not right else None
    return {"right": right, "feedback": step.ok if right else step.no, "answer": step.opts[step.ans], "tag": tag}
