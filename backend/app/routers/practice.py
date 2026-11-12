"""Practice rounds, the Full quiz and "Try a similar one" (questions only; answers stay on the server)."""

import random

from fastapi import APIRouter, HTTPException, Query

from ..core import quizgen
from ..core.practice import SIMILAR, make_similar

router = APIRouter(prefix="/api", tags=["Practice"])


def _module(module: str):
    if module == "mix":
        return "mix"
    if module in ("2", "3", "4"):
        return int(module)
    raise HTTPException(status_code=422, detail="module must be 2, 3, 4 or mix")


@router.get("/practice/round", summary="5 new practice questions for one module, on a new graph")
def practice_round(
    module: str = Query(..., description="2 Graphs, 3 BFS, 4 Shortest routes, or mix"),
    seed: int | None = Query(None, ge=1, description="Same seed gives the same round. Leave out for a new one."),
):
    r = quizgen.practice_round(_module(module), seed or random.randint(1, 2**31 - 1))
    return quizgen.public(r)


@router.get("/quiz/full", summary="The Full quiz: 15 new questions across modules 2 to 4")
def full_quiz(seed: int | None = Query(None, ge=1)):
    return quizgen.public(quizgen.full_quiz(seed or random.randint(1, 2**31 - 1)))


@router.get("/practice/similar", summary="A parallel question aimed at one misconception (answer kept on the server)")
def similar_question(
    tag: str = Query(..., description="Misconception tag, e.g. fifo_lifo"),
    seed: int | None = Query(None, ge=1),
):
    if tag not in SIMILAR:
        raise HTTPException(status_code=422, detail=f"Unknown tag. Use one of: {', '.join(SIMILAR)}")
    q = make_similar(tag, seed if seed is not None else random.randint(1, 233279))
    return {"q": q["q"], "opts": q["opts"], "tag": tag, "seed": q["seed"]}
