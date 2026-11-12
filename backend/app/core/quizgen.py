"""
Practice rounds and the Full quiz: new questions on a new graph every time.

Everything is rebuilt from a seed, so the browser only ever gets the seed and
the questions. To check an answer the server makes the same round again from
the seed and compares. The answers never leave the server.

    practice_round(module, seed) -> 5 questions on a random graph   (module 2, 3, 4 or "mix")
    full_quiz(seed)              -> 15 questions: 4 graphs, 6 BFS, 5 shortest routes

Each graph has 5 to 7 vertices named A, B, C, ..., sometimes with one isolated
vertex. Neighbour lists are in alphabetical order, as in the lessons.
"""

import random
import re
from collections import deque

LETTERS = "ABCDEFG"

# Where each kind of question is taught (shown as "Show me in the lesson").
LINKS = {
    "nbr": ("2", "s04", "Module 2 · 04 Storing a graph in Python"),
    "degree": ("2", "s02", "Module 2 · 02 Words you need"),
    "iso": ("2", "s02", "Module 2 · 02 Words you need"),
    "routeLen": ("2", "s02", "Module 2 · 02 Words you need (path length)"),
    "order": ("3", "s04", "Module 3 · 04 BFS from A, step by step"),
    "queue": ("3", "s02", "Module 3 · 02 The queue"),
    "level": ("3", "s01", "Module 3 · 01 Ripples on a pond"),
    "bug": ("3", "s03", "Module 3 · 03 Mark a vertex as soon as it's found"),
    "hops": ("4", "s01", "Module 4 · 01 Why BFS finds the fewest edges"),
    "route": ("4", "s03", "Module 4 · 03 Retrace the route"),
    "reach": ("4", "s05", "Module 4 · 05 Vertices you can't reach"),
    "parent": ("4", "s02", "Module 4 · 02 Remember where each vertex came from"),
}
KIND_LABEL = {
    "nbr": "Neighbours", "degree": "Degree", "iso": "Isolated vertex", "routeLen": "Path length",
    "order": "BFS order", "queue": "The queue", "level": "Levels", "bug": "Spot the bug",
    "hops": "Fewest edges", "route": "Shortest route", "reach": "Unreachable", "parent": "Parent",
}
# The misconception behind a wrong answer (feeds My analysis).
KIND_TAG = {
    "routeLen": "count_places_not_edges", "order": "fifo_lifo", "queue": "fifo_lifo", "level": "wrong_layer",
    "bug": "mark_on_serve", "hops": "wrong_layer", "route": "wrong_layer", "reach": "unreachable", "parent": "parent_reversed",
}
KIND_OBJECTIVE = {
    "nbr": 2, "degree": 1, "iso": 1, "routeLen": 5, "order": 3, "queue": 3, "level": 3, "bug": 4,
    "hops": 5, "route": 5, "reach": 5, "parent": 5,
}
KINDS = {2: ["nbr", "degree", "iso", "routeLen"], 3: ["order", "queue", "level", "bug"], 4: ["hops", "route", "reach", "parent"]}
MOD_OF = {k: m for m, ks in KINDS.items() for k in ks}
CONCEPT = {2: "Graphs", 3: "BFS", 4: "Shortest routes"}
FULL_PLAN = KINDS[2] + KINDS[3] + ["order", "queue"] + KINDS[4] + ["hops"]  # 4 + 6 + 5 = 15


# ------------------------------- graphs -------------------------------


def make_graph(rng: random.Random) -> dict:
    n = 5 + rng.randrange(3)
    V = list(LETTERS[:n])
    iso = V[rng.randrange(n)] if rng.random() < 0.55 else None
    core = [v for v in V if v != iso]
    adj: dict[str, list[str]] = {v: [] for v in V}

    def link(a: str, b: str) -> None:
        if a != b and b not in adj[a]:
            adj[a].append(b)
            adj[b].append(a)

    order = core[:]
    rng.shuffle(order)
    for i in range(1, len(order)):  # a random tree keeps every core vertex connected
        link(order[i], order[rng.randrange(i)])
    for _ in range(1 + rng.randrange(2)):  # one or two extra edges make a cycle or two
        link(core[rng.randrange(len(core))], core[rng.randrange(len(core))])
    for v in V:
        adj[v].sort()
    return {"V": V, "adj": adj, "iso": iso, "core": core}


def bfs(g: dict, s: str) -> dict:
    q = deque([s])
    parent: dict[str, str | None] = {s: None}
    dist = {s: 0}
    order: list[str] = []
    trace: list[dict] = []
    while q:
        v = q.popleft()
        order.append(v)
        for n in g["adj"][v]:
            if n not in parent:
                parent[n] = v
                dist[n] = dist[v] + 1
                q.append(n)
        trace.append({"serve": v, "queue": list(q)})
    return {"order": order, "parent": parent, "dist": dist, "trace": trace}


def dfs(g: dict, s: str) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []

    def go(v: str) -> None:
        seen.add(v)
        out.append(v)
        for n in g["adj"][v]:
            if n not in seen:
                go(n)

    go(s)
    return out


def stack_order(g: dict, s: str) -> list[str]:
    st, seen, out = [s], {s}, []
    while st:
        v = st.pop()
        out.append(v)
        for n in g["adj"][v]:
            if n not in seen:
                seen.add(n)
                st.append(n)
    return out


def dup_on_serve(g: dict, s: str) -> str | None:
    """The first vertex that joins the queue twice if vertices are marked when served."""
    q, seen, count = deque([s]), set(), {}
    while q:
        v = q.popleft()
        if v in seen:
            continue
        seen.add(v)
        for n in g["adj"][v]:
            if n not in seen:
                count[n] = count.get(n, 0) + 1
                q.append(n)
                if count[n] == 2:
                    return n
    return None


def path_to(b: dict, t: str) -> list[str]:
    p, x = [], t
    while x is not None:
        p.append(x)
        x = b["parent"][x]
    return p[::-1]


def fmt(lst: list[str]) -> str:
    return ", ".join(lst) if lst else "none"


def fmt_q(lst: list[str]) -> str:
    return "[" + ", ".join(lst) + "]"


def letters(text: str | None) -> list[str]:
    out: list[str] = []
    for c in re.findall(r"[A-Ga-g]", text or ""):
        c = c.upper()
        if c not in out:
            out.append(c)
    return out


# ------------------------------- questions -------------------------------


def _mcq(rng: random.Random, correct: str, distract: list) -> dict:
    opts = [correct]
    for d in distract:
        if len(opts) < 4 and d not in (None, "") and d not in opts:
            opts.append(d)
    rng.shuffle(opts)
    return {"type": "mcq", "opts": opts, "ans": opts.index(correct)}


def _pick(rng: random.Random, items: list):
    return items[rng.randrange(len(items))]


def _far(rng: random.Random, b: dict, s: str) -> str:
    far = sorted(v for v, d in b["dist"].items() if d >= 2)
    if far:
        return _pick(rng, far)
    return _pick(rng, sorted(v for v in b["dist"] if v != s))


def gen(kind: str, g: dict, rng: random.Random) -> dict:
    V, adj, core = g["V"], g["adj"], g["core"]
    if kind == "nbr":
        x = _pick(rng, core)
        ans = adj[x]
        return {"type": "text", "prompt": f"Which vertices are neighbours of {x}? Type the letters.",
                "answer": fmt(ans), "accept": {"letters": sorted(ans)},
                "explain": f"{x}'s line in the adjacency list is [{', '.join(ans)}]. Each of those is joined to {x} by one edge."}
    if kind == "degree":
        x = _pick(rng, V)
        d = len(adj[x])
        return _mcq(rng, str(d), [str(d + 1), str(max(0, d - 1)), str(d + 2), "0", "1", "2", "3"]) | {
            "prompt": f"What is the degree of {x}?",
            "explain": f"Degree = the number of edges touching {x}. Its list is [{', '.join(adj[x])}], so the degree is {d}."}
    if kind == "iso":
        c = g["iso"] or "None"
        others = sorted(rng.sample(core, 3))
        return _mcq(rng, c, (["None"] + others) if g["iso"] else others) | {
            "prompt": "Which vertex has no edges at all?",
            "explain": f"{g['iso']}'s list is empty, so it's an isolated vertex." if g["iso"] else "Every vertex has at least one neighbour, so none is isolated."}
    if kind == "routeLen":
        s = _pick(rng, core)
        b = bfs(g, s)
        p = path_to(b, _far(rng, b, s))
        L = len(p) - 1
        return _mcq(rng, f"{L} edges", [f"{L + 1} edges", f"{max(1, L - 1)} edges", f"{L + 2} edges"]) | {
            "prompt": f"How long is the route {' → '.join(p)}?",
            "explain": f"Count edges, not vertices: {len(p)} vertices means {L} edges."}
    if kind == "order":
        s = _pick(rng, core)
        b = bfs(g, s)
        o = b["order"]
        c = fmt(o)
        swapped = fmt([o[0], o[2], o[1], *o[3:]]) if len(o) > 3 else None
        return _mcq(rng, c, [fmt(dfs(g, s)), fmt(stack_order(g, s)), swapped, fmt([o[0], *reversed(o[1:])])]) | {
            "prompt": f"Run BFS from {s}. In which order are the vertices visited?",
            "explain": f"Queue after each serve: {' → '.join(fmt_q(t['queue']) for t in b['trace'])}. Order: {c}."}
    if kind == "queue":
        s = _pick(rng, core)
        b = bfs(g, s)
        k = min(2, len(b["trace"]))
        now = b["trace"][k - 1]["queue"]
        nxt = b["trace"][min(k, len(b["trace"]) - 1)]["queue"]
        m = _mcq(rng, fmt_q(now), [fmt_q(now[::-1]), fmt_q(b["trace"][0]["queue"]), fmt_q(nxt), fmt_q(now + [s]), "[ ]"])
        served = "1 vertex has" if k == 1 else f"{k} vertices have"
        steps = "; ".join(f"serve {t['serve']} → {fmt_q(t['queue'])}" for t in b["trace"][:k])
        return m | {"prompt": f"BFS from {s}: what is the queue after {served} been served?",
                    "explain": f"Serve the front, add new neighbours to the back: {steps}."}
    if kind == "level":
        s = _pick(rng, core)
        b = bfs(g, s)

        def at(d: int) -> list[str]:
            return sorted(v for v, x in b["dist"].items() if x == d)

        lv = 2 if at(2) else 1
        levels = " · ".join(f"{d}: {', '.join(at(d))}" for d in range(0, 5) if at(d))
        return _mcq(rng, fmt(at(lv)), [fmt(at(lv - 1 or 1)), fmt(sorted(at(1) + at(2))), fmt(at(lv + 1)), fmt(adj[s]), "none",
                                       fmt(sorted(rng.sample([v for v in V if v != s], 2)))]) | {
            "prompt": f"Which vertices are exactly {lv} edge{'s' if lv > 1 else ''} from {s} (level {lv})?",
            "explain": f"Levels from {s}: {levels}."}
    if kind == "bug":
        starts = core[:]
        rng.shuffle(starts)
        for s in starts:
            d = dup_on_serve(g, s)
            if d:
                others = [v for v in V if v not in (d, s)]
                rng.shuffle(others)
                return _mcq(rng, d, others) | {
                    "prompt": f"A student marks vertices when they're served, not when they're found. Running BFS from {s}, which vertex joins the queue twice?",
                    "explain": f"{d} has two neighbours that are served before {d} itself, and each one adds it because it isn't marked yet."}
        return _mcq(rng, "A queue (first in, first out)", ["A stack (last in, first out)", "A sorted list", "Any order works"]) | {
            "prompt": "Which waiting list keeps BFS going level by level?",
            "explain": "A queue serves vertices in the order they were found, so a whole level is served before the next."}
    if kind == "hops":
        s = _pick(rng, core)
        b = bfs(g, s)
        t = _far(rng, b, s)
        d = b["dist"][t]
        return _mcq(rng, str(d), [str(d + 1), str(max(1, d - 1)), "It can't be reached", str(d + 2)]) | {
            "prompt": f"What is the fewest number of edges from {s} to {t}?",
            "explain": f"BFS first finds {t} on level {d}, e.g. {' → '.join(path_to(b, t))}."}
    if kind == "route":
        s = _pick(rng, core)
        b = bfs(g, s)
        t = _far(rng, b, s)
        d = b["dist"][t]
        best = path_to(b, t)
        return {"type": "text", "prompt": f"Type a shortest route from {s} to {t}, e.g. {s}, …, {t}.",
                "answer": ", ".join(best), "accept": {"route": [s, t, d]},
                "explain": f"Follow parents back from {t}, then reverse: {', '.join(best)} ({d} edges). Any route with {d} edges is right."}
    if kind == "reach":
        s = _pick(rng, core)
        b = bfs(g, s)
        un = [v for v in V if v not in b["dist"]]
        c = fmt(un) if un else "None: every vertex can be reached"
        rest = [v for v in core if v != s]
        return _mcq(rng, c, ["None: every vertex can be reached", _pick(rng, rest), fmt(sorted(rng.sample(rest, min(2, len(rest))))), fmt(adj[s])]) | {
            "prompt": f"Which vertices can't be reached from {s}?",
            "explain": f"{fmt(un)} never joins the queue, so BFS never finds it." if un else f"BFS from {s} finds all {len(V)} vertices."}
    if kind == "parent":
        s = _pick(rng, core)
        b = bfs(g, s)
        t = _pick(rng, sorted(v for v, p in b["parent"].items() if p is not None))
        p = b["parent"][t]
        pool = V[:]
        rng.shuffle(pool)
        return _mcq(rng, p, [n for n in adj[t] if n != p] + [s, t] + pool) | {
            "prompt": f"BFS from {s}: which vertex is {t}'s parent?",
            "explain": f"{p} was being served when {t} was found, so {p} is its parent."}
    raise ValueError(f"unknown kind {kind!r}")


def _build(kinds: list[str], seed: int, rng: random.Random, g: dict) -> list[dict]:
    out = []
    for i, k in enumerate(kinds):
        q = gen(k, g, random.Random(seed * 101 + i))
        mod = MOD_OF[k]
        out.append(q | {"i": i, "kind": k, "mod": mod, "kindLabel": f"Module {mod} · {KIND_LABEL[k]}",
                        "link": {"module": LINKS[k][0], "part": LINKS[k][1], "label": LINKS[k][2]}})
    return out


def graph_view(g: dict) -> dict:
    return {"vertices": g["V"], "adj": g["adj"],
            "listText": "\n".join(f"{v}: [{', '.join(g['adj'][v])}]" for v in g["V"]),
            "alt": "Graph: " + "; ".join(f"{v} joins {' and '.join(g['adj'][v])}" if g["adj"][v] else f"{v} has no edges" for v in g["V"]) + "."}


def practice_round(module, seed: int) -> dict:
    if module not in (2, 3, 4, "mix"):
        raise ValueError("module must be 2, 3, 4 or mix")
    rng = random.Random(seed)
    g = make_graph(rng)
    pool = KINDS[2] + KINDS[3] + KINDS[4] if module == "mix" else KINDS[module]
    a, b = pool[:], pool[:]
    rng.shuffle(a)
    rng.shuffle(b)
    return {"seed": seed, "module": module, "graph": g, "questions": _build((a + b)[:5], seed, rng, g)}


def full_quiz(seed: int) -> dict:
    rng = random.Random(seed)
    g = make_graph(rng)
    return {"seed": seed, "graph": g, "questions": _build(FULL_PLAN, seed, rng, g)}


def public(round_: dict) -> dict:
    """What the browser may see: no answers."""
    qs = [{k: q[k] for k in ("i", "kind", "kindLabel", "mod", "type", "prompt", "link") if k in q} | ({"opts": q["opts"]} if q["type"] == "mcq" else {})
          for q in round_["questions"]]
    return {k: v for k, v in round_.items() if k not in ("graph", "questions")} | {"graph": graph_view(round_["graph"]), "questions": qs}


def check(q: dict, g: dict, choice: int | None = None, text: str | None = None) -> dict:
    """Right or not, the answer, and why."""
    if q["type"] == "mcq":
        if choice is None or not 0 <= choice < len(q["opts"]):
            raise ValueError("choose one of the options")
        right = choice == q["ans"]
    else:
        acc = q["accept"]
        if "letters" in acc:
            right = sorted(letters(text)) == acc["letters"]
        else:
            s, t, d = acc["route"]
            p = [c.upper() for c in re.findall(r"[A-Ga-g]", text or "")]
            right = (len(p) == d + 1 and p[0] == s and p[-1] == t
                     and all(b in g["adj"].get(a, []) for a, b in zip(p, p[1:])))
    answer = q["opts"][q["ans"]] if q["type"] == "mcq" else q["answer"]
    return {"right": right, "answer": answer, "explain": q["explain"],
            "tag": None if right else KIND_TAG.get(q["kind"])}
