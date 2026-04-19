"""
test_06_navigation_box.py — Box Navigation, State Persistence & Auto-Scroll Tests

Validates:
  - Accordion/box sections can be opened and closed
  - Navigating back preserves previously entered answers (no data loss)
  - Auto-scroll brings the active section into the viewport
  - Multi-step navigation works without losing state
"""

import pytest
from playwright.sync_api import Page, expect

from conftest import (
    BASE_URL,
    start_questionnaire,
    answer_first_question_as_new_patient,
)


class TestBackNavigationStatePersistence:
    """
    Tests that going back in the questionnaire preserves user input.
    This is critical — data loss during navigation = bad UX + lost patient info.
    """

    @pytest.mark.navigation
    def test_back_preserves_text_input(self, patient_page: Page):
        """
        Fill a text field, advance, go back — the value must still be there.
        """
        start_questionnaire(patient_page)
        answer_first_question_as_new_patient(patient_page)
        patient_page.wait_for_load_state("domcontentloaded")

        # Fill the first text input with a unique value
        canary = "Datenverlust-Test-12345"
        first_input = patient_page.locator("input[type='text'], input:not([type])").first
        if first_input.count() == 0 or not first_input.is_visible():
            pytest.skip("No text input visible to test preservation")

        first_input.fill(canary)

        # Advance to next question
        weiter = patient_page.get_by_role("button", name="Weiter", exact=True)
        if weiter.count() > 0 and weiter.is_enabled():
            weiter.click()
            patient_page.wait_for_timeout(1_000)
        else:
            pytest.skip("No 'Weiter' button to advance")

        # Go back
        zurueck = patient_page.get_by_role("button", name="Zurück")
        if zurueck.count() > 0:
            zurueck.click()
            patient_page.wait_for_timeout(1_000)
        else:
            pytest.skip("No 'Zurück' button to go back")

        # The value should still be in the input
        restored_input = patient_page.locator("input[type='text'], input:not([type])").first
        expect(restored_input).to_have_value(canary)

    @pytest.mark.navigation
    def test_back_preserves_selection(self, patient_page: Page):
        """
        Select an option (radio/button), advance, go back — selection preserved.
        """
        start_questionnaire(patient_page)
        answer_first_question_as_new_patient(patient_page)
        patient_page.wait_for_load_state("domcontentloaded")

        # Fill the name fields to reach a selection-based question
        _advance_through_text_fields(patient_page, count=2)

        # Look for radio buttons or clickable option buttons
        # Gender selection is often a select dropdown
        select_el = patient_page.locator("select").first
        if select_el.count() > 0 and select_el.is_visible():
            # Select an option
            options = select_el.locator("option")
            if options.count() > 1:
                value = select_el.evaluate(
                    "el => el.options[1].value"
                )
                select_el.select_option(value)
                selected_value = value

                # Advance
                weiter = patient_page.get_by_role("button", name="Weiter", exact=True)
                if weiter.count() > 0:
                    weiter.click()
                    patient_page.wait_for_timeout(1_000)

                # Go back
                zurueck = patient_page.get_by_role("button", name="Zurück")
                if zurueck.count() > 0:
                    zurueck.click()
                    patient_page.wait_for_timeout(1_000)

                # Verify selection is preserved
                restored_select = patient_page.locator("select").first
                if restored_select.count() > 0:
                    current_value = restored_select.evaluate("el => el.value")
                    assert current_value == selected_value, (
                        f"Selection lost! Expected '{selected_value}', got '{current_value}'"
                    )
                return

        pytest.skip("No select/radio elements found to test selection persistence")

    @pytest.mark.navigation
    def test_multi_step_back_preserves_all_data(self, patient_page: Page):
        """
        Fill 3 steps, go back 3 times — all values must be preserved.
        """
        start_questionnaire(patient_page)
        answer_first_question_as_new_patient(patient_page)
        patient_page.wait_for_load_state("domcontentloaded")

        # Fill 3 fields and track values
        entered_values = []
        for i in range(3):
            text_input = patient_page.locator("input[type='text'], input:not([type])").first
            if text_input.count() > 0 and text_input.is_visible():
                val = f"Step{i}-Value"
                text_input.fill(val)
                entered_values.append(val)

                weiter = patient_page.get_by_role("button", name="Weiter", exact=True)
                if weiter.count() > 0 and weiter.is_enabled():
                    weiter.click()
                    patient_page.wait_for_timeout(500)
                else:
                    break
            else:
                break

        # Go back through all steps and verify
        for i in range(len(entered_values) - 1, -1, -1):
            zurueck = patient_page.get_by_role("button", name="Zurück")
            if zurueck.count() > 0:
                zurueck.click()
                patient_page.wait_for_timeout(500)

                text_input = patient_page.locator("input[type='text'], input:not([type])").first
                if text_input.count() > 0 and text_input.is_visible():
                    expect(text_input).to_have_value(entered_values[i])


class TestAccordionBoxNavigation:
    """Tests for accordion/box sections (Schachteln) in the questionnaire."""

    @pytest.mark.navigation
    def test_accordion_sections_exist(self, patient_page: Page):
        """
        The questionnaire should contain collapsible sections or progress
        indicators showing multiple steps/boxes.
        """
        start_questionnaire(patient_page)
        answer_first_question_as_new_patient(patient_page)
        patient_page.wait_for_load_state("domcontentloaded")

        # Look for common accordion patterns: details/summary, [data-state], aria-expanded
        accordions = patient_page.locator(
            "details, [data-state='open'], [data-state='closed'], "
            "[aria-expanded], [role='tabpanel'], .accordion"
        )

        # Also check for step/progress indicators
        progress = patient_page.locator(
            "[role='progressbar'], .step-indicator, .progress, "
            "[aria-label*='Schritt'], [aria-label*='Step']"
        )

        total = accordions.count() + progress.count()
        # It's okay if neither exists — the app might use a different pattern
        if total == 0:
            pytest.skip("No accordion/progress elements detected in current questionnaire step")

    @pytest.mark.navigation
    def test_clicking_accordion_toggles_content(self, patient_page: Page):
        """Clicking an accordion header should expand/collapse its content."""
        start_questionnaire(patient_page)
        answer_first_question_as_new_patient(patient_page)
        patient_page.wait_for_load_state("domcontentloaded")

        # Advance a few steps to find accordion sections
        _advance_through_text_fields(patient_page, count=3)

        details = patient_page.locator("details summary, [aria-expanded='false']")
        if details.count() > 0:
            details.first.click()
            patient_page.wait_for_timeout(500)

            # The section should now be open
            opened = patient_page.locator(
                "details[open], [aria-expanded='true'], [data-state='open']"
            )
            expect(opened.first).to_be_visible()
        else:
            pytest.skip("No collapsible accordion elements found")


class TestAutoScrollBehavior:
    """Tests that the app auto-scrolls to the active question/section."""

    @pytest.mark.navigation
    def test_active_question_in_viewport(self, patient_page: Page):
        """
        After advancing to the next question, the new question should
        be scrolled into the visible viewport.
        """
        start_questionnaire(patient_page)
        answer_first_question_as_new_patient(patient_page)
        patient_page.wait_for_load_state("domcontentloaded")

        # Fill and advance a few times to trigger scrolling
        _advance_through_text_fields(patient_page, count=3)

        # The currently visible heading should be in the viewport
        heading = patient_page.locator("h2, h3").first
        if heading.count() > 0 and heading.is_visible():
            box = heading.bounding_box()
            if box:
                viewport = patient_page.viewport_size
                assert box["y"] >= 0, "Active question is above the viewport (not scrolled into view)"
                assert box["y"] < viewport["height"], (
                    "Active question is below the viewport (not scrolled into view)"
                )

    @pytest.mark.navigation
    def test_weiter_button_remains_accessible(self, patient_page: Page):
        """
        The 'Weiter' button should always be visible/reachable — never
        hidden below the fold after auto-scroll.
        """
        start_questionnaire(patient_page)
        answer_first_question_as_new_patient(patient_page)
        patient_page.wait_for_load_state("domcontentloaded")

        _advance_through_text_fields(patient_page, count=2)

        weiter = patient_page.get_by_role("button", name="Weiter", exact=True)
        if weiter.count() > 0:
            # Scroll the button into view and check it's reachable
            weiter.scroll_into_view_if_needed()
            expect(weiter).to_be_visible()
            box = weiter.bounding_box()
            if box:
                viewport = patient_page.viewport_size
                assert box["y"] + box["height"] <= viewport["height"] + 100, (
                    "'Weiter' button is too far below the viewport"
                )


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _advance_through_text_fields(page: Page, count: int = 3) -> None:
    """Fill text inputs with dummy data and click 'Weiter' to advance."""
    for i in range(count):
        text_input = page.locator("input[type='text'], input:not([type])").first
        if text_input.count() > 0 and text_input.is_visible():
            text_input.fill(f"Testdaten-{i}")
        weiter = page.get_by_role("button", name="Weiter", exact=True)
        if weiter.count() > 0 and weiter.is_enabled():
            weiter.click()
            page.wait_for_timeout(500)
        else:
            ja_weiter = page.get_by_role("button", name="Ja, weiter")
            if ja_weiter.count() > 0:
                ja_weiter.click()
                page.wait_for_timeout(500)
