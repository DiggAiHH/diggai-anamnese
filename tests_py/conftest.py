"""
conftest.py — Shared Playwright fixtures for DiggAI Anamnese Python E2E tests.

Provides:
  - base_url injection via pytest.ini or --base-url CLI flag
  - pre-seeded localStorage (cookie consent, DSGVO) so tests skip banners
  - helper fixtures for dismissing recovery dialogs and navigating to /patient
"""

import json
import os
from datetime import datetime, timezone

import pytest
from playwright.sync_api import Page, BrowserContext, expect

# Ensure Playwright finds browsers on D: drive
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", r"D:\playwright-browsers")


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
BASE_URL = "http://localhost:5173"

# localStorage seeds to suppress cookie / DSGVO banners.
# Key is "cookie_consent" (underscore!) matching CookieConsent.tsx
LOCAL_STORAGE_SEEDS = {
    "cookie_consent": json.dumps({
        "essential": True,
        "functional": False,
        "analytics": False,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
    }),
    "dsgvo_consent": "true",  # Skip the DatenschutzGame
    # Explicitly set demo mode so createSession() uses local storage, no backend needed
    "anamnese-mode": json.dumps({"state": {"mode": "demo"}, "version": 0}),
}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    """Override default browser context with German locale and 1280×720 viewport."""
    return {
        **browser_context_args,
        "locale": "de-DE",
        "viewport": {"width": 1280, "height": 720},
    }


@pytest.fixture()
def seeded_page(page: Page) -> Page:
    """
    Return a Page whose localStorage is pre-seeded so that cookie and
    DSGVO consent dialogs are already accepted.  Navigates to BASE_URL
    first to establish the origin, seeds localStorage, then RELOADS
    so React picks up the seeds on initialisation.
    """
    page.goto(BASE_URL)
    for key, value in LOCAL_STORAGE_SEEDS.items():
        page.evaluate(
            "(args) => localStorage.setItem(args.key, args.value)",
            {"key": key, "value": value},
        )
    # Remove any leftover session so recovery dialog won't pop up
    page.evaluate("() => localStorage.removeItem('anamnese-session')")
    # Reload so the app reads the seeded localStorage on init
    page.reload()
    page.wait_for_load_state("domcontentloaded")
    # Give React SPA time to render after DOM is ready
    page.wait_for_timeout(1_500)
    return page


@pytest.fixture()
def patient_page(seeded_page: Page) -> Page:
    """Navigate to /patient with all banners pre-dismissed."""
    seeded_page.goto(f"{BASE_URL}/patient")
    seeded_page.wait_for_load_state("domcontentloaded")
    seeded_page.wait_for_timeout(1_500)
    # Safety: dismiss cookie banner in case seeds weren't picked up
    dismiss_cookie_banner(seeded_page)
    return seeded_page


# ---------------------------------------------------------------------------
# Helpers (usable in test modules directly)
# ---------------------------------------------------------------------------

def dismiss_cookie_banner(page: Page) -> None:
    """Click 'Nur Essenzielle' if the cookie dialog appears (with 2s grace)."""
    try:
        btn = page.get_by_role("button", name="Nur Essenzielle")
        btn.wait_for(state="visible", timeout=2_000)
        btn.click()
        page.wait_for_timeout(300)
    except Exception:
        pass  # Banner already dismissed or never appeared


def dismiss_session_recovery(page: Page) -> None:
    """Dismiss the session recovery dialog if it appears.
    Clicks 'Fortsetzen' (resume) to keep state, falls back to the discard button."""
    try:
        # "Fortsetzen" preserves answers — preferred during tests
        btn = page.get_by_role("button", name="Fortsetzen")
        btn.wait_for(state="visible", timeout=2_000)
        btn.click()
        page.wait_for_timeout(300)
    except Exception:
        pass
    # Also try the icon-only discard button (has title="Verwerfen")
    try:
        btn = page.locator("button[title='Verwerfen']")
        if btn.count() > 0 and btn.first.is_visible():
            btn.first.click()
            page.wait_for_timeout(300)
    except Exception:
        pass


def dismiss_overlays(page: Page) -> None:
    """Dismiss any full-screen overlay (recovery dialog, timeout warning, etc.)."""
    overlay = page.locator("div.fixed.inset-0[class*='z-']")
    try:
        if overlay.count() > 0 and overlay.first.is_visible():
            # Try "Fortsetzen" first (recovery dialog)
            btn = overlay.locator("button", has_text="Fortsetzen")
            if btn.count() > 0:
                btn.first.click()
                page.wait_for_timeout(500)
                return
            # Try any close / dismiss button
            btn = overlay.locator("button").first
            if btn.count() > 0:
                btn.click()
                page.wait_for_timeout(500)
    except Exception:
        pass


def start_questionnaire(page: Page) -> None:
    """
    From the /patient landing page, click the first 'Jetzt starten'
    button (Termin / Anamnese card) and accept DSGVO consent to reach
    the first question.
    """
    # Safety: dismiss cookie dialog first (it overlays buttons)
    dismiss_cookie_banner(page)
    dismiss_session_recovery(page)

    # Click the FIRST service-card "Jetzt starten" (Termin / Anamnese)
    start_btn = page.get_by_role("button", name="Jetzt starten").first
    start_btn.wait_for(state="visible", timeout=10_000)
    start_btn.click()

    # Wait for demo-mode session creation + React state transition
    page.wait_for_timeout(2_500)

    # Check for ConsentFlow checkboxes (#consent-treatment, #consent-data)
    # These are sr-only inputs with custom styled divs — click labels instead
    consent_label = page.locator("label[for='consent-treatment']")
    try:
        consent_label.wait_for(state="visible", timeout=8_000)
        consent_label.click()
        data_label = page.locator("label[for='consent-data']")
        if data_label.count() > 0:
            data_label.click()
        # Click "Fragebogen starten →"
        start_form = page.get_by_role("button", name="Fragebogen starten")
        start_form.wait_for(state="visible", timeout=5_000)
        start_form.click()
    except Exception:
        # Fallback: try force-clicking checkboxes directly
        checkboxes = page.locator("input[type='checkbox']")
        for i in range(checkboxes.count()):
            if not checkboxes.nth(i).is_checked():
                checkboxes.nth(i).check(force=True)
        submit_btn = page.get_by_role("button", name="Fragebogen starten")
        if submit_btn.count() > 0 and submit_btn.is_enabled():
            submit_btn.click()
        else:
            # Last resort: any prominent continue button
            primary = page.locator("button.bg-blue-600, button[type='submit']").first
            if primary.count() > 0:
                primary.click()

    page.wait_for_load_state("domcontentloaded")


def answer_first_question_as_new_patient(page: Page) -> None:
    """Answer the 'Sind Sie bereits Patient...' question with 'Nein' (new patient).
    Selects the answer AND clicks Weiter to advance to the next question.
    Handles recovery dialog that may appear after submitting the answer."""
    dismiss_overlays(page)
    # Select "Nein, ich bin zum ersten Mal hier"
    nein_btn = page.get_by_role("button", name="Nein")
    if nein_btn.count() > 0:
        nein_btn.first.click()
        page.wait_for_timeout(500)
    # Click "Weiter" to advance to next question
    weiter = page.get_by_role("button", name="Weiter", exact=True)
    if weiter.count() > 0 and weiter.first.is_visible():
        weiter.first.click()
        page.wait_for_timeout(1_000)
    # Recovery dialog may appear after first answer is persisted
    dismiss_overlays(page)
    page.wait_for_timeout(500)
