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
    "en": {"code": "EN", "expect_text": "Select Language"},
    "tr": {"code": "TR", "expect_text": "Dil Seçin"},
    "ar": {"code": "AR", "expect_text": "اختيار اللغة"},
    "uk": {"code": "UK", "expect_text": "Виберіть мову"},
    "es": {"code": "ES", "expect_text": "Seleccionar Idioma"},
    "fa": {"code": "FA", "expect_text": "انتخاب زبان"},
    "it": {"code": "IT", "expect_text": "Seleziona Lingua"},
    "fr": {"code": "FR", "expect_text": "Sélectionner la langue"},
    "pl": {"code": "PL", "expect_text": "Wybierz język"},
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
    @pytest.mark.parametrize("lang_key, data", LANGUAGE_SAMPLES.items())
    def test_switch_all_languages(self, seeded_page: Page, lang_key, data):
        """Iterate through all supported languages and verify code and label."""
        seeded_page.goto(BASE_URL)
        seeded_page.wait_for_load_state("domcontentloaded")
        dismiss_cookie_banner(seeded_page)

        # Open selector
        seeded_page.locator("[data-testid='language-selector']").click()
        
        # Click the language by its name (which is in the dropdown)
        # We need the full name here. Let's look it up from our sample or mapping.
        # For now, let's just try to find the text that matches the button we expect.
        lang_name_map = {
            "de": "Deutsch", "en": "English", "tr": "Türkçe", "ar": "العربية",
            "uk": "Українська", "es": "Español", "fa": "فارسی", "it": "Italiano",
            "fr": "Français", "pl": "Polski"
        }
        
        seeded_page.locator(f"text={lang_name_map[lang_key]}").click()
        seeded_page.wait_for_timeout(500)

        # Verify button code
        lang_btn = seeded_page.locator("[data-testid='language-selector']")
        expect(lang_btn).to_contain_text(data["code"])
        
        # Verify the tooltip/aria-label text (translated 'languageSelect')
        expect(lang_btn).to_have_attribute("aria-label", data["expect_text"])



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
        # Use expect with locator for built-in retries
        body = patient_page.locator("body")
        expect(body).to_contain_text("Anamnese", timeout=10_000)
        expect(body).to_contain_text("Termin")

    @pytest.mark.uebersetzung
    def test_patient_page_english_content(self, patient_page: Page):
        """After switching to English, the /patient page should show English text."""
        patient_page.locator("[data-testid='language-selector']").click()
        patient_page.locator("text=English").click()
        
        body = patient_page.locator("body")
        expect(body).to_contain_text("Questionnaire", timeout=10_000)
        expect(body).to_contain_text("Service Hub")

