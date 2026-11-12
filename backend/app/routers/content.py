"""Course content, running the course's Python examples, and the map neighbour quiz."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..content import loader
from ..content.models import CodeCompareSection, CodeSection
from ..core.graph import ADJ
from ..core.runner import COMPARE, build_program, run

router = APIRouter(prefix="/api", tags=["Course content"])


@router.get("/course", summary="The course: overview, modules, topics, objectives, glossary")
def get_course():
    c = loader.course().model_dump()
    c["topics"] = loader.topic_summaries()
    return c


@router.get("/topics/{topic_id}", summary="One topic, ready to display (answers removed)")
def get_topic(topic_id: str):
    t = loader.public_topic(topic_id)
    if t is None:
        raise HTTPException(status_code=404, detail="No such topic")
    return t


class RunIn(BaseModel):
    section: int
    task: int | None = None
    block: int | None = None


@router.post("/topics/{topic_id}/run", summary="Run a code example from a topic and return its output")
def run_code(topic_id: str, body: RunIn):
    """Runs only code written in the course content: the section's source, one of its tasks, or a compare block."""
    t = loader.topic(topic_id)
    if t is None or not 0 <= body.section < len(t.sections):
        raise HTTPException(status_code=404, detail="No such code section")
    s = t.sections[body.section]
    if isinstance(s, CodeSection):
        task = None
        if body.task is not None:
            if not 0 <= body.task < len(s.tasks):
                raise HTTPException(status_code=404, detail="No such task")
            task = s.tasks[body.task].run
        result = run(build_program(s.source, s.setup, task))
        if task is not None:
            result |= {"answer": s.tasks[body.task].answer, "why": s.tasks[body.task].why}
        return result
    if isinstance(s, CodeCompareSection):
        if body.block is None or not 0 <= body.block < len(s.blocks):
            raise HTTPException(status_code=404, detail="No such block")
        return run(COMPARE[s.blocks[body.block].run])
    raise HTTPException(status_code=422, detail="That section has no code to run")


class NeighboursIn(BaseModel):
    place: str
    picked: list[str]


@router.post("/graph/neighbours-check", tags=["Graph and BFS"], summary="Check a 'name the neighbours' answer")
def neighbours_check(body: NeighboursIn):
    if body.place not in ADJ:
        raise HTTPException(status_code=422, detail="Unknown vertex")
    want, got = set(ADJ[body.place]), set(body.picked)
    right = want == got
    missing, extra = sorted(want - got), sorted(got - want)
    if right:
        fb = f"Yes. {body.place}'s neighbours are {' and '.join(ADJ[body.place]) or 'none: it is isolated'}."
    elif extra:
        fb = f"Not yet. {', '.join(extra)} {'is' if len(extra) == 1 else 'are'} not one edge away from {body.place}."
    else:
        fb = f"Not yet. {body.place} has {len(want)} neighbour{'s' if len(want) != 1 else ''}. Look for every edge that touches it."
    return {"right": right, "missing": missing, "extra": extra, "feedback": fb, "answer": ADJ[body.place]}
