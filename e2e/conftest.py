"""
Shared set-up for the end-to-end tests.

The tests drive a real Chromium browser against the BUILT app served by FastAPI
on http://localhost:8000 (the same thing students use). Start it with
run-e2e.ps1 / run-e2e.sh, which also give the tests their own empty database.

Every test gets a brand-new browser context, so it is a brand-new guest
(new learner id, empty localStorage).

Any console error or uncaught page error fails the test.

Environment variables (all optional):
    E2E_BASE_URL   default http://localhost:8000
    E2E_CHROME     path to a Chrome/Chromium to use instead of Playwright's own
    E2E_HEADED=1   show the browser while the tests run
    E2E_SLOWMO     milliseconds to pause between actions (with E2E_HEADED, to watch)
"""

import os
import sys
from pathlib import Path

import pytest
from playwright.sync_api import Page, expect, sync_playwright

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8000").rstrip("/")
ROOT = Path(__file__).resolve().parent.parent

# Lets a test work out the answer to a generated question from its seed.
sys.path.insert(0, str(ROOT / "backend"))

expect.set_options(timeout=8000)

# Google Fonts are an outside service. The tests answer those requests with an
# empty stylesheet so results don't depend on the internet (the app falls back
# to system fonts, exactly as it does offline). Nothing else is stubbed.
FONT_HOSTS = ("fonts.googleapis.com", "fonts.gstatic.com")

# A pretend speech engine that fires a "word" event every 120 ms, like Chrome's
# does with most voices. Headless browsers have no voices, so without this the
# word-by-word highlighting could not be checked.
FAKE_SPEECH = """
  class FakeUtterance { constructor(text) { this.text = text; } }
  const engine = {
    _u: null, speaking: false,
    getVoices: () => [],
    cancel() { this._u = null; this.speaking = false; },
    speak(u) {
      this._u = u; this.speaking = true;
      const words = [...u.text.matchAll(/\\S+/g)]; let i = 0;
      const tick = () => {
        if (this._u !== u) return;
        if (i < words.length) { u.onboundary && u.onboundary({ name: 'word', charIndex: words[i].index }); i++; setTimeout(tick, 120); }
        else { this.speaking = false; u.onend && u.onend(); }
      };
      setTimeout(tick, 50);
    },
  };
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true, writable: true });
  Object.defineProperty(window, 'speechSynthesis', { value: engine, configurable: true });
"""


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        kw = {"headless": os.environ.get("E2E_HEADED") != "1", "slow_mo": int(os.environ.get("E2E_SLOWMO", "0"))}
        if os.environ.get("E2E_CHROME"):
            kw["executable_path"] = os.environ["E2E_CHROME"]
        b = p.chromium.launch(**kw)
        yield b
        b.close()


@pytest.fixture(scope="session", autouse=True)
def server_is_up(browser):
    """Stop early, with a clear message, if the app isn't running."""
    ctx = browser.new_context()
    try:
        r = ctx.request.get(f"{BASE_URL}/api/health")
        ok = r.ok
    except Exception:  # noqa: BLE001 - any network failure means "not running"
        ok = False
    ctx.close()
    if not ok:
        pytest.exit(f"The app is not running at {BASE_URL}. Use run-e2e.ps1 (Windows) or run-e2e.sh.", returncode=2)


def _new_page(browser, request, *, speech=False, viewport=None):
    ctx = browser.new_context(viewport=viewport or {"width": 1280, "height": 900}, base_url=BASE_URL)
    ctx.route(
        lambda url: any(h in url for h in FONT_HOSTS),
        lambda route: route.fulfill(status=200, content_type="text/css", body="/* fonts stubbed in tests */"),
    )
    if speech:
        ctx.add_init_script(FAKE_SPEECH)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"page error: {e}"))
    page.errors = errors
    return ctx, page


@pytest.fixture
def page(browser, request):
    ctx, pg = _new_page(browser, request)
    yield pg
    errors = list(pg.errors)
    ctx.close()
    assert not errors, "Console errors during the test:\n  " + "\n  ".join(errors)


@pytest.fixture
def speech_page(browser, request):
    """A page with the pretend speech engine installed."""
    ctx, pg = _new_page(browser, request, speech=True)
    yield pg
    errors = list(pg.errors)
    ctx.close()
    assert not errors, "Console errors during the test:\n  " + "\n  ".join(errors)


@pytest.fixture
def new_page(browser, request):
    """Factory for extra pages (other viewports). Each is checked for console errors."""
    made = []

    def make(**kw):
        ctx, pg = _new_page(browser, request, **kw)
        made.append((ctx, pg))
        return pg

    yield make
    errors = [e for _, pg in made for e in pg.errors]
    for ctx, _ in made:
        ctx.close()
    assert not errors, "Console errors during the test:\n  " + "\n  ".join(errors)


def open_app(page: Page, path: str = "/") -> Page:
    """Open a page of the app (HashRouter) and wait until the course has loaded."""
    page.goto(f"{BASE_URL}/#{path}")
    expect(page.locator("main")).to_be_visible()
    # Content comes from the API; wait for the loading text to go and a heading to show.
    expect(page.get_by_text("Loading the course", exact=False)).to_have_count(0)
    expect(page.locator("main h1, main h2").first).to_be_visible()
    return page


def learner_id(page: Page) -> str:
    return page.evaluate("localStorage.getItem('cos212-learner')")


def server_state(page: Page) -> dict:
    r = page.request.get(f"{BASE_URL}/api/learners/{learner_id(page)}/state")
    assert r.ok, r.status
    return r.json()
