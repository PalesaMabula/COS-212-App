"""The course content is complete, consistent, true to graph A–F, and never leaks answers."""

import json
import re

from app.content import loader
from app.core.graph import ADJ, all_shortest_paths, bfs, bfs_path, dfs_order, hop_distances
from app.core.runner import COMPARE, build_program, run


def test_four_module_pages_in_order():
    assert [t.id for t in loader.topics()] == ["1", "2", "3", "4"]
    assert all(t.layout == "module" for t in loader.topics())


def test_parts_are_numbered_in_order_with_unique_ids():
    expected = {"1": 3, "2": 6, "3": 10, "4": 8}
    for t in loader.topics():
        parts = loader.parts(t)
        assert len(parts) == expected[t.id], t.id
        assert [p["num"] for p in parts] == [f"{i:02d}" for i in range(1, len(parts) + 1)]
        assert [p["id"] for p in parts] == [f"s{i:02d}" for i in range(1, len(parts) + 1)]
        assert t.sections[0].kind == "part", "a module page starts with a numbered part"


def test_public_topics_have_no_answers():
    for t in loader.topics():
        text = json.dumps(loader.public_topic(t.id))
        for secret in ('"ans"', '"accept"', '"model"', '"optFeedback"', '"ok"', '"no"', '"after"', '"tags"'):
            assert secret not in text, f"{t.id} leaks {secret}"


def test_no_place_names_or_old_topic_numbers_left():
    """The course uses plain letters A–F everywhere, so captions can't disagree with the picture."""
    blob = json.dumps([t.model_dump() for t in loader.topics()] + [loader.course().model_dump()], ensure_ascii=False)
    blob += (loader.CONTENT / "misconceptions.json").read_text(encoding="utf-8")
    for word in ("Library", "Café", "Clinic", "Gym", "Res,", "campus", "Campus"):
        assert word not in blob, word
    assert not re.search(r"\b[1-4]\.[1-5]\b", blob), "old topic numbers like 3.2"


def test_captions_only_name_vertices_that_exist():
    for t in loader.topics():
        for s in t.sections:
            if s.kind == "video":
                for ch in s.chapters:
                    named = set(re.findall(r"\b([A-Z])\b", ch.caption))
                    assert named <= set(ADJ), (t.id, ch.caption)
                    for v in ch.scene.highlight + ch.scene.waiting + ch.scene.dashed + ch.scene.book if ch.scene else []:
                        assert v in ADJ, (t.id, v)


def test_quiz_answers_match_real_bfs():
    ready = {q.id: q for q in loader.find_section("4", "ready").questions}
    assert ready["R1"].opts[ready["R1"].ans] == "F" and ADJ["F"] == []
    assert ready["R2"].opts[ready["R2"].ans] == str(ADJ["C"])
    assert ready["R3"].opts[ready["R3"].ans] == ", ".join(bfs(ADJ, "C"))
    assert ready["R5"].opts[ready["R5"].ans] == str(hop_distances(ADJ, "B")["E"])
    unreachable = [v for v in ADJ if v not in hop_distances(ADJ, "D")]
    assert ready["R6"].opts[ready["R6"].ans] == ", ".join(unreachable)
    m3 = {q.id: q for q in loader.find_section("3", "m3quiz").questions}
    assert m3["4"].opts[m3["4"].ans] == ", ".join(bfs(ADJ, "B"))
    m2 = {q.id: q for q in loader.find_section("2", "m2quiz").questions}
    assert m2["2"].opts[m2["2"].ans] == " and ".join(ADJ["B"])
    assert m2["4"].opts[m2["4"].ans] == str(ADJ["E"])


def test_facts_in_the_lessons_are_true():
    assert bfs(ADJ, "A") == ["A", "B", "C", "D", "E"]
    assert dfs_order("A") == ["A", "B", "D", "C", "E"]  # Module 3, 07
    assert bfs(ADJ, "E") == ["E", "C", "A", "D", "B"]  # Module 3 exercise 1
    assert bfs(ADJ, "D") == ["D", "B", "C", "A", "E"]  # Module 3 exercise 2
    assert bfs_path(ADJ, "A", "D") == ["A", "B", "D"]
    assert all_shortest_paths(ADJ, "A", "D") == [["A", "B", "D"], ["A", "C", "D"]]  # Module 4, 04
    assert bfs_path(ADJ, "A", "E") == ["A", "C", "E"]
    assert bfs_path(ADJ, "E", "B") == ["E", "C", "A", "B"]  # Module 4 exercise 1
    assert hop_distances(ADJ, "A") == {"A": 0, "B": 1, "C": 1, "D": 2, "E": 2}  # levels
    assert sum(len(n) for n in ADJ.values()) // 2 == 5


def test_every_code_example_runs_and_matches_its_answer():
    for t in loader.topics():
        for s in t.sections:
            if s.kind == "code":
                assert run(build_program(s.source, s.setup))["ok"], t.id
                for task in s.tasks:
                    out = run(build_program(s.source, s.setup, task.run))
                    assert out["ok"], (t.id, task.q, out["error"])
                    assert out["output"] == task.answer, (t.id, task.q)


def test_mark_on_serve_bug_serves_d_twice():
    assert "D served 2 times" in run(COMPARE["bug"])["output"]
    assert "D served 1 times" in run(COMPARE["correct"])["output"]


def test_links_point_to_real_modules_and_parts():
    ids = {t.id for t in loader.topics()}
    for g in loader.course().glossary:
        assert g.topic in ids
    for c in loader.course().checklist:
        assert c.topic in ids
    for k, m in loader.misconceptions().items():
        assert m.go in {p["id"] for p in loader.parts(loader.topic(m.topic))}, k


def test_no_confidence_or_old_placeholders_in_content():
    blob = json.dumps([t.model_dump() for t in loader.topics()])
    assert "How sure" not in blob
    for t in loader.topics():
        for s in t.sections:
            for q in getattr(s, "questions", []) or []:
                if q.placeholder:
                    assert q.placeholder == "Type here"
