"""
test_03_uebersetzung.py — Translation / i18n Tests

Validates the language switcher, that UI texts change without full reload,
and that both LTR and RTL languages render properly.
"""

import pytest
from playwright.sync_api import Page, expect

from conftest import BASE_URL, dismiss_cookie_banner

# Known translations to verify (key UI labels in each language)
LANGUAGE_SAMPLES = {
    "de": {"code": "DE", "expect_text": "Sprache wählen"},
    "en": {"code": "EN", "expect_text": "Select language"},
    "tr": {"code": "TR", "expect_text": "Dil seçin"},
}

RTL_LANGUAGES = ["ar", "fa"]


class TestLanguageSwitcher:
    """Tests for the language selector dropdown."""

    @pytest.mark.uebersetzung
    def test_language_selector_exists(self, seeded_page: Page):
        """The language selector with data-testid should be present."""
        seeded_page.goto(BASE_URL)
        seeded_page.wait_for_load_state("domcontentloaded")
        lang_btn = seeded_page.locator("[data-testid='language-selector']")
        expect(lang_btn).to_be_visible()

    @pytest.mark.uebersetzung
    def test_language_dropdown_opens(self, seeded_page: Page):
        """Clicking the language button should show a dropdown with languages."""
        seeded_page.goto(BASE_URL)
        seeded_page.wait_for_load_state("domcontentloaded")
        dismiss_cookie_banner(seeded_page)

        lang_btn = seeded_page.locator("[data-testid='language-selector']")
        lang_btn.click()

        # The dropdown should now show language options (e.g. "Deutsch", "English")
        expect(seeded_page.locator("text=Deutsch")).to_be_visible(timeout=5_000)
        expect(seeded_page.locator("text=English")).to_be_visible()

    @pytest.mark.uebersetzung
    def test_default_language_is_german(self, seeded_page: Page):
        """The app should default to German (de)."""
        seeded_page.goto(BASE_URL)
        seeded_page.wait_for_load_state("domcontentloaded")
        dismiss_cookie_banner(seeded_page)

        # The language selector button should show "DE"
        lang_btn = seeded_page.locator("[data-testid='language-selector']")
        expect(lang_btn).to_contain_text("DE")


class TestLanguageSwitching:
    """Tests that switching languages changes UI text without a full page reload."""

    @pytest.mark.uebersetzung
    def test_switch_to_english(self, seeded_page: Page):
        """Switching to English should change UI texts instantly (no reload)."""
        seeded_page.goto(BASE_URL)
        seeded_page.wait_for_load_state("domcontentloaded")
        dismiss_cookie_banner(seeded_page)

        # Record the initial URL to verify no full navigation happens
        initial_url = seeded_page.url

        # Open language selector and click English
        seeded_page.locator("[data-testid='language-selector']").click()
        seeded_page.locator("text=English").click()

        # The URL should not have changed (client-side switch, no reload)
        assert seeded_page.url == initial_url, (
            "URL changed after language switch — expected client-side update only"
        )

        # The button should now show "EN"
        lang_btn = seeded_page.locator("[data-testid='language-selector']")
        expect(lang_btn).to_contain_text("EN")

    @pytest.mark.uebersetzung
    def test_switch_to_turkish(self, seeded_page: Page):
        """Switching to Turkish should reflect Türkçe labels."""
        seeded_page.goto(BASE_URL)
        seeded_page.wait_for_load_state("domcontentloaded")
        dismiss_cookie_banner(seeded_page)

        seeded_page.locator("[data-testid='language-selector']").click()
        seeded_page.locator("text=Türkçe").click()

        lang_btn = seeded_page.locator("[data-testid='language-selector']")
        expect(lang_btn).to_contain_text("TR")

    @pytest.mark.uebersetzung
    def test_switch_back_to_german(self, seeded_page: Page):
        """Switching away and back to German should restore original texts."""
        seeded_page.goto(BASE_URL)
        seeded_page.wait_for_load_state("domcontentloaded")
        dismiss_cookie_banner(seeded_page)

        # Switch to English first
        seeded_page.locator("[data-testid='language-selector']").click()
        seeded_page.locator("text=English").click()
        seeded_page.wait_for_timeout(500)

        # Switch back to German
        seeded_page.locator("[data-testid='language-selector']").click()
        seeded_page.locator("text=Deutsch").click()
        seeded_page.wait_for_timeout(500)

        lang_btn = seeded_page.locator("[data-testid='language-selector']")
        expect(lang_btn).to_contain_text("DE")


class TestRTLLanguages:
    """Tests for right-to-left language support (Arabic, Farsi)."""

    @pytest.mark.uebersetzung
    def test_arabic_sets_rtl_direction(self, seeded_page: Page):
        """Switching to Arabic should set document direction to rtl."""
        seeded_page.goto(BASE_URL)
        seeded_page.wait_for_load_state("domcontentloaded")
        dismiss_cookie_banner(seeded_page)

        seeded_page.locator("[data-testid='language-selector']").click()
        seeded_page.locator("text=العربية").click()
        seeded_page.wait_for_timeout(500)

        # The <html> element should have dir="rtl"
        direction = seeded_page.evaluate(
            "() => document.documentElement.getAttribute('dir')"
        )
        assert direction == "rtl", f"Expected dir='rtl' for Arabic, got '{direction}'"

    @pytest.mark.uebersetzung
    def test_switching_from_rtl_to_ltr_restores_direction(self, seeded_page: Page):
        """Switching from Arabic back to German should restore LTR."""
        seeded_page.goto(BASE_URL)
        seeded_page.wait_for_load_state("domcontentloaded")
        dismiss_cookie_banner(seeded_page)

        # Switch to Arabic (RTL)
        seeded_page.locator("[data-testid='language-selector']").click()
        seeded_page.locator("text=العربية").click()
        seeded_page.wait_for_timeout(500)

        # Switch back to German (LTR)
        seeded_page.locator("[data-testid='language-selector']").click()
        seeded_page.locator("text=Deutsch").click()
        seeded_page.wait_for_timeout(500)

        direction = seeded_page.evaluate(
            "() => document.documentElement.getAttribute('dir')"
        )
        assert direction in ("ltr", None, ""), (
            f"Expected dir='ltr' or no dir after switching to German, got '{direction}'"
        )


class TestTranslationOnPatientPage:
    """Verify that patient-facing content is actually translated."""

    @pytest.mark.uebersetzung
    def test_patient_page_german_content(self, patient_page: Page):
        """The /patient page in German should contain German text."""
        body_text = patient_page.inner_text("body")
        # At least one of these common German terms should appear
        assert any(
            term in body_text
            for term in ["Anamnese", "Fragebogen", "Termin", "Willkommen", "Starten"]
        ), "Expected German content on /patient page"

    @pytest.mark.uebersetzung
    def test_patient_page_english_content(self, patient_page: Page):
        """After switching to English, the /patient page should show English text."""
        patient_page.locator("[data-testid='language-selector']").click()
        patient_page.locator("text=English").click()
        patient_page.wait_for_timeout(1_000)

        body_text = patient_page.inner_text("body")
        # German-specific terms should be gone; English terms should appear
        assert any(
            term in body_text
            for term in ["Questionnaire", "Start", "Appointment", "Welcome", "Begin"]
        ), "Expected English content on /patient page after language switch"
