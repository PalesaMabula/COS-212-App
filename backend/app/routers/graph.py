"""Graph, BFS and code-lab endpoints: the lesson's animations come from these."""

from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..core import graph as g
from ..core import queue_game
from ..attempts import log_attempt, valid_id
from ..content import loader

router = APIRouter(prefix="/api", tags=["Graph and BFS"])


def _start(start: str) -> str:
    if start not in g.ADJ:
        raise HTTPException(status_code=422, detail=f"Unknown vertex. Choose one of: {', '.join(g.PLACES)}")
    return start


@router.get("/graph", summary="Graph A–F")
def the_graph():
    """Adjacency list, map positions, edges and the graph in words."""
    return {
        "adj": g.ADJ,
        "places": g.PLACES,
        "reachable": g.REACHABLE,
        "pos": g.POS,
        "edges": g.EDGES,
        "in_words": g.graph_in_words(),
    }


@router.get("/bfs", summary="BFS, one frame per serve")
def bfs_frames(start: str = Query("A", description="Vertex to start from")):
    """Frames used by the video and the Try it map."""
    frames = g.bfs_frames(_start(start))
    order = g.bfs(g.ADJ, start)
    return {"start": start, "order": order, "frames": frames, "adj": g.ADJ,
            "unreached": [v for v in g.PLACES if v not in order]}


@router.get("/code", summary="Python source and line-by-line trace")
def code_trace(start: str = Query("A", description="Vertex to start from")):
    """The code lab's source lines and one frame per executed line."""
    _start(start)
    return {"start": start, "source": g.python_source(start), "frames": g.code_frames(start)}


class QueueMoveIn(BaseModel):
    start: str
    done: int = 0
    move: dict[str, Any]
    learner: str | None = None  # anonymous guest id: mistakes are logged for My analysis


@router.post("/queue-game/move", summary="Be the Queue (3.4): check one move against the real BFS")
def queue_move(body: QueueMoveIn):
    """
    The student runs BFS: serve the front, choose who joins (in neighbour-list order,
    with hop counts), and finish when the queue is empty. Wrong moves come back with a
    mistake tag and a specific "Not yet" message; the state doesn't change.
    """
    _start(body.start)
    try:
        r = queue_game.check_move(body.start, body.done, body.move)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    tag = queue_game.MISCONCEPTION.get(r.get("tag"))
    if tag:
        r["misconception"] = loader.misconception(tag)
    if body.learner and (not r["ok"] or body.move.get("type") == "finish"):
        try:
            lid = valid_id(body.learner)
        except ValueError:
            raise HTTPException(status_code=422, detail="learner must be a UUID")
        log_attempt(lid, {"source": "queue", "topic": "3.4", "section": "queuegame", "q": r.get("tag") or "finish",
                                         "objective": 3, "concept": "BFS", "tag": tag, "game_tag": r.get("tag"),
                                         "right": r["ok"], "first": False})
    return r


@router.get("/queue-game/tags", summary="Be the Queue mistake tags and what each means")
def queue_tags():
    return queue_game.TAGS
