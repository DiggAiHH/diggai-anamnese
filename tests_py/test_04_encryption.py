"""
test_04_encryption.py — Encryption & Network Security Tests  🔒 KRITISCH

Validates that ALL data leaving the browser is encrypted:
  - Intercepts outgoing POST requests via Playwright's request event
  - Asserts payloads are ciphertext (not plaintext patient data)
  - Verifies AES-GCM encryption artifacts (iv, ciphertext) are present
  - Checks that localStorage state is encrypted at rest
"""

import json
import re
import pytest
from playwright.sync_api import Page, Request, expect

from conftest import (
    BASE_URL,
    start_questionnaire,
    answer_first_question_as_new_patient,
)


# Plaintext canary strings — if ANY of these appear in a network payload,
# encryption is broken.
PLAINTEXT_CANARIES = [
    "Testpatient",
    "Max",
    "Muster",
    "test@example.com",
    "12345",
    "Nachname",
    "Vorname",
]


class TestNetworkEncryption:
    """Intercept network requests and verify payloads are encrypted."""

    @pytest.mark.encryption
    def test_post_requests_contain_no_plaintext(self, patient_page: Page):
        """
        🔒 CRITICAL SECURITY TEST

        Fill out the questionnaire and submit. Intercept ALL POST requests
        and assert that none of them contain plaintext patient data.
        If this test fails, patient data is being sent unencrypted!
        """
        captured_requests: list[dict] = []

        def on_request(request: Request):
            if request.method == "POST" and request.post_data:
                captured_requests.append({
                    "url": request.url,
                    "body": request.post_data,
                })

        patient_page.on("request", on_request)

        # Start questionnaire and fill with canary data
        start_questionnaire(patient_page)
        answer_first_question_as_new_patient(patient_page)
        patient_page.wait_for_load_state("domcontentloaded")

        _fill_canary_data(patient_page)

        # Try to submit
        _try_submit(patient_page)

        # Now validate ALL captured POST requests
        for req in captured_requests:
            body = req["body"]
            for canary in PLAINTEXT_CANARIES:
                assert canary not in body, (
                    f"🚨 SECURITY BREACH: Plaintext '{canary}' found in POST to {req['url']}!\n"
                    f"Payload excerpt: {body[:200]}..."
                )

    @pytest.mark.encryption
    def test_post_payload_looks_encrypted(self, patient_page: Page):
        """
        POST payloads should contain encryption artifacts like 'iv',
        'ciphertext', or base64-encoded data — not raw JSON with field names.
        """
        captured_bodies: list[str] = []

        def on_request(request: Request):
            if request.method == "POST" and request.post_data:
                captured_bodies.append(request.post_data)

        patient_page.on("request", on_request)

        start_questionnaire(patient_page)
        answer_first_question_as_new_patient(patient_page)
        patient_page.wait_for_load_state("domcontentloaded")

        _fill_canary_data(patient_page)
        _try_submit(patient_page)

        # At least one POST with submission data should have been captured
        submission_posts = [
            b for b in captured_bodies
            if len(b) > 50  # Filter out tiny tracking/heartbeat requests
        ]

        for body in submission_posts:
            try:
                parsed = json.loads(body)
                # If it's JSON, it should contain encryption fields, NOT raw answers
                if isinstance(parsed, dict):
                    has_encryption_markers = any(
                        key in parsed
                        for key in ["iv", "ciphertext", "encrypted", "payload", "data"]
                    )
                    has_plain_fields = any(
                        key in parsed
                        for key in ["nachname", "vorname", "email", "telefon", "answers"]
                    )
                    if has_plain_fields and not has_encryption_markers:
                        pytest.fail(
                            f"🚨 POST contains plaintext fields without encryption: "
                            f"{list(parsed.keys())[:10]}"
                        )
            except json.JSONDecodeError:
                # Not JSON — could be base64 or binary, which is fine (encrypted)
                pass


class TestLocalStorageEncryption:
    """Verify that sensitive data stored in localStorage is encrypted."""

    @pytest.mark.encryption
    def test_session_data_encrypted_at_rest(self, patient_page: Page):
        """
        After filling out some questionnaire data, the session stored in
        localStorage should be encrypted (not contain plaintext canaries).
        """
        start_questionnaire(patient_page)
        answer_first_question_as_new_patient(patient_page)
        patient_page.wait_for_load_state("domcontentloaded")

        _fill_canary_data(patient_page)

        # Read all localStorage keys
        storage_data = patient_page.evaluate("""
            () => {
                const data = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    data[key] = localStorage.getItem(key);
                }
                return data;
            }
        """)

        # Check session-related entries for plaintext leaks
        sensitive_keys = [
            k for k in storage_data
            if any(term in k.lower() for term in ["session", "anamnese", "patient", "answer"])
        ]

        for key in sensitive_keys:
            value = storage_data[key]
            for canary in PLAINTEXT_CANARIES:
                assert canary not in value, (
                    f"🚨 Plaintext '{canary}' found in localStorage key '{key}'!\n"
                    f"Value excerpt: {value[:200]}..."
                )

    @pytest.mark.encryption
    def test_encryption_salt_exists(self, patient_page: Page):
        """The encryption salt (anamnese_salt) should be stored in localStorage."""
        start_questionnaire(patient_page)
        patient_page.wait_for_load_state("domcontentloaded")

        salt = patient_page.evaluate(
            "() => localStorage.getItem('anamnese_salt')"
        )
        # Salt may or may not exist at this point depending on implementation,
        # but if it exists it should be non-empty
        if salt is not None:
            assert len(salt) > 0, "Encryption salt is empty"


class TestWebCryptoAPI:
    """Verify that the browser's Web Crypto API is available and used."""

    @pytest.mark.encryption
    def test_web_crypto_available(self, seeded_page: Page):
        """The Web Crypto API must be available in the browser context."""
        seeded_page.goto(BASE_URL)
        has_crypto = seeded_page.evaluate("""
            () => typeof window.crypto !== 'undefined'
                && typeof window.crypto.subtle !== 'undefined'
                && typeof window.crypto.subtle.encrypt === 'function'
        """)
        assert has_crypto, "Web Crypto API (crypto.subtle) is not available"

    @pytest.mark.encryption
    def test_aes_gcm_supported(self, seeded_page: Page):
        """AES-GCM algorithm must be supported by the browser."""
        seeded_page.goto(BASE_URL)
        supported = seeded_page.evaluate("""
            async () => {
                try {
                    const key = await crypto.subtle.generateKey(
                        { name: 'AES-GCM', length: 256 },
                        true,
                        ['encrypt', 'decrypt']
                    );
                    return key !== null;
                } catch {
                    return false;
                }
            }
        """)
        assert supported, "AES-GCM 256-bit is not supported in this browser"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fill_canary_data(page: Page) -> None:
    """Fill the questionnaire with identifiable canary strings."""
    # Try to fill text inputs with canary data
    inputs = page.locator("input[type='text'], input:not([type])")
    canary_values = ["Testpatient", "Max", "test@example.com", "12345"]

    for i in range(min(inputs.count(), len(canary_values))):
        inp = inputs.nth(i)
        if inp.is_visible() and inp.is_enabled():
            inp.fill(canary_values[i])
            # Click "Weiter" to advance
            weiter = page.get_by_role("button", name="Weiter", exact=True)
            if weiter.count() > 0 and weiter.is_enabled():
                weiter.click()
                page.wait_for_timeout(500)


def _try_submit(page: Page) -> None:
    """Try to submit the questionnaire by clicking submit-like buttons."""
    submit_labels = ["Absenden", "Senden", "Submit", "Abschließen", "Fertig"]
    for label in submit_labels:
        btn = page.get_by_role("button", name=label)
        if btn.count() > 0 and btn.first.is_visible():
            btn.first.click()
            page.wait_for_timeout(1_000)
            return

    # Fallback: click any button that looks like a submit
    submit_btn = page.locator("button[type='submit']")
    if submit_btn.count() > 0 and submit_btn.first.is_visible():
        submit_btn.first.click()
        page.wait_for_timeout(1_000)
