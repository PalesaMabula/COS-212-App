"""
My analysis and the readiness report (end of Module 4), worked out from what the student did.

Inputs (all saved per guest):
    answers    every checked answer, recorded by the server (first try and latest)
    track      study time by way of learning and by concept, per day (from the browser)
    topics     modules the student finished
    questions  questions the student wrote for the lecture

Readiness rules (from the course content, the lecture-ready check). Time spent is never part of it:
    Ready      the question was right (R4: self-rated "Got it")
    Review     not right yet
An objective marked Review becomes Ready if a "Retry this objective" question is
answered right. The comparison is ipsative: the student against their own warm-up only.
"""

from collections import Counter
from datetime import date, timedelta

from ..content import loader

MODES = ["Watching", "Listening", "Reading", "Trying", "Coding", "Practising"]
CONCEPTS = ["Graphs", "Graphs in Python", "Queues", "BFS", "Marking found", "Routes"]
# Where each concept is taught: (module, part).
CONCEPT_TOPIC = {"Graphs": "2", "Graphs in Python": "2", "Queues": "3", "BFS": "3", "Marking found": "3", "Routes": "4"}
CONCEPT_PART = {"Graphs": "s02", "Graphs in Python": "s04", "Queues": "s02", "BFS": "s04", "Marking found": "s03", "Routes": "s03"}
# Practice and Full quiz questions: the concept each kind of question checks.
KIND_CONCEPT = {"nbr": "Graphs in Python", "degree": "Graphs", "iso": "Graphs", "routeLen": "Graphs", "order": "BFS",
                "queue": "Queues", "level": "BFS", "bug": "Marking found", "hops": "Routes", "route": "Routes",
                "reach": "Routes", "parent": "Routes"}
# Older lesson data used this name for the code lab.
CONCEPT_ALIASES = {"BFS in Python": "BFS"}

SAMPLE = {
    "modes": {"Watching": 540, "Listening": 1260, "Reading": 600, "Trying": 480, "Coding": 300, "Practising": 660},
    "concepts": {"Graphs": 900, "Graphs in Python": 300, "Queues": 600, "BFS": 1500, "Marking found": 240, "Routes": 300},
    "acc": {"Graphs": [5, 6], "Graphs in Python": [2, 2], "Queues": [4, 5], "BFS": [6, 10], "Marking found": [1, 2], "Routes": [0, 0]},
    "week": [12, 0, 18, 25, 9, 0, 0],
}

INSIGHTS = {
    "Watching": ("You've spent most of your time watching.", "Most of your time went to the animations.",
                 ["Pause at each chapter and predict what happens next before you press play.",
                  "Sketch graph A–F and colour it in as the animation plays.",
                  "Replay \u201cThe queue is a line\u201d (Module 3, section 02) before the lecture."]),
    "Listening": ("You've spent most of your time listening.", "Most of your time went to the notes read aloud.",
                  ["Play the notes at 1.25× while you trace BFS on paper.",
                   "Use the microphone to explain each step out loud, then compare with the model answer.",
                   "Listen to Module 3 once more on the way to class."]),
    "Reading": ("You've spent most of your time reading.", "Most of your time went to the written notes.",
                ["Rewrite the BFS recipe in your own words in three lines.",
                 "Turn the glossary into flashcards and test yourself.",
                 "Read the BFS code line by line in the Code lab."]),
    "Trying": ("You've spent most of your time trying things.", "Most of your time went to trial and error on the map.",
               ["Do a Mixed practice round: every round has a new graph.",
                "When you miss one, say why the wrong answer fails before moving on.",
                "Use Next step in Module 3, section 04, and predict each row first."]),
    "Coding": ("You've spent most of your time coding.", "Most of your time went to the code labs.",
               ["Predict the printed output before you press Run.",
                "Change the start vertex and run it again.",
                "Add a new vertex to the graph dictionary and see what changes."]),
    "Practising": ("You've spent most of your time practising.", "Most of your time went to practice questions.",
                   ["Try the Full quiz: 15 new questions across all modules.",
                    "For any miss, press Show me in the lesson and watch that step.",
                    "Practise the module you scored lowest on first."]),
}

STRETCH = {
    "Watching": "Watch one animation and pause at each chapter to predict what comes next.",
    "Listening": "Press a speaker on the notes and trace along on paper as you listen.",
    "Reading": "Read the notes on screen once without audio, then summarise them in one line.",
    "Trying": "Spend five minutes in Be the Queue (Module 3, section 06), where it's fine to get it wrong.",
    "Coding": "Open a code lab and press Step five times while watching the queue.",
    "Practising": "Do a practice round straight after an animation.",
}


def _fmt(secs: float) -> str:
    secs = int(secs)
    return f"{round(secs / 60)} min" if secs >= 60 else f"{secs} s"


def _first(rec: dict | None) -> dict | None:
    return rec.get("first") if rec else None


# Parallel questions for "Retry this objective": the misconceptions each objective covers.
OBJECTIVE_TAGS = {
    1: ["count_places_not_edges", "length_is_cost"],
    2: ["one_way_edge"],
    3: ["fifo_lifo", "wrong_layer"],
    4: ["mark_on_serve", "duplicate"],
    5: ["unreachable", "parent_reversed"],
}
READY_NOTE = "Ready is based on your answers, not on time spent."


def retry_tag(objective: int, answers: dict) -> str:
    """The tag to retry: the misconception behind this objective's lecture-ready-check mistake if there was one."""
    quiz = loader.find_section("4", "ready")
    for q in quiz.questions:
        rec = _first(answers.get("ready", {}).get(q.id))
        if q.objective == objective and rec and rec.get("tag") in OBJECTIVE_TAGS[objective]:
            return rec["tag"]
    return OBJECTIVE_TAGS[objective][0]


# --------------------------------------------------------------------------
# Readiness report (the lecture-ready check, end of Module 4)
# --------------------------------------------------------------------------


def readiness(answers: dict, own_questions: list | None = None) -> dict | None:
    quiz = loader.find_section("4", "ready")
    warm = loader.find_section("1", "warmup")
    given = answers.get("ready", {})
    if not given:
        return None

    items = []
    for q in quiz.questions:
        a = _first(given.get(q.id))
        status = "Not answered" if a is None else ("Ready" if a.get("right") else "Review")
        items.append({"id": q.id, "q": q.q, "objective": q.objective, "status": status, "see": q.see,
                      "right": a.get("right") if a else None})

    objectives = []
    for o in loader.course().objectives:
        mine = [i for i in items if i["objective"] == o.num]
        ready = bool(mine) and all(i["status"] == "Ready" for i in mine)
        status = "Ready" if ready else ("Not answered" if all(i["status"] == "Not answered" for i in mine) else "Review")
        retry = (answers.get("retry") or {}).get(str(o.num))
        retried = False
        if status == "Review" and retry and retry.get("right"):
            status, retried = "Ready", True
        objectives.append({"num": o.num, "text": o.text, "level": o.level, "status": status, "retried": retried,
                           "can_retry": status == "Review",
                           "see": None if status == "Ready" else next((i["see"] for i in mine if i["status"] != "Ready"), None)})

    warm_given = answers.get("warmup", {})
    warm_right = sum(1 for q in warm.questions if (_first(warm_given.get(q.id)) or {}).get("right"))
    now_right = sum(1 for i in items if i["right"])
    questions = list(loader.course().default_questions)
    questions += [x.get("text", "") for x in (own_questions or []) if x.get("text")]

    return {
        "note": READY_NOTE,
        "items": items,
        "objectives": objectives,
        "ready_count": sum(1 for o in objectives if o["status"] == "Ready"),
        "warmup": {"right": warm_right, "total": len(warm.questions), "taken": bool(warm_given)},
        "now": {"right": now_right, "total": len(quiz.questions)},
        "comparison": (f"Warm-up: {warm_right} of {len(warm.questions)}. Now: {now_right} of {len(quiz.questions)}."
                       if warm_given else f"Now: {now_right} of {len(quiz.questions)}. (Do the warm-up in Module 1 to compare.)"),
        "questions": questions,
    }


# --------------------------------------------------------------------------
# My analysis
# --------------------------------------------------------------------------


def _accuracy(track: dict, answers: dict) -> dict:
    """Right/total per concept: lesson practice (browser) + checked answers (server, first try, no warm-up)."""
    acc = {c: [0, 0] for c in CONCEPTS}
    for c, (r, n) in (track.get("acc") or {}).items():
        c = CONCEPT_ALIASES.get(c, c)
        if c in acc:
            acc[c][0] += r
            acc[c][1] += n
    concept_of = {}
    for t in loader.topics():
        for s in t.sections:
            for q in getattr(s, "questions", []) or []:
                concept_of[(getattr(s, "quiz", None), q.id)] = q.concept or t.concept
            if getattr(s, "kind", None) == "trace":
                for i, _ in enumerate(s.steps):
                    concept_of[(f"trace:{s.trace}", str(i))] = t.concept
    for quiz, recs in answers.items():
        if quiz == "warmup" or quiz.startswith("_"):
            continue
        for qid, rec in recs.items():
            first = _first(rec)
            c = concept_of.get((quiz, qid))
            if first is None or first.get("right") is None or c not in acc:
                continue
            acc[c][0] += 1 if first["right"] else 0
            acc[c][1] += 1
    for e in answers.get("_log", []):
        c = KIND_CONCEPT.get(e.get("kind"))
        if e.get("source") in ("practice", "fullquiz") and c in acc and e.get("right") is not None:
            acc[c][0] += 1 if e["right"] else 0
            acc[c][1] += 1
    return acc


def mistakes(answers: dict) -> dict:
    """
    From the attempt log: misconception tags seen (not in the warm-up, which has no
    marks) and right/total per objective. Every try counts here, not just the first.
    """
    log = [e for e in answers.get("_log", []) if e.get("source") != "warmup"]
    tags = Counter(e["tag"] for e in log if e.get("tag") and not e.get("right"))
    by_obj: dict[int, list[int]] = {}
    for e in log:
        o = e.get("objective")
        if o and e.get("right") is not None:
            r = by_obj.setdefault(o, [0, 0])
            r[0] += 1 if e["right"] else 0
            r[1] += 1
    slips = []
    for tag, n in tags.most_common():
        m = loader.misconception(tag)
        slips.append({"tag": tag, "count": n, "title": m["title"], "explain": m["explain"], "concept": m["concept"],
                      "objective": m["objective"], "link": f"{m['topic']}?go={m['go']}", "label": m["label"]})
    return {"slips": slips, "objectives": {o: {"right": r, "total": n} for o, (r, n) in by_obj.items()}}


def analysis(state: dict, answers: dict, today: date | None = None) -> dict:
    track = state.get("track") or {}
    modes_real = {m: (track.get("modes") or {}).get(m, 0) for m in MODES}
    sample = sum(modes_real.values()) == 0
    modes = SAMPLE["modes"] if sample else modes_real
    total = sum(modes.values()) or 1

    ranked = sorted(MODES, key=lambda m: -modes[m])
    top, low = ranked[0], ranked[-1]
    head, body, tips = INSIGHTS[top]

    concept_time = dict(SAMPLE["concepts"]) if sample else {}
    if not sample:
        for c, secs in (track.get("concepts") or {}).items():
            c = CONCEPT_ALIASES.get(c, c)
            concept_time[c] = concept_time.get(c, 0) + secs
    acc = {c: list(v) for c, v in SAMPLE["acc"].items()} if sample else _accuracy(track, answers)

    seen = mistakes(answers)
    concepts = []
    for c in CONCEPTS:
        r, n = acc.get(c, [0, 0])
        pct = round(r / n * 100) if n else None
        status = "Not checked" if pct is None else ("Review" if pct < 70 else "Ready")
        advice = {
            "Not checked": "Do a few questions to check this one.",
            "Review": "Some answers here aren't right yet. Try it a different way: " + STRETCH[low][0].lower() + STRETCH[low][1:],
            "Ready": "Looking good. A quick recap before the lecture is enough.",
        }[status]
        slips = [x for x in seen["slips"] if x["concept"] == c][:2]
        if slips and status == "Ready":
            status = "Review"  # a misconception showed up, even if most answers were right
            advice = "Mostly right, but one mistake keeps showing up. Have a look at it below."
        review = slips[0]["link"] if slips else f"{CONCEPT_TOPIC[c]}?go={CONCEPT_PART[c]}"
        concepts.append({"name": c, "secs": concept_time.get(c, 0), "time": _fmt(concept_time.get(c, 0)),
                         "right": r, "total": n, "pct": pct, "status": status, "advice": advice, "topic": CONCEPT_TOPIC[c],
                         "review": review, "slips": slips})

    all_r = sum(c["right"] for c in concepts)
    all_n = sum(c["total"] for c in concepts)

    today = today or date.today()
    monday = today - timedelta(days=today.weekday())
    days = track.get("days") or {}
    week = [round(days.get((monday + timedelta(days=i)).isoformat(), 0) / 60) for i in range(7)]
    if sample or not any(week):
        week = SAMPLE["week"]

    done = state.get("topics") or {}
    ids = [t.id for t in loader.topics()]
    done_ids = [i for i in ids if done.get(i)]
    report = readiness(answers, state.get("questions"))

    review = [c for c in concepts if c["status"] == "Review"]
    titles = {t.id: t.title for t in loader.topics()}
    plan = [f"Revisit Module {s['link'].split('?')[0]} for “{s['title'].lower()}”, then try a similar question." for s in seen["slips"][:1]]
    plan += [f"Revisit Module {c['topic']} {titles[c['topic']]} ({c['name']}), using a different way to learn." for c in review[:2] if not c["slips"]]
    nxt = next((i for i in ids if not done.get(i)), None)
    if nxt:
        plan.append(f"Carry on with Module {nxt}: {titles[nxt]}.")
    if not report:
        plan.append("Take the lecture-ready check at the end of Module 4 to get your readiness report.")
    plan.append("Write down one question to bring to the lecture.")

    goals = report["objectives"] if report else [
        {"num": o.num, "text": o.text, "level": o.level, "status": "Not checked yet", "see": None}
        for o in loader.course().objectives
    ]
    for g in goals:
        st = seen["objectives"].get(g["num"])
        g["attempts"] = st or {"right": 0, "total": 0}

    return {
        "sample": sample,
        "total": _fmt(sum(modes.values())),
        "modes": [{"name": m, "secs": modes[m], "time": _fmt(modes[m]), "pct": round(modes[m] / total * 100)} for m in MODES],
        "top": top,
        "low": low,
        "insight": {"head": head, "body": body, "tips": tips, "stretch": STRETCH[low]},
        "accuracy": {"right": all_r, "total": all_n, "pct": round(all_r / all_n * 100) if all_n else None},
        "topics": {"done": len(done_ids), "total": len(ids)},
        "goals_ready": {"ready": report["ready_count"] if report else 0, "total": len(loader.course().objectives)},
        "concepts": concepts,
        "slips": seen["slips"][:3],
        "week": [{"day": d, "mins": m} for d, m in zip(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], week)],
        "plan": plan[:3],
        "goals": goals,
        "report": report,
        "questions": report["questions"] if report else list(loader.course().default_questions)
        + [q.get("text", "") for q in (state.get("questions") or []) if q.get("text")],
    }
