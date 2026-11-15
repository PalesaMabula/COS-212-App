"""
My analysis and the readiness report, worked out only from what the student did.

Inputs (all saved per guest):
    answers    every checked answer, recorded by the server (first try and latest)
    track      study time by way of learning and by concept, per day (from the browser)
    topics     modules the student finished
    questions  questions the student wrote for the lecture

Nothing about the course is written here. The concepts, where each is taught, the
wording of insights and tips, the thresholds and limits all come from the "analysis"
block in content/course.json. Which misconceptions belong to which objective comes
from content/misconceptions.json. There is no sample data: a student with no data
gets an empty state, never invented numbers.

Readiness rules (the lecture-ready check). Time spent is never part of it:
    Ready      the question was right (an explain question: self-rated "Got it")
    Review     not right yet
An objective marked Review becomes Ready if a "Retry this objective" question is
answered right. The comparison is ipsative: the student against their own warm-up only.
"""

from collections import Counter
from datetime import date, timedelta

from ..content import loader

WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _cfg():
    return loader.course().analysis


def _modes() -> list[str]:
    return list(_cfg().modes)


def _concept_names() -> list[str]:
    return [c.name for c in _cfg().concepts]


def _concept_link(name: str) -> tuple[str, str]:
    c = next(c for c in _cfg().concepts if c.name == name)
    return c.topic, c.go


def _alias(name: str) -> str:
    return _cfg().aliases.get(name, name)


def _fmt(secs: float) -> str:
    secs = int(secs)
    return f"{round(secs / 60)} min" if secs >= 60 else f"{secs} s"


def _first(rec: dict | None) -> dict | None:
    return rec.get("first") if rec else None


def _lower_first(text: str) -> str:
    return text[:1].lower() + text[1:] if text else text


# --------------------------------------------------------------------------
# Objectives and their misconceptions (from misconceptions.json)
# --------------------------------------------------------------------------


def objective_tags() -> dict[int, list[str]]:
    """Objective number -> the misconception tags that belong to it."""
    out: dict[int, list[str]] = {}
    for tag, m in loader.misconceptions().items():
        out.setdefault(m.objective, []).append(tag)
    return out


def retry_tag(objective: int, answers: dict) -> str | None:
    """The tag to retry: the misconception behind this objective's lecture-ready-check mistake if there was one."""
    tags = objective_tags().get(objective, [])
    _, quiz = loader.quiz_by_mode("ready")
    for q in quiz.questions:
        rec = _first(answers.get(quiz.quiz, {}).get(q.id))
        if q.objective == objective and rec and rec.get("tag") in tags:
            return rec["tag"]
    return tags[0] if tags else None


# --------------------------------------------------------------------------
# Readiness report (the lecture-ready check)
# --------------------------------------------------------------------------


def readiness(answers: dict, own_questions: list | None = None) -> dict | None:
    _, quiz = loader.quiz_by_mode("ready")
    warm_topic, warm = loader.quiz_by_mode("warmup")
    given = answers.get(quiz.quiz, {})
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

    now_right = sum(1 for i in items if i["right"])
    if warm is not None:
        warm_given = answers.get(warm.quiz, {})
        warm_right = sum(1 for q in warm.questions if (_first(warm_given.get(q.id)) or {}).get("right"))
        warm_total = len(warm.questions)
    else:
        warm_given, warm_right, warm_total = {}, 0, 0
    w = _cfg().wording
    nums = {"now": now_right, "total": len(quiz.questions), "warm": warm_right, "warm_total": warm_total}
    if warm_given:
        comparison = w.compareBoth.format(**nums)
    elif warm is not None:
        comparison = w.compareNoWarmup.format(**nums, module=warm_topic)
    else:
        comparison = w.compareNow.format(**nums)

    questions = list(loader.course().default_questions)
    questions += [x.get("text", "") for x in (own_questions or []) if x.get("text")]

    return {
        "note": _cfg().readyNote,
        "items": items,
        "objectives": objectives,
        "ready_count": sum(1 for o in objectives if o["status"] == "Ready"),
        "warmup": {"right": warm_right, "total": warm_total, "taken": bool(warm_given)},
        "now": {"right": now_right, "total": len(quiz.questions)},
        "comparison": comparison,
        "questions": questions,
    }


# --------------------------------------------------------------------------
# My analysis
# --------------------------------------------------------------------------


def _accuracy(track: dict, answers: dict) -> dict:
    """Right/total per concept: lesson practice (browser) + checked answers (server, first try, no warm-up)."""
    acc = {c: [0, 0] for c in _concept_names()}
    for c, (r, n) in (track.get("acc") or {}).items():
        c = _alias(c)
        if c in acc:
            acc[c][0] += r
            acc[c][1] += n

    _, warm = loader.quiz_by_mode("warmup")
    warm_id = warm.quiz if warm else None
    concept_of = {}
    for t in loader.topics():
        for s in t.sections:
            for q in getattr(s, "questions", []) or []:
                concept_of[(getattr(s, "quiz", None), q.id)] = _alias(q.concept or t.concept or "")
            if getattr(s, "kind", None) == "trace":
                for i, _ in enumerate(s.steps):
                    concept_of[(f"trace:{s.trace}", str(i))] = _alias(t.concept or "")
    for quiz, recs in answers.items():
        if quiz == warm_id or quiz.startswith("_") or not isinstance(recs, dict):
            continue
        for qid, rec in recs.items():
            first = _first(rec)
            c = concept_of.get((quiz, qid))
            if first is None or first.get("right") is None or c not in acc:
                continue
            acc[c][0] += 1 if first["right"] else 0
            acc[c][1] += 1

    kinds, sources = _cfg().practiceKinds, set(_cfg().practiceSources)
    for e in answers.get("_log", []):
        c = kinds.get(e.get("kind"))
        if e.get("source") in sources and c in acc and e.get("right") is not None:
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
        if not m:
            continue
        slips.append({"tag": tag, "count": n, "title": m["title"], "explain": m["explain"], "concept": m["concept"],
                      "objective": m["objective"], "link": f"{m['topic']}?go={m['go']}", "label": m["label"]})
    return {"slips": slips, "objectives": {o: {"right": r, "total": n} for o, (r, n) in by_obj.items()}}


def analysis(state: dict, answers: dict, today: date | None = None) -> dict:
    cfg = _cfg()
    limits = cfg.limits
    modes_order = _modes()
    track = state.get("track") or {}

    # Time by way of learning: real data only.
    modes = {m: (track.get("modes") or {}).get(m, 0) for m in modes_order}
    total_secs = sum(modes.values())
    enough_time = total_secs >= cfg.minMinutes * 60
    words = cfg.wording

    acc = _accuracy(track, answers)
    answered = sum(n for _, n in acc.values())
    empty = total_secs == 0 and answered == 0

    ranked = sorted(modes_order, key=lambda m: -modes[m])
    top, low = ranked[0], ranked[-1]
    if enough_time:
        ins = cfg.modes[top]
        stretch = cfg.modes[low].stretch
        insight = {"head": ins.head, "body": ins.body, "tips": list(ins.tips), "stretch": stretch}
    else:
        stretch = ""
        insight = {"head": cfg.notEnoughHead, "body": cfg.emptyMessage, "tips": [], "stretch": ""}

    concept_time: dict[str, float] = {}
    for c, secs in (track.get("concepts") or {}).items():
        c = _alias(c)
        concept_time[c] = concept_time.get(c, 0) + secs

    seen = mistakes(answers)
    concepts = []
    for c in _concept_names():
        r, n = acc.get(c, [0, 0])
        pct = round(r / n * 100) if n else None
        status = "Not checked" if pct is None else ("Review" if pct < cfg.reviewBelow else "Ready")
        if status == "Review":
            advice = (words.adviceReview.format(stretch=_lower_first(stretch))
                      if stretch else words.adviceReviewPlain)
        elif status == "Ready":
            advice = words.adviceReady
        else:
            advice = words.adviceNotChecked
        slips = [x for x in seen["slips"] if x["concept"] == c][:limits.slipsPerConcept]
        if slips and status == "Ready":
            status = "Review"  # a misconception showed up, even if most answers were right
            advice = words.adviceSlip
        topic_id, part = _concept_link(c)
        review = slips[0]["link"] if slips else f"{topic_id}?go={part}"
        concepts.append({"name": c, "secs": concept_time.get(c, 0), "time": _fmt(concept_time.get(c, 0)),
                         "right": r, "total": n, "pct": pct, "status": status, "advice": advice, "topic": topic_id,
                         "review": review, "slips": slips})

    # A personal focus line, from this student's own answers.
    checked = [c for c in concepts if c["total"]]
    weakest = min(checked, key=lambda c: (c["pct"], -c["total"])) if checked else None
    focus = []
    if weakest and weakest["pct"] < cfg.reviewBelow:
        focus.append(words.focusWeakest.format(name=weakest["name"], right=weakest["right"], total=weakest["total"]))
    if seen["slips"]:
        s = seen["slips"][0]
        focus.append(words.focusSlip.format(title=_lower_first(s["title"]), count=s["count"]))
    insight["focus"] = " ".join(focus) or None

    all_r = sum(c["right"] for c in concepts)
    all_n = sum(c["total"] for c in concepts)

    # This week: the student's real minutes per day (zeros are fine).
    today = today or date.today()
    monday = today - timedelta(days=today.weekday())
    days = track.get("days") or {}
    week = [round(days.get((monday + timedelta(days=i)).isoformat(), 0) / 60) for i in range(7)]

    done = state.get("topics") or {}
    ids = [t.id for t in loader.topics()]
    done_ids = [i for i in ids if done.get(i)]
    report = readiness(answers, state.get("questions"))
    ready_topic, ready_quiz = loader.quiz_by_mode("ready")

    review = [c for c in concepts if c["status"] == "Review"]
    titles = {t.id: t.title for t in loader.topics()}
    plan = [words.planSlip.format(module=s["link"].split("?")[0], title=s["title"].lower())
            for s in seen["slips"][:1]]
    plan += [words.planReview.format(module=c["topic"], title=titles[c["topic"]], concept=c["name"])
             for c in review[:2] if not c["slips"]]
    if not empty and not review and not seen["slips"]:
        unchecked = [c for c in concepts if c["status"] == "Not checked" and concept_time.get(c["name"])]
        plan += [words.planPractise.format(module=c["topic"], concept=c["name"]) for c in unchecked[:1]]
    nxt = next((i for i in ids if not done.get(i)), None)
    if nxt:
        plan.append(words.planNext.format(module=nxt, title=titles[nxt]))
    if not report:
        plan.append(words.planReadyCheck.format(module=ready_topic))
    plan.append(words.planQuestion)

    # Goal by goal: the lecture-ready check decides once it's done; before that, the student's own tries.
    tones = {"Ready": "ok", "Review": "warn"}
    if report:
        goals = report["objectives"]
        for g in goals:
            g["tone"] = tones.get(g["status"], "lilac")
    else:
        goals = []
        for o in loader.course().objectives:
            st = seen["objectives"].get(o.num) or {"right": 0, "total": 0}
            slip = next((x for x in seen["slips"] if x["objective"] == o.num), None)
            if not st["total"]:
                status, tone = words.goalNotChecked, "lilac"
            elif slip or st["right"] / st["total"] * 100 < cfg.reviewBelow:
                status, tone = words.goalReview, "warn"
            else:
                status, tone = words.goalGood, "ok"
            goals.append({"num": o.num, "text": o.text, "level": o.level, "status": status, "tone": tone,
                          "see": slip["link"] if slip and tone == "warn" else None})
    for g in goals:
        g["attempts"] = seen["objectives"].get(g["num"]) or {"right": 0, "total": 0}

    # Questions to bring: first for the concepts this student is finding hard, then the course's
    # starter questions to fill up, then every question the student wrote themselves.
    links = {c.name: c for c in cfg.concepts}
    hard = [x["concept"] for x in seen["slips"]] + [c["name"] for c in review]
    suggested = []
    for name in hard:
        q = links[name].question if name in links else None
        if q and q not in suggested:
            suggested.append(q)
    for q in loader.course().default_questions:
        if len(suggested) >= limits.questions:
            break
        if q not in suggested:
            suggested.append(q)
    own = [q.get("text", "") for q in (state.get("questions") or []) if q.get("text")]
    questions = suggested[:limits.questions] + own

    ready_go = None
    if ready_quiz is not None:
        for sec in loader.topic(ready_topic).sections:
            if sec is ready_quiz:
                break
            if getattr(sec, "kind", None) == "part":
                ready_go = sec.id

    return {
        "sample": False,  # kept for older front ends; there is never sample data now
        "empty": empty,
        "enough_time": enough_time,
        "message": cfg.emptyMessage if empty else None,
        "total": _fmt(total_secs),
        "modes": [{"name": m, "secs": modes[m], "time": _fmt(modes[m]),
                   "pct": round(modes[m] / total_secs * 100) if total_secs else 0} for m in modes_order],
        "top": top if enough_time else None,
        "low": low if enough_time else None,
        "insight": insight,
        "accuracy": {"right": all_r, "total": all_n, "pct": round(all_r / all_n * 100) if all_n else None},
        "topics": {"done": len(done_ids), "total": len(ids)},
        "goals_ready": {"ready": report["ready_count"] if report else 0, "total": len(loader.course().objectives)},
        "concepts": concepts,
        "slips": seen["slips"][:limits.slips],
        "week": [{"day": d, "mins": m} for d, m in zip(WEEKDAYS, week)],
        "plan": plan[:limits.plan],
        "goals": goals,
        "report": report,
        "questions": questions,
        "ready_link": f"{ready_topic}?go={ready_go}" if ready_go else ready_topic,
    }
