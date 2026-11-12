"""
Runs the course's own Python examples and returns what they print.

Only code written in the course content is ever run (a code section's source,
plus one of its predefined tasks). Students can't send code, so there is no
way to run arbitrary input. Each run happens in a separate Python process
with a time limit, and results are cached because they never change.
"""

import subprocess
import sys
import textwrap
from functools import lru_cache

GRAPH = """graph = {
    "A": ["B", "C"],
    "B": ["A", "D"],
    "C": ["A", "D", "E"],
    "D": ["B", "C"],
    "E": ["C"],
    "F": [],
}
"""

# Module 3 "mark when found": the bug and the fix: the two loops from the notes, wrapped so they print what gets served.
COMPARE = {
    "bug": GRAPH + textwrap.dedent("""
        from collections import deque
        queue = deque(["A"])
        found = set()
        served = []
        while queue:
            vertex = queue.popleft()
            found.add(vertex)            # marked when served (bug)
            served.append(vertex)
            for n in graph[vertex]:
                if n not in found:
                    queue.append(n)
        print("served:", served)
        print("D served", served.count("D"), "times")
    """),
    "correct": GRAPH + textwrap.dedent("""
        from collections import deque
        queue = deque(["A"])
        found = {"A"}
        served = []
        while queue:
            vertex = queue.popleft()
            served.append(vertex)
            for n in graph[vertex]:
                if n not in found:
                    found.add(n)        # marked when it joins (correct)
                    queue.append(n)
        print("served:", served)
        print("D served", served.count("D"), "times")
    """),
}


def build_program(source: list[str], setup: str | None = None, task: str | None = None) -> str:
    """The section's code, plus (optionally) one task. The source's own prints are hidden for tasks."""
    body = "\n".join(source)
    prefix = GRAPH if setup == "graph" else ""
    if task is None:
        return prefix + body + "\n"
    hidden = textwrap.indent(prefix + body, "    ")
    return f"import contextlib, io\nwith contextlib.redirect_stdout(io.StringIO()):\n{hidden}\n{task}\n"


@lru_cache(maxsize=256)
def run(program: str, timeout: float = 5.0) -> dict:
    try:
        p = subprocess.run(
            # -I: isolated (ignores the user's site packages and env vars); -X utf8: non-ASCII prints on Windows too.
            [sys.executable, "-I", "-X", "utf8", "-c", program],
            capture_output=True, text=True, timeout=timeout, encoding="utf-8",
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "output": "", "error": "The program took too long."}
    err = p.stderr.strip().splitlines()[-1] if p.returncode else ""
    return {"ok": p.returncode == 0, "output": p.stdout.rstrip("\n"), "error": err}
