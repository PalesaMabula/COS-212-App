"""Practice rounds and the Full quiz: every generated question must have exactly one right answer."""

import pytest

from app.core import quizgen as Z
from app.core.practice import SIMILAR, make_similar


@pytest.mark.parametrize("module", [2, 3, 4, "mix"])
def test_thousands_of_practice_rounds_are_valid(module):
    for seed in range(1, 600):
        r = Z.practice_round(module, seed)
        assert len(r["questions"]) == 5
        for q in r["questions"]:
            if module != "mix":
                assert q["mod"] == module
            _check_one_right(q, r["graph"])


def test_full_quiz_has_15_questions_4_6_5():
    for seed in range(1, 600):
        r = Z.full_quiz(seed)
        mods = [q["mod"] for q in r["questions"]]
        assert (mods.count(2), mods.count(3), mods.count(4)) == (4, 6, 5)
        for q in r["questions"]:
            _check_one_right(q, r["graph"])


def _check_one_right(q, g):
    if q["type"] == "mcq":
        assert len(q["opts"]) >= 3, q["prompt"]
        assert len(set(q["opts"])) == len(q["opts"]), "duplicate option"
        rights = [j for j in range(len(q["opts"])) if Z.check(q, g, choice=j)["right"]]
        assert rights == [q["ans"]]
    else:
        assert Z.check(q, g, text=q["answer"])["right"]
        assert not Z.check(q, g, text="")["right"]


def test_same_seed_same_round_and_new_seed_new_graph():
    assert Z.full_quiz(123) == Z.full_quiz(123)
    graphs = {str(Z.full_quiz(s)["graph"]["adj"]) for s in range(1, 40)}
    assert len(graphs) > 30, "rounds should almost always use a different graph"


def test_public_round_hides_answers():
    pub = Z.public(Z.full_quiz(7))
    for q in pub["questions"]:
        assert not {"ans", "answer", "accept", "explain"} & set(q)


def test_route_answers_accept_any_shortest_route():
    # Find a full quiz whose route question has a tie, and check both routes are accepted.
    for seed in range(1, 400):
        r = Z.full_quiz(seed)
        q = next(q for q in r["questions"] if q["kind"] == "route")
        s, t, d = q["accept"]["route"]
        g = r["graph"]
        paths = [[s]]
        for _ in range(d):
            paths = [p + [n] for p in paths for n in g["adj"][p[-1]] if n not in p]
        best = [p for p in paths if p[-1] == t]
        if len(best) > 1:
            assert all(Z.check(q, g, text=", ".join(p))["right"] for p in best)
            return
    pytest.fail("no tie found")


def test_neighbour_answers_ignore_order_and_case():
    for seed in range(1, 100):
        r = Z.practice_round(2, seed)
        for q in r["questions"]:
            if q["kind"] == "nbr":
                letters = q["accept"]["letters"]
                assert Z.check(q, r["graph"], text=" ".join(reversed(letters)).lower())["right"]
                return


@pytest.mark.parametrize("tag", list(SIMILAR))
def test_similar_questions_are_valid(tag):
    for seed in range(1, 300):
        q = make_similar(tag, seed)
        assert len(set(q["opts"])) == len(q["opts"]) >= 2
        assert 0 <= q["ans"] < len(q["opts"])
    assert make_similar(tag, 99) == make_similar(tag, 99)
