"""My analysis must come only from the student's own data, with every course detail read from the content."""

from datetime import date

import pytest

from app.content import loader
from app.core import analysis as an


def test_no_data_gives_an_empty_state_not_sample_numbers():
    out = an.analysis({}, {}, today=date(2026, 11, 16))
    assert out["empty"] is True
    assert out["sample"] is False
    assert out["message"]
    assert all(m["secs"] == 0 for m in out["modes"])
    assert all(d["mins"] == 0 for d in out["week"])
    assert out["accuracy"]["total"] == 0
    assert all(c["status"] == "Not checked" for c in out["concepts"])


def test_insight_waits_for_enough_study_time():
    cfg = loader.course().analysis
    little = {"track": {"modes": {"Listening": 60}}}
    out = an.analysis(little, {})
    assert out["empty"] is False
    assert out["insight"]["head"] == cfg.notEnoughHead
    assert out["top"] is None

    lots = {"track": {"modes": {"Listening": cfg.minMinutes * 60 + 1, "Coding": 30}}}
    out = an.analysis(lots, {})
    assert out["insight"]["head"] == cfg.modes["Listening"].head
    assert out["top"] == "Listening"


def test_week_shows_real_days_only():
    state = {"track": {"days": {"2026-11-16": 600}}}
    out = an.analysis(state, {}, today=date(2026, 11, 17))
    assert [d["mins"] for d in out["week"]] == [10, 0, 0, 0, 0, 0, 0]


def test_concepts_and_links_come_from_the_content():
    out = an.analysis({}, {})
    names = [c.name for c in loader.course().analysis.concepts]
    assert [c["name"] for c in out["concepts"]] == names
    ids = {t.id for t in loader.topics()}
    for c in out["concepts"]:
        topic_id, part = c["review"].split("?go=")
        assert topic_id in ids
        assert part in {p["id"] for p in loader.parts(loader.topic(topic_id))}


def test_objective_tags_come_from_the_misconceptions():
    tags = an.objective_tags()
    for tag, m in loader.misconceptions().items():
        assert tag in tags[m.objective]


def test_review_threshold_is_read_from_the_content(monkeypatch):
    concept = loader.course().analysis.concepts[0].name
    state = {"track": {"acc": {concept: [1, 2]}}}  # 50% right
    cfg = loader.course().analysis
    monkeypatch.setattr(cfg, "reviewBelow", 70)
    assert an.analysis(state, {})["concepts"][0]["status"] == "Review"
    monkeypatch.setattr(cfg, "reviewBelow", 40)
    assert an.analysis(state, {})["concepts"][0]["status"] == "Ready"


def test_focus_names_the_weakest_concept():
    concept = loader.course().analysis.concepts[0].name
    out = an.analysis({"track": {"acc": {concept: [1, 4]}}}, {})
    assert concept in (out["insight"]["focus"] or "")


def test_readiness_ignores_time():
    _, quiz = loader.quiz_by_mode("ready")
    q = quiz.questions[0]
    answers = {quiz.quiz: {q.id: {"first": {"right": True}}}}
    a = an.analysis({"track": {"modes": {"Watching": 1}}}, answers)["report"]
    b = an.analysis({"track": {"modes": {"Watching": 99999}}}, answers)["report"]
    assert a == b


@pytest.mark.parametrize("old", list(loader.course().analysis.aliases))
def test_old_concept_names_still_count(old):
    new = loader.course().analysis.aliases[old]
    out = an.analysis({"track": {"acc": {old: [2, 2]}}}, {})
    row = next(c for c in out["concepts"] if c["name"] == new)
    assert row["total"] == 2


def test_plan_wording_comes_from_the_content(monkeypatch):
    from app.content import loader
    words = loader.course().analysis.wording
    monkeypatch.setattr(words, "planQuestion", "Bring one question.")
    a = an.analysis({}, {})
    assert a["plan"][-1] == "Bring one question."


def test_a_wrong_placeholder_is_refused():
    import pytest
    from app.content.models import AnalysisWording
    from app.content import loader
    data = loader.course().analysis.wording.model_dump()
    data["planNext"] = "Carry on with {modul}."
    with pytest.raises(ValueError):
        AnalysisWording(**data)


def _log(*entries):
    return {"_log": [dict(source="practice", **e) for e in entries]}


def test_goals_come_from_the_students_answers():
    a = an.analysis({}, _log({"objective": 1, "right": True}, {"objective": 1, "right": True},
                             {"objective": 3, "right": False, "tag": "fifo_lifo"}))
    by = {g["num"]: g for g in a["goals"]}
    words = loader.course().analysis.wording
    assert by[1]["status"] == words.goalGood and by[1]["tone"] == "ok"
    assert by[3]["status"] == words.goalReview and by[3]["see"]
    assert by[2]["status"] == words.goalNotChecked


def test_questions_follow_the_hard_concepts():
    a = an.analysis({"questions": [{"text": "My own question"}]},
                    _log({"objective": 3, "right": False, "tag": "fifo_lifo"}))
    queues = next(c.question for c in loader.course().analysis.concepts if c.name == "Queues")
    assert a["questions"][0] == queues
    assert a["questions"][-1] == "My own question"


def test_ready_link_points_at_the_ready_check():
    a = an.analysis({}, {})
    topic, _ = loader.quiz_by_mode("ready")
    assert a["ready_link"].startswith(topic)
