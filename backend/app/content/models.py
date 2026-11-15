"""
Schema for the course content (content/course.json and content/modules/*.json).

Every file is validated when the server starts, so a typo in the content stops
the server with a clear message instead of breaking a screen. Cross-checks
(answers in range, topic links that exist, trace frames that exist) are in
loader.py.
"""

import string
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


# The misconceptions a wrong option can be tagged with (content/misconceptions.json).
TAGS = ("fifo_lifo", "wrong_layer", "mark_on_serve", "duplicate", "parent_reversed",
        "unreachable", "count_places_not_edges", "length_is_cost", "one_way_edge")
Tag = Literal[TAGS]  # type: ignore[valid-type]


class Misconception(Strict):
    title: str
    explain: str
    topic: str
    go: str
    label: str
    concept: str
    objective: int


def _check_tags(owner: str, opts: list[str], ans: int | None, tags: list) -> None:
    """tags[i] is the misconception behind wrong option i; the right option has none."""
    if not tags:
        return
    if len(tags) != len(opts):
        raise ValueError(f"{owner}: tags must have one entry per option")
    if ans is not None and tags[ans] is not None:
        raise ValueError(f"{owner}: the right option can't have a misconception tag")


# ------------------------------ course ------------------------------


class Way(Strict):
    title: str
    icon: str
    text: str


class ModuleInfo(Strict):
    num: int
    title: str
    colour: str
    art: str
    summary: str


class Objective(Strict):
    num: int
    text: str
    level: Literal["Explain", "Apply", "Evaluate"]
    practised: str
    checked: str


class GlossaryItem(Strict):
    term: str
    meaning: str
    topic: str


class Lecture(Strict):
    label: str
    date: str
    example: bool = False


class ChecklistItem(Strict):
    id: str
    text: str
    topic: str


class ModeInsight(Strict):
    """What My analysis says when this way of learning is the one used most (or least: stretch)."""
    head: str
    body: str
    tips: list[str] = Field(min_length=1)
    stretch: str


class ConceptLink(Strict):
    """A concept shown in My analysis and the part of a module page that teaches it."""
    name: str
    topic: str
    go: str
    question: str | None = None  # a question to bring to the lecture if this concept needs work


class AnalysisLimits(Strict):
    plan: int = Field(3, ge=1)
    slips: int = Field(3, ge=1)
    slipsPerConcept: int = Field(2, ge=1)
    questions: int = Field(3, ge=1)  # suggested lecture questions (the student's own are always added)


class AnalysisWording(Strict):
    """Sentences My analysis builds. {braces} are filled in from the student's own data."""
    adviceReview: str
    adviceReviewPlain: str
    adviceReady: str
    adviceNotChecked: str
    adviceSlip: str
    focusWeakest: str
    focusSlip: str
    planSlip: str
    planReview: str
    planNext: str
    planReadyCheck: str
    planQuestion: str
    planPractise: str
    goalGood: str
    goalReview: str
    goalNotChecked: str
    compareBoth: str
    compareNoWarmup: str
    compareNow: str

    @model_validator(mode="after")
    def check_placeholders(self):
        # Each sentence may only use the {names} the code fills in, so a typo is caught at start-up.
        allowed = {
            "adviceReview": {"stretch"}, "focusWeakest": {"name", "right", "total"}, "focusSlip": {"title", "count"},
            "planSlip": {"module", "title"}, "planReview": {"module", "title", "concept"}, "planNext": {"module", "title"},
            "planReadyCheck": {"module"}, "planPractise": {"module", "concept"}, "compareBoth": {"now", "total", "warm", "warm_total"},
            "compareNoWarmup": {"now", "total", "warm", "warm_total", "module"}, "compareNow": {"now", "total", "warm", "warm_total"},
        }
        for field in type(self).model_fields:
            names = {n for _, n, _, _ in string.Formatter().parse(getattr(self, field)) if n}
            bad = names - allowed.get(field, set())
            if bad:
                raise ValueError(f"analysis.wording.{field} uses unknown placeholder(s): {', '.join(sorted(bad))}")
        return self


class AnalysisConfig(Strict):
    """Everything My analysis and the readiness report say or decide, kept out of the code."""
    reviewBelow: int = Field(70, ge=0, le=100)  # a concept under this % correct is marked Review
    minMinutes: int = Field(5, ge=0)  # study time needed before describing how the student studies
    readyNote: str
    emptyMessage: str
    notEnoughHead: str
    limits: AnalysisLimits = AnalysisLimits()
    concepts: list[ConceptLink] = Field(min_length=1)
    aliases: dict[str, str] = {}  # old concept names in saved data -> current names
    practiceSources: list[str] = []  # attempt-log sources counted towards concept accuracy
    practiceKinds: dict[str, str] = {}  # practice question kind -> concept
    modes: dict[str, ModeInsight] = Field(min_length=1)  # the ways of learning, in display order
    wording: AnalysisWording

    @model_validator(mode="after")
    def check_names(self):
        names = [c.name for c in self.concepts]
        if len(names) != len(set(names)):
            raise ValueError("analysis.concepts: duplicate concept names")
        for kind, c in self.practiceKinds.items():
            if c not in names:
                raise ValueError(f"analysis.practiceKinds.{kind}: unknown concept '{c}'")
        for old, new in self.aliases.items():
            if new not in names:
                raise ValueError(f"analysis.aliases.{old}: unknown concept '{new}'")
        return self


class Course(Strict):
    title: str
    code: str
    tagline: str
    goal: str
    facts: list[str]
    lecture: Lecture
    about: list[str]
    ways: list[Way]
    modules: list[ModuleInfo]
    objectives: list[Objective]
    glossary: list[GlossaryItem]
    default_questions: list[str]
    checklist: list[ChecklistItem]
    analysis: AnalysisConfig


# ------------------------------ sections ------------------------------


class Scene(Strict):
    """What the code-drawn video shows during one chapter (all optional)."""

    style: Literal["buildings", "graph"] = "graph"
    morph: bool = False
    edges: bool = True
    drawEdges: bool = False
    shuffle: bool = False
    dim: bool = False
    focus: str | None = None
    highlight: list[str] = []
    waiting: list[str] = []
    edgeHighlight: list[list[str]] = []
    path: list[str] = []
    trail: list[str] = []
    parents: dict[str, str] = {}
    ripple: str | None = None
    rings: dict[str, int] = {}
    line: dict | None = None
    stack: list[str] = []
    queueStrip: list[str] = []
    tag: str | None = None
    title: str | None = None
    subtitle: str | None = None
    ask: list[str] = []  # a question mark above these vertices
    dashed: list[str] = []  # dashed outline (e.g. an unreachable vertex)
    chips: list[str] = []  # summary labels along the bottom
    serving: str | None = None  # shown at the start of the queue strip
    book: list[str] = []  # the "guestbook" (found set) panel
    bookTitle: str | None = None
    hang: Literal["move", "on"] | None = None  # balls and strings: lift the graph by A
    rowLabels: bool = False  # level numbers beside the hanging rows


class Chapter(Strict):
    label: str
    caption: str
    scene: Scene | None = None


class VideoSection(Strict):
    kind: Literal["video"]
    chapters: list[Chapter] = Field(min_length=2)
    bfs: str | None = None  # draw from real BFS frames from this start (3.2)


class NotesSection(Strict):
    kind: Literal["notes"]
    title: str | None = None
    listenAll: bool = False
    paragraphs: list[str] = Field(min_length=1)


class Word(Strict):
    term: str
    meaning: str


class WordsSection(Strict):
    kind: Literal["words"]
    items: list[Word]


class Example(Strict):
    q: str
    a: str
    why: str


class ExamplesSection(Strict):
    kind: Literal["examples"]
    items: list[Example]


class Link(Strict):
    label: str
    to: str
    icon: str = "arrow"


class LinksSection(Strict):
    kind: Literal["links"]
    items: list[Link]


class CodeTask(Strict):
    q: str
    run: str
    answer: str
    why: str


class CodeSection(Strict):
    kind: Literal["code"]
    file: str
    source: list[str]
    setup: Literal["graph"] | None = None
    tasks: list[CodeTask] = []


class CodeBlock(Strict):
    label: str
    source: list[str]
    run: Literal["bug", "correct"]
    bad: bool = False


class CodeCompareSection(Strict):
    kind: Literal["codecompare"]
    title: str
    blocks: list[CodeBlock]


class CompareSection(Strict):
    """A table. rowHeaders: the first cell of each row is a row heading."""
    kind: Literal["compare"]
    title: str | None = None
    headers: list[str]
    rows: list[list]
    rowHeaders: bool = False


class PartSection(Strict):
    """Starts a numbered section of a module page (01, 02 ...). The sections after it belong to it."""
    kind: Literal["part"]
    id: str  # s01, s02 ... used in links (?go=s03)
    num: str  # "01"; "" for an unnumbered part
    title: str
    short: str  # name in the Learning guide
    text: list[str] = []  # paragraphs; **bold** and `code` are shown as such


class QuickCheckSection(Strict):
    """A question with a Show solution button (no marks)."""
    kind: Literal["quickcheck"]
    q: str
    a: str
    why: str | None = None


class StepperSection(Strict):
    """BFS from a start, one row per step, with Next step / Previous step."""
    kind: Literal["stepper"]
    start: str = "A"
    intro: str | None = None


class Exercise(Strict):
    q: str
    a: str


class ExercisesSection(Strict):
    kind: Literal["exercises"]
    items: list[Exercise] = Field(min_length=1)


class NoteSection(Strict):
    """A short highlighted note (e.g. what a lab does)."""
    kind: Literal["note"]
    title: str
    text: str


class ExplainSection(Strict):
    kind: Literal["explain"]
    id: str
    q: str
    model: str
    concept: str


class MapQuizSection(Strict):
    kind: Literal["mapquiz"]
    intro: str


class CodeLabSection(Strict):
    kind: Literal["codelab"]
    title: str


class QueueGameSection(Strict):
    kind: Literal["queuegame"]
    title: str
    intro: str
    start: str = "A"


class PracticeSection(Strict):
    kind: Literal["practice"]
    title: str


class TraceStep(Strict):
    read: str
    q: str
    opts: list[str] = Field(min_length=2)
    ans: int
    ok: str
    no: str
    hints: list[str] = Field(min_length=2, max_length=2)
    frame: int | None = None
    hideHops: bool = False
    tags: list[Tag | None] = []

    @model_validator(mode="after")
    def check_tags(self):
        _check_tags(f"step '{self.q}'", self.opts, self.ans, self.tags)
        return self


class TraceSection(Strict):
    kind: Literal["trace"]
    trace: str
    start: str
    title: str
    intro: str | None = None
    steps: list[TraceStep]


class Question(Strict):
    id: str
    q: str
    type: Literal["choice", "text", "explain", "route"] = "choice"
    opts: list[str] = []
    ans: int | None = None
    optFeedback: list[str] = []
    accept: list[str] = []  # text answers: every regex must match (case-insensitive)
    start: str | None = None  # route answers: any fewest-hops route from start to goal is right
    goal: str | None = None
    placeholder: str | None = None
    model: str | None = None
    after: str | None = None  # warm-up: shown after any answer
    ok: str | None = None
    no: str | None = None
    hints: list[str] = []
    see: str | None = None
    concept: str | None = None
    objective: int | None = None
    tags: list[Tag | None] = []  # choice: one per option (None for the right one)
    tag: Tag | None = None  # text / route / explain: the misconception behind a wrong answer

    @model_validator(mode="after")
    def check_type(self):
        _check_tags(f"question {self.id}", self.opts, self.ans, self.tags)
        if self.type == "choice" and (len(self.opts) < 2 or self.ans is None):
            raise ValueError(f"question {self.id}: a choice question needs opts and ans")
        if self.type == "text" and not self.accept:
            raise ValueError(f"question {self.id}: a text question needs accept patterns")
        if self.type == "route" and not (self.start and self.goal):
            raise ValueError(f"question {self.id}: a route question needs start and goal")
        if self.type == "explain" and not self.model:
            raise ValueError(f"question {self.id}: an explain question needs a model answer")
        return self


class QuizSection(Strict):
    kind: Literal["quiz"]
    quiz: str
    mode: Literal["warmup", "check", "ready", "module"]  # module: answer all, then Submit
    title: str | None = None
    intro: str | None = None
    done_text: str | None = None
    ask: bool = False  # show "a question to bring to the lecture" box
    questions: list[Question] = Field(min_length=1)


Section = Annotated[
    Union[
        VideoSection, NotesSection, WordsSection, ExamplesSection, LinksSection, CodeSection,
        CodeCompareSection, CompareSection, ExplainSection, MapQuizSection, CodeLabSection,
        PracticeSection, TraceSection, QuizSection, QueueGameSection, PartSection, QuickCheckSection,
        StepperSection, ExercisesSection, NoteSection,
    ],
    Field(discriminator="kind"),
]


class Topic(Strict):
    id: str
    title: str
    type: Literal["Animation", "Read", "Quiz", "Code", "Lab", "Module"]
    minutes: int
    outcome: str
    bloom: str | None
    concept: str | None
    goal: str
    layout: Literal["topic", "lesson", "module"] = "topic"
    sections: list[Section]
    recap: str
    next: str


class ModuleFile(Strict):
    num: int
    topics: list[Topic]
