"""
End-to-end journeys a student actually takes, in a real browser against the
built app on :8000. One brand-new guest per test. Any console error fails.
"""

import re

from conftest import BASE_URL, expect, learner_id, open_app, server_state


# ---------------------------------------------------------------- first visit
def test_first_visit_lands_on_the_dashboard(page):
    open_app(page, "/")
    expect(page.locator("#hero-h")).to_contain_text("Let's get you lecture-ready")
    expect(page.locator("a[aria-current=page]", has_text="Dashboard").first).to_be_visible()
    expect(page.get_by_role("link", name=re.compile("Start with Module 1"))).to_be_visible()
    expect(page.get_by_text("0 of 5 done")).to_be_visible()  # lecture-ready checklist
    # A guest id was made and the server copy is reachable.
    assert re.fullmatch(r"[0-9a-f-]{36}", learner_id(page))
    expect(page.locator(".server")).to_contain_text("Saved")
    # The lecture date is the student's to set; nothing says "(example)".
    expect(page.get_by_role("button", name="Set lecture date")).to_be_visible()
    expect(page.get_by_text("(example)")).to_have_count(0)


def test_learner_can_set_their_own_name(page):
    open_app(page, "/")
    expect(page.locator(".namebtn")).to_contain_text("Learner")
    page.get_by_role("button", name=re.compile("change your name")).click()
    page.get_by_label("Your name (optional)").fill("Palesa")
    page.keyboard.press("Enter")
    expect(page.locator("#hero-h")).to_contain_text("Welcome, Palesa.")
    expect(page.locator(".avatar")).to_have_text("P")
    expect(page.get_by_role("button", name=re.compile("change your name"))).to_be_focused()
    page.reload()
    expect(page.locator(".namebtn")).to_contain_text("Palesa")


def test_lecture_date_counts_down_from_today(page):
    import datetime as dt

    open_app(page, "/")
    page.get_by_role("button", name="Set lecture date").click()
    in7 = (dt.date.today() + dt.timedelta(days=7)).isoformat()
    page.get_by_label("Lecture date").fill(in7)
    page.get_by_role("button", name="Done").click()
    expect(page.get_by_role("button", name=re.compile(r"Lecture in 7 days"))).to_be_visible()
    page.reload()
    expect(page.get_by_role("button", name=re.compile(r"Lecture in 7 days"))).to_be_visible()


# ---------------------------------------------------------------- module pages
def test_open_module_1_then_2_then_3(page):
    open_app(page, "/")
    page.get_by_role("link", name=re.compile("Start with Module 1")).click()
    expect(page).to_have_url(re.compile(r"#/module/1"))
    expect(page.locator("#topic-h")).to_have_text("Getting started")

    # Module 2 with the search box, keyboard only
    search = page.get_by_role("combobox", name="Search the course")
    search.fill("Module 2: Graphs")
    expect(page.get_by_role("listbox", name="Search results").get_by_role("option")).to_have_count(1)
    search.press("Enter")
    expect(page).to_have_url(re.compile(r"#/module/2$"))
    expect(page.locator("#topic-h")).to_have_text("Graphs")
    expect(page.locator("main")).to_be_focused()  # focus moves to the new page, for screen readers

    # Module 3 from the course overview's content list, then a section from the Learning guide
    page.get_by_role("link", name="Course overview").first.click()
    page.get_by_role("tab", name="Content").click()
    page.get_by_role("link", name="Module 3 · Breadth-first search").click()
    expect(page).to_have_url(re.compile(r"#/module/3$"))
    guide = page.get_by_role("complementary", name="Learning guide")
    expect(guide.get_by_role("link")).to_have_count(10)
    guide.get_by_role("link", name=re.compile("Step by step")).click()
    expect(page).to_have_url(re.compile(r"#/module/3\?go=s04$"))
    expect(page.locator("#s04")).to_be_in_viewport()


def test_section_titles_say_what_they_teach(page):
    open_app(page, "/module/1")
    titles = page.locator("main h2").all_inner_texts()
    assert "Introduction" not in titles and "In plain words" not in titles
    expect(page.get_by_text("Animation · no sound")).to_have_count(0)
    expect(page.get_by_text("How sure are you?")).to_have_count(0)


def test_stepper_fills_the_bfs_table_row_by_row(page):
    open_app(page, "/module/3?go=s04")
    part = page.locator("#s04")
    rows = part.locator("tbody tr")
    expect(rows).to_have_count(1)
    for _ in range(5):
        part.get_by_role("button", name="Next step").click()
    expect(rows).to_have_count(6)
    expect(part.get_by_text("Visit order: A, B, C, D, E.")).to_be_visible()
    expect(part.get_by_text("F never joins the queue")).to_be_visible()


# ---------------------------------------------------------------- animation
def test_animation_play_pause_and_captions(page):
    open_app(page, "/module/1")
    part = page.locator("#s01")
    clock = part.locator(".time")
    expect(clock).to_contain_text("0:00 /")

    part.get_by_role("button", name="Play the animation").click()
    expect(part.get_by_role("button", name="Pause animation")).to_be_visible()
    expect(clock).not_to_contain_text("0:00 /", timeout=4000)
    expect(part.locator("p.sr-only[aria-live=polite]")).not_to_have_text("")

    part.get_by_role("button", name="Pause animation").click()
    expect(part.get_by_role("button", name="Play animation")).to_be_visible()
    paused_at = clock.inner_text()
    page.wait_for_timeout(1500)
    assert clock.inner_text() == paused_at, "the clock kept moving after Pause"

    cc = part.get_by_role("button", name=re.compile(r"^CC "))
    expect(cc).to_have_attribute("aria-pressed", "true")
    captions = part.locator(".cap-below")  # always under the picture, never over a vertex
    expect(captions).to_be_visible()
    caption = captions.inner_text()
    assert set(re.findall(r"\b([A-Z])\b", caption)) <= set("ABCDEF"), caption
    cc.click()
    expect(cc).to_have_attribute("aria-pressed", "false")
    expect(captions).to_have_count(0)
    cc.click()
    expect(captions).to_be_visible()

    part.get_by_role("button", name="Restart animation").click()
    expect(clock).to_contain_text("0:0")


# ---------------------------------------------------------------- read aloud
def test_read_aloud_toggles_and_highlights_each_word(speech_page):
    page = open_app(speech_page, "/course")
    about = page.locator("#about-h").locator("xpath=../..")
    expect(about.get_by_role("button", name=re.compile("^Read aloud"))).to_have_count(1)

    start = page.get_by_role("button", name="Read aloud: About this course")
    expect(start).to_have_attribute("aria-pressed", "false")
    start.click()
    stop = page.get_by_role("button", name="Stop reading: About this course")
    expect(stop).to_have_attribute("aria-pressed", "true")
    expect(page.locator(".ra-on")).to_have_count(1)
    where = "() => { const on = document.querySelector('.ra-on'); return on ? [...document.querySelectorAll('main span')].indexOf(on) : -1; }"
    first = page.evaluate(where)
    page.wait_for_timeout(800)
    later = page.evaluate(where)
    assert later > first >= 0, f"the highlight did not move on (word {first} then {later})"

    stop.click()
    expect(page.get_by_role("button", name="Read aloud: About this course")).to_have_attribute("aria-pressed", "false")
    expect(page.locator(".ra-on")).to_have_count(0)


def test_each_section_has_one_speaker_that_highlights_bold_words_too(speech_page):
    page = open_app(speech_page, "/module/3")
    part = page.locator("#s01")
    expect(part.get_by_role("button", name=re.compile("^Read aloud"))).to_have_count(1)
    expect(part.locator("strong", has_text="levels")).to_be_visible()  # **bold** in the content shows as bold
    part.get_by_role("button", name="Read aloud: The idea: ripples on a pond").click()
    expect(part.locator(".ra-on")).to_have_count(1)
    part.get_by_role("button", name="Stop reading: The idea: ripples on a pond").click()
    expect(part.locator(".ra-on")).to_have_count(0)


# ---------------------------------------------------------------- Be the Queue
def _queue(page):
    open_app(page, "/module/3?go=s06")
    return page.locator("#s06")


def _add(g, served, vertices, level):
    group = g.get_by_role("group", name=f"Vertices that join after serving {served}")
    for v in vertices:
        group.get_by_role("button", name=v, exact=True).click()
    for v in vertices:
        g.get_by_role("group", name=f"Edges from A to {v}").get_by_role("button", name=str(level), exact=True).click()
    g.get_by_role("button", name=f"Add {', '.join(vertices)} to the back").click()


def test_be_the_queue_one_correct_run(page):
    g = _queue(page)
    g.get_by_role("button", name="Serve A (front)").click()
    _add(g, "A", ["B", "C"], 1)
    g.get_by_role("button", name="Serve B (front)").click()
    _add(g, "B", ["D"], 2)
    g.get_by_role("button", name="Serve C (front)").click()
    _add(g, "C", ["E"], 2)
    for v in ("D", "E"):
        g.get_by_role("button", name=f"Serve {v} (front)").click()
        g.get_by_role("button", name="Nobody new joins").click()
    g.get_by_role("button", name="Finish: the queue is empty").click()
    expect(g.get_by_text("You ran BFS from A.")).to_be_visible()
    expect(g.locator("p", has_text="Order:").first).to_contain_text("A, B, C, D, E")


def test_be_the_queue_lifo_mistake_gives_feedback_and_a_retry(page):
    g = _queue(page)
    g.get_by_role("button", name="Serve A (front)").click()
    _add(g, "A", ["B", "C"], 1)
    g.get_by_role("button", name="Serve C (back)").click()  # stack order
    expect(g.get_by_text("Stack order instead of queue order")).to_be_visible()
    r = page.request.get(f"{BASE_URL}/api/learners/{learner_id(page)}/answers")
    assert "fifo_lifo" in r.text()
    g.get_by_role("button", name="Serve B (front)").click()
    expect(g.get_by_role("group", name="Vertices that join after serving B")).to_be_visible()


# ---------------------------------------------------------------- module quiz
def test_module_quiz_submit_then_feedback_then_try_a_similar_one(page):
    from app.core.practice import make_similar

    open_app(page, "/module/3?go=s10")
    part = page.locator("#s10")
    cards = part.locator("li.card")
    expect(cards).to_have_count(5)
    part.get_by_role("button", name="Submit").click()
    expect(part.get_by_text("Answer 5 more questions first.")).to_be_visible()
    cards.nth(0).get_by_role("radio", name="A stack", exact=True).check()  # wrong on purpose
    for i, opt in ((1, "[D, E]"), (2, "When it joins the queue"), (3, "B, A, D, C, E"), (4, "It loops forever (A adds B, B adds A …)")):
        cards.nth(i).get_by_role("radio", name=opt, exact=True).check()
    part.get_by_role("button", name="Submit").click()
    expect(part.get_by_text("You got 4 out of 5.")).to_be_visible()
    card = cards.nth(0)
    expect(card.get_by_text("Stack order instead of queue order")).to_be_visible()

    with page.expect_response(lambda r: "/api/practice/similar" in r.url) as resp:
        card.get_by_role("button", name="Try a similar one").click()
    q = resp.value.json()
    assert "ans" not in q, "the answer was sent to the browser"
    truth = make_similar(q["tag"], q["seed"])
    similar = card.locator("fieldset").last
    similar.get_by_role("radio", name=truth["opts"][truth["ans"]], exact=True).check()
    expect(card.locator("[role=status]").last).to_contain_text(re.compile("Yes"))


# ---------------------------------------------------------------- lecture-ready check
def test_lecture_ready_check_gives_a_readiness_report(page):
    open_app(page, "/module/4?go=s08")
    part = page.locator("#s08")
    cards = part.locator("li.card")
    plan = ["F", "['A', 'D', 'E']", "C, A, B, D, E", None, "3", "F"]  # R3 wrong on purpose
    for i, opt in enumerate(plan):
        c = cards.nth(i)
        if opt is None:
            c.locator("textarea").fill("so C cannot add it a second time")
            c.get_by_role("button", name="Compare with a model answer").click()
            c.get_by_role("button", name="Got it").click()
            continue
        c.get_by_role("radio", name=opt, exact=True).check()
        expect(c.locator("[role=status]").first).not_to_have_text("")
    expect(page.get_by_text("How sure are you?")).to_have_count(0)
    report = page.locator("#report-h").locator("xpath=..")
    expect(report.get_by_text("Ready is based on your answers")).to_be_visible()
    expect(report.get_by_role("button", name="Retry this objective")).to_have_count(1)
    r = page.request.get(f"{BASE_URL}/api/learners/{learner_id(page)}/report")
    assert r.ok and [o["status"] for o in r.json()["objectives"]] == ["Ready", "Ready", "Review", "Ready", "Ready"]


# ---------------------------------------------------------------- practice and full quiz
def test_practice_gives_new_questions_and_checks_them_on_the_server(page):
    from app.core import quizgen

    open_app(page, "/practice")
    with page.expect_response(lambda r: "/api/practice/round" in r.url) as resp:
        page.get_by_role("button", name=re.compile("Module 3")).click()
    r1 = resp.value.json()
    assert len(r1["questions"]) == 5 and all("ans" not in q for q in r1["questions"])
    truth = quizgen.practice_round(3, r1["seed"])
    card = page.locator("li").filter(has=page.get_by_text(r1["questions"][0]["prompt"], exact=True)).first
    q = truth["questions"][0]
    if q["type"] == "mcq":
        card.get_by_role("radio", name=q["opts"][q["ans"]], exact=True).check()
    else:
        card.get_by_placeholder("Type here").fill(q["answer"])
    card.get_by_role("button", name="Check").click()
    expect(card.get_by_text("Yes, that’s it.")).to_be_visible()
    expect(card.get_by_role("link", name=re.compile("Show me in the lesson"))).to_be_visible()

    with page.expect_response(lambda r: "/api/practice/round" in r.url) as resp2:
        page.get_by_role("button", name="New questions").first.click()
    assert resp2.value.json()["seed"] != r1["seed"]


def test_full_quiz_has_15_new_questions_and_marks_by_module(page):
    open_app(page, "/quiz")
    with page.expect_response(lambda r: "/api/quiz/full" in r.url) as resp:
        page.get_by_role("button", name="Start the quiz").click()
    quiz = resp.value.json()
    assert len(quiz["questions"]) == 15
    page.get_by_role("button", name="Submit quiz").click()
    expect(page.get_by_text("0 out of 15")).to_be_visible()
    expect(page.get_by_role("row", name=re.compile("Module 3 · BFS"))).to_contain_text("0 of 6")
    expect(page.get_by_text("Earlier scores: 0/15")).to_be_visible()
    with page.expect_response(lambda r: "/api/quiz/full" in r.url) as resp2:
        page.get_by_role("button", name="Take a new quiz").click()
    assert resp2.value.json()["seed"] != quiz["seed"]


# ---------------------------------------------------------------- settings
def test_settings_change_persists_after_reload(page):
    open_app(page, "/settings")
    before = page.evaluate("getComputedStyle(document.documentElement).fontSize")
    page.get_by_role("button", name="Extra large").click()
    page.get_by_role("switch", name="Reduce motion").check()
    page.get_by_role("group", name="Colours").get_by_role("button", name=re.compile("contrast", re.I)).click()
    after = page.evaluate("getComputedStyle(document.documentElement).fontSize")
    assert float(after[:-2]) > float(before[:-2])

    page.reload()
    open_app(page, "/settings")
    expect(page.get_by_role("button", name="Extra large")).to_have_attribute("aria-pressed", "true")
    expect(page.get_by_role("switch", name="Reduce motion")).to_be_checked()
    assert page.evaluate("document.documentElement.getAttribute('data-theme')") == "contrast"
    assert page.evaluate("getComputedStyle(document.documentElement).fontSize") == after


# ---------------------------------------------------------------- clear all
def test_clear_all_my_progress_resets_everything(page):
    open_app(page, "/")
    page.get_by_role("button", name=re.compile("change your name")).click()
    page.get_by_label("Your name (optional)").fill("Palesa")
    page.keyboard.press("Enter")
    page.locator("label", has_text="Do the warm-up (Module 1)").click()
    expect(page.get_by_text("3 left")).to_be_visible()
    open_app(page, "/module/1?go=s03")
    page.locator("#s03 li.card").first.get_by_role("radio", name="A graph", exact=True).check()
    expect(page.locator("#s03 li.card").first.get_by_text("Module 2 starts here")).to_be_visible()

    def saved():
        s = server_state(page)
        return "profile" in s and "todos" in s and "answers" in s

    for _ in range(20):
        if saved():
            break
        page.wait_for_timeout(250)
    assert saved(), f"progress never reached the server: {sorted(server_state(page))}"

    open_app(page, "/settings")
    page.get_by_role("button", name="Clear all my progress and data").click()
    expect(page.get_by_text("have been cleared, here and on the server")).to_be_visible()
    left = server_state(page)
    assert not any(k in left for k in ("profile", "todos", "answers")), f"still on the server: {sorted(left)}"

    page.reload()
    open_app(page, "/")
    expect(page.locator(".namebtn")).to_contain_text("Learner")
    expect(page.get_by_text("4 left")).to_be_visible()
