"""
Automated accessibility checks on every page of the built app:
  - axe-core, WCAG 2.1 A and AA rules: no violations allowed
  - no sideways scrolling at 390 px wide (a phone) or at 640 px (1280 px at 200% zoom)

axe-core finds roughly a third to a half of accessibility problems. It does not
replace testing with a real screen reader or real users (see docs/TESTING.md).
"""

from pathlib import Path

import pytest

from conftest import open_app

AXE = (Path(__file__).resolve().parent.parent / "frontend" / "node_modules" / "axe-core" / "axe.min.js")
PAGES = ["/", "/course", "/course?tab=content", "/course?tab=objectives", "/course?tab=glossary", "/analysis", "/settings",
         "/practice", "/quiz", "/code"] + [f"/module/{m}" for m in ("1", "2", "3", "4")]

AXE_RUN = """async () => {
  const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] });
  return r.violations.map(v => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
}"""

OVERFLOW = """(W) => {
  const d = document.documentElement;
  if (d.scrollWidth <= W + 1) return [];
  const bad = [];
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect();
    if (r.right > W + 1 && r.width > 0 && getComputedStyle(e).position !== 'fixed' && !e.closest('[aria-hidden=true]'))
      bad.push(e.tagName.toLowerCase() + ' ending at ' + Math.round(r.right) + 'px');
  }
  return bad.slice(0, 5);
}"""


@pytest.mark.parametrize("path", PAGES)
def test_axe_finds_no_wcag_violations(page, path):
    if not AXE.exists():
        pytest.skip("axe-core not installed: run npm install in frontend/")
    open_app(page, path)
    page.wait_for_timeout(600)  # let entrance animations settle
    page.add_script_tag(path=str(AXE))
    violations = page.evaluate(AXE_RUN)
    assert violations == [], "\n".join(violations)


@pytest.mark.parametrize("path", PAGES)
@pytest.mark.parametrize("width,height", [(390, 844), (640, 450)], ids=["phone-390", "zoom-200"])
def test_no_sideways_scrolling(new_page, path, width, height):
    page = open_app(new_page(viewport={"width": width, "height": height}), path)
    page.wait_for_timeout(400)
    assert page.evaluate(OVERFLOW, width) == []


def test_keyboard_reaches_every_control_without_a_trap(page):
    """Tab through the Dashboard: focus must keep moving and always be visible."""
    open_app(page, "/")
    seen, last, same = [], None, 0
    for _ in range(120):
        page.keyboard.press("Tab")
        f = page.evaluate("""() => { const el = document.activeElement; if (!el || el === document.body) return null;
          const vis = e => { const s = getComputedStyle(e); return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none'); };
          if (!el.dataset.e2e) el.dataset.e2e = String(Math.random()).slice(2, 10);
          return { id: el.dataset.e2e, ok: vis(el) || (el.nextElementSibling && vis(el.nextElementSibling)), name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40) }; }""")
        if f is None:
            break
        same = same + 1 if f["id"] == last else 0
        assert same < 3, f"keyboard trap on {f['name']!r}"
        last = f["id"]
        if seen and f["id"] == seen[0]:
            break
        seen.append(f["id"])
        assert f["ok"], f"no visible focus on {f['name']!r}"
    assert len(seen) > 20, f"only {len(seen)} controls reachable by Tab"
