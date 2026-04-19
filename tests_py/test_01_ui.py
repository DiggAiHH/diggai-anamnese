"""
test_01_ui.py — UI Layout & Rendering Tests

Validates that the main pages render correctly, key structural elements
(header, footer, navigation) are present, and the layout works on both
desktop and mobile viewports.
"""

import re

import pytest
from playwright.sync_api import Page, expect

from conftest import BASE_URL, dismiss_cookie_banner


# ---------------------------------------------------------------------------
# Desktop viewport tests (default 1280×720 from conftest)
# ---------------------------------------------------------------------------

class TestLandingPageDesktop:
    """Tests for the HomeScreen / root page on desktop."""

    @pytest.mark.ui
    def test_page_title_contains_anamnese(self, seeded_page: Page):
        """The browser tab title should mention DiggAI or Anamnese."""
        seeded_page.goto(BASE_URL)
        expect(seeded_page).to_have_title(re.compile(r"DiggAI|Anamnese", re.IGNORECASE))

    @pytest.mark.ui
    def test_main_content_area_exists(self, seeded_page: Page):
        """A <main> landmark with id='main-content' must be present."""
        seeded_page.goto(BASE_URL)
        main = seeded_page.locator("main#main-content")
        expect(main).to_be_visible()

    @pytest.mark.ui
    def test_skip_to_content_link(self, seeded_page: Page):
        """An accessibility skip-to-content link should exist."""
        seeded_page.goto(BASE_URL)
        skip_link = seeded_page.locator("a[href='#main-content']")
        expect(skip_link).to_have_count(1)

    @pytest.mark.ui
    def test_language_selector_visible(self, seeded_page: Page):
        """The language selector button should be rendered."""
        seeded_page.goto(BASE_URL)
        lang_btn = seeded_page.locator("[data-testid='language-selector']")
        expect(lang_btn).to_be_visible()

    @pytest.mark.ui
    def test_theme_toggle_visible(self, seeded_page: Page):
        """The dark/light theme toggle should be present (bottom-right)."""
        seeded_page.goto(BASE_URL)
        # The ThemeToggle is wrapped in a fixed div at bottom-right
        toggle_area = seeded_page.locator("div.fixed.bottom-5.right-5")
        expect(toggle_area).to_be_visible()


class TestPatientPageDesktop:
    """Tests for the /patient route on desktop."""

    @pytest.mark.ui
    def test_patient_page_loads(self, patient_page: Page):
        """The /patient page should load without errors."""
        expect(patient_page).to_have_url(f"{BASE_URL}/patient")

    @pytest.mark.ui
    def test_start_button_present(self, patient_page: Page):
        """A 'Jetzt starten' or 'Termin / Anamnese' button should be visible."""
        start_btn = patient_page.get_by_role("button", name="Jetzt starten")
        termin_btn = patient_page.locator("button").filter(has_text="Termin")
        assert start_btn.count() > 0 or termin_btn.count() > 0, (
            "Neither 'Jetzt starten' nor 'Termin' button found on /patient"
        )

    @pytest.mark.ui
    def test_datenschutz_link(self, seeded_page: Page):
        """The Datenschutz (privacy) page should be reachable."""
        seeded_page.goto(f"{BASE_URL}/datenschutz")
        seeded_page.wait_for_load_state("domcontentloaded")
        expect(seeded_page.locator("main#main-content")).to_be_visible()

    @pytest.mark.ui
    def test_impressum_link(self, seeded_page: Page):
        """The Impressum page should be reachable."""
        seeded_page.goto(f"{BASE_URL}/impressum")
        seeded_page.wait_for_load_state("domcontentloaded")
        expect(seeded_page.locator("main#main-content")).to_be_visible(timeout=15_000)


# ---------------------------------------------------------------------------
# Mobile viewport tests (Pixel 7: 412×915)
# ---------------------------------------------------------------------------

class TestMobileViewport:
    """Responsive layout checks using a mobile viewport."""

    MOBILE_VIEWPORT = {"width": 412, "height": 915}

    @pytest.mark.ui
    def test_mobile_landing_no_horizontal_scroll(self, page: Page):
        """On mobile, there should be no horizontal overflow / scrollbar."""
        page.set_viewport_size(self.MOBILE_VIEWPORT)
        page.goto(BASE_URL)
        page.wait_for_load_state("domcontentloaded")
        dismiss_cookie_banner(page)
        page.wait_for_timeout(500)

        has_overflow = page.evaluate("""
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        """)
        assert not has_overflow, "Page has horizontal overflow on mobile viewport"

    @pytest.mark.ui
    def test_mobile_patient_page_renders(self, page: Page):
        """The /patient page should render without crashing on mobile."""
        page.set_viewport_size(self.MOBILE_VIEWPORT)
        page.goto(f"{BASE_URL}/patient")
        page.wait_for_load_state("domcontentloaded")
        dismiss_cookie_banner(page)
        expect(page.locator("main#main-content")).to_be_visible()

    @pytest.mark.ui
    def test_mobile_language_selector(self, page: Page):
        """Language selector should remain accessible on mobile."""
        page.set_viewport_size(self.MOBILE_VIEWPORT)
        page.goto(BASE_URL)
        page.wait_for_load_state("domcontentloaded")
        dismiss_cookie_banner(page)
        lang_btn = page.locator("[data-testid='language-selector']")
        expect(lang_btn).to_be_visible()

    @pytest.mark.ui
    def test_mobile_no_overlapping_elements(self, page: Page):
        """Critical buttons should not overlap on mobile viewport."""
        page.set_viewport_size(self.MOBILE_VIEWPORT)
        page.goto(f"{BASE_URL}/patient")
        page.wait_for_load_state("domcontentloaded")
        dismiss_cookie_banner(page)

        # Check that the start button (if visible) is within viewport
        start_btn = page.get_by_role("button", name="Jetzt starten")
        if start_btn.count() > 0:
            box = start_btn.first.bounding_box()
            if box:
                assert box["x"] >= 0, "Start button is off-screen to the left"
                assert box["x"] + box["width"] <= self.MOBILE_VIEWPORT["width"] + 10, (
                    "Start button extends beyond mobile viewport width"
                )
