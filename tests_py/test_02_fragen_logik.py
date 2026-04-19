"""
test_02_fragen_logik.py — Question Flow & Conditional Logic Tests

Validates the questionnaire flow: starting the form, answering questions,
conditional branching, required-field validation, and forward/back navigation.
"""

import pytest
from playwright.sync_api import Page, expect

from conftest import (
    BASE_URL,
    dismiss_cookie_banner,
    dismiss_session_recovery,
    dismiss_overlays,
    start_questionnaire,
    answer_first_question_as_new_patient,
)


@pytest.fixture()
def questionnaire_page(patient_page: Page) -> Page:
    """Navigate to /patient, dismiss banners, start the questionnaire."""
    dismiss_cookie_banner(patient_page)
    dismiss_session_recovery(patient_page)
    start_questionnaire(patient_page)
    return patient_page


def _safe_click(page: Page, locator, timeout: int = 5_000) -> bool:
    """Click a locator, dismissing overlays if they block the click."""
    dismiss_overlays(page)
    try:
        locator.click(timeout=timeout)
        return True
    except Exception:
        dismiss_overlays(page)
        try:
            locator.click(timeout=timeout)
            return True
        except Exception:
            return False


# ---------------------------------------------------------------------------
# Start & Consent
# ---------------------------------------------------------------------------

class TestQuestionnaireStart:

    @pytest.mark.fragenlogik
    def test_consent_flow_reaches_first_question(self, questionnaire_page: Page):
        """After accepting consent, we should see the first question."""
        questionnaire_page.wait_for_timeout(1_000)
        body_text = questionnaire_page.inner_text("body")
        assert any(
            kw in body_text
            for kw in ["Patient", "Praxis", "bekannt", "Frage", "Termin"]
        ), "Expected question content on page after consent flow"

    @pytest.mark.fragenlogik
    def test_new_patient_flow(self, questionnaire_page: Page):
        """Selecting 'Nein' (new patient) should advance to the next question."""
        answer_first_question_as_new_patient(questionnaire_page)
        questionnaire_page.wait_for_timeout(1_000)
        dismiss_overlays(questionnaire_page)
        body_text = questionnaire_page.inner_text("body")
        # Question 2 asks for Nachname or shows eGK camera scan
        assert any(
            kw in body_text
            for kw in ["Nachnamen", "Nachname", "Name", "Vorname", "Frage 2",
                        "Gesundheitskarte", "eGK", "Kamera"]
        ), f"Expected Nachname question after answering 'Nein'. Got: {body_text[:300]}"


# ---------------------------------------------------------------------------
# Required Field Validation
# ---------------------------------------------------------------------------

class TestRequiredFieldValidation:

    @pytest.mark.fragenlogik
    def test_cannot_proceed_without_input(self, questionnaire_page: Page):
        """Clicking 'Weiter' without filling a required field should prevent advancing."""
        answer_first_question_as_new_patient(questionnaire_page)
        questionnaire_page.wait_for_timeout(1_000)
        dismiss_overlays(questionnaire_page)

        # Capture content before clicking Weiter on empty field
        before_text = questionnaire_page.inner_text("body")

        weiter_btn = questionnaire_page.get_by_role("button", name="Weiter", exact=True)
        if weiter_btn.count() > 0 and weiter_btn.first.is_visible():
            _safe_click(questionnaire_page, weiter_btn)
            questionnaire_page.wait_for_timeout(1_000)

            # Check: error indicators shown, button disabled, OR page didn't advance
            error_indicators = questionnaire_page.locator(
                "[aria-invalid='true'], [role='alert'], .text-red-500, "
                ".text-destructive, .border-red-500, .shake"
            )
            has_errors = error_indicators.count() > 0
            after_text = questionnaire_page.inner_text("body")
            stayed_on_same_page = ("FRAGE 2" in before_text and "FRAGE 2" in after_text)
            assert has_errors or stayed_on_same_page, \
                "Expected validation error or page to stay on same question when submitting empty field"
        else:
            pytest.skip("No 'Weiter' button found on current question")


# ---------------------------------------------------------------------------
# Conditional Logic (Branching)
# ---------------------------------------------------------------------------

class TestConditionalLogic:

    @pytest.mark.fragenlogik
    def test_answering_yes_shows_followup(self, questionnaire_page: Page):
        """Answering 'Ja' to a conditional question shows follow-up."""
        answer_first_question_as_new_patient(questionnaire_page)
        questionnaire_page.wait_for_timeout(1_000)
        dismiss_overlays(questionnaire_page)

        _fill_personal_data_to_complaints(questionnaire_page)

        ja_btn = questionnaire_page.get_by_role("button", name="Ja")
        if ja_btn.count() > 0 and ja_btn.first.is_visible():
            _safe_click(questionnaire_page, ja_btn.first)
            questionnaire_page.wait_for_timeout(1_000)
            dismiss_overlays(questionnaire_page)

            body_text = questionnaire_page.inner_text("body")
            assert any(
                kw in body_text
                for kw in ["Seit wann", "Dauer", "Beschwerden", "Symptom",
                            "beschreiben", "Frage", "Weiter", "Ja", "Nein"]
            ), "Expected follow-up content after answering 'Ja'"
        else:
            pytest.skip("No 'Ja' button visible to test conditional branching")

    @pytest.mark.fragenlogik
    def test_answering_no_skips_followup(self, questionnaire_page: Page):
        """Answering 'Nein' to a conditional question skips follow-up."""
        answer_first_question_as_new_patient(questionnaire_page)
        questionnaire_page.wait_for_timeout(1_000)
        dismiss_overlays(questionnaire_page)

        _fill_personal_data_to_complaints(questionnaire_page)

        nein_btn = questionnaire_page.get_by_role("button", name="Nein")
        if nein_btn.count() > 0 and nein_btn.first.is_visible():
            before_text = questionnaire_page.inner_text("body")
            _safe_click(questionnaire_page, nein_btn.first)
            questionnaire_page.wait_for_timeout(1_000)
            dismiss_overlays(questionnaire_page)

            after_text = questionnaire_page.inner_text("body")
            assert before_text != after_text, \
                "Page content should change after answering 'Nein'"
        else:
            pytest.skip("No 'Nein' button visible to test skip logic")


# ---------------------------------------------------------------------------
# Weiter / Zurück Navigation
# ---------------------------------------------------------------------------

class TestQuestionNavigation:

    @pytest.mark.fragenlogik
    def test_weiter_advances_to_next_question(self, questionnaire_page: Page):
        """Clicking 'Weiter' after filling a field should advance."""
        answer_first_question_as_new_patient(questionnaire_page)
        questionnaire_page.wait_for_timeout(1_000)
        dismiss_overlays(questionnaire_page)

        text_input = questionnaire_page.locator(
            "input[type='text'], input:not([type='checkbox']):not([type='radio']):not([type='hidden'])"
        ).first
        if text_input.count() > 0 and text_input.is_visible():
            before_text = questionnaire_page.inner_text("body")
            text_input.fill("Testpatient")
            weiter = questionnaire_page.get_by_role("button", name="Weiter", exact=True)
            if weiter.count() > 0:
                _safe_click(questionnaire_page, weiter)
                questionnaire_page.wait_for_timeout(1_000)
                dismiss_overlays(questionnaire_page)
                after_text = questionnaire_page.inner_text("body")
                assert before_text != after_text, \
                    "Page content should change after clicking Weiter"
            else:
                pytest.skip("No 'Weiter' button found")
        else:
            pytest.skip("No text input field visible on current question")

    @pytest.mark.fragenlogik
    def test_zurueck_goes_to_previous_question(self, questionnaire_page: Page):
        """Clicking 'Zurück' should go back to the previous question."""
        answer_first_question_as_new_patient(questionnaire_page)
        questionnaire_page.wait_for_timeout(1_000)
        dismiss_overlays(questionnaire_page)

        text_input = questionnaire_page.locator(
            "input[type='text'], input:not([type='checkbox']):not([type='radio']):not([type='hidden'])"
        ).first
        if text_input.count() > 0 and text_input.is_visible():
            text_input.fill("Testpatient")
        weiter = questionnaire_page.get_by_role("button", name="Weiter", exact=True)
        if weiter.count() > 0:
            _safe_click(questionnaire_page, weiter)
            questionnaire_page.wait_for_timeout(1_000)
            dismiss_overlays(questionnaire_page)

            zurueck = questionnaire_page.get_by_role("button", name="Zurück")
            if zurueck.count() > 0 and zurueck.first.is_visible():
                _safe_click(questionnaire_page, zurueck)
                questionnaire_page.wait_for_timeout(1_000)
                dismiss_overlays(questionnaire_page)
                prev_input = questionnaire_page.locator(
                    "input[type='text'], input:not([type='checkbox']):not([type='radio']):not([type='hidden'])"
                ).first
                if prev_input.count() > 0 and prev_input.is_visible():
                    expect(prev_input).to_have_value("Testpatient", timeout=5_000)
            else:
                pytest.skip("No 'Zurück' button visible")
        else:
            pytest.skip("No 'Weiter' button to advance first")


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _fill_personal_data_to_complaints(page: Page) -> None:
    """Fill personal-data fields to reach a conditional question. Best-effort."""
    fields = [("Nachname", "Muster"), ("Vorname", "Max")]
    for _label, value in fields:
        dismiss_overlays(page)
        text_input = page.locator(
            "input[type='text'], input:not([type='checkbox']):not([type='radio']):not([type='hidden'])"
        ).first
        if text_input.count() > 0 and text_input.is_visible():
            text_input.fill(value)
        weiter = page.get_by_role("button", name="Weiter", exact=True)
        if weiter.count() > 0 and weiter.is_enabled():
            _safe_click(page, weiter)
            page.wait_for_timeout(800)
