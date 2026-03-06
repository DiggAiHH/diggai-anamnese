"""
Fix hardcoded German error messages in sessions.ts and pwa.ts.
Adds i18n import + replaces all hardcoded strings with t(lang, 'errors.key').
"""
import re, json, os

BASE = 'C:/Users/tubbeTEC/Downloads/Anamnese-kimi/anamnese-app'
LOCALES = BASE + '/server/locales'

# ─── Mapping: hardcoded German → error key ─────────────────
SESSIONS_MAP = {
    "'Fehler beim Generieren des Tokens'": "'errors.session.token_gen_failed'",
    "'Interner Serverfehler'": "'errors.generic'",
    "'Session nicht gefunden'": "'errors.session.not_found'",
    "'Session oder Patient nicht gefunden'": "'errors.session.not_found'",
    "'Ungültiger Token'": "'errors.auth.invalid_token'",
    "'Token konnte nicht erneuert werden'": "'errors.session.token_refresh_failed'",
}

PWA_MAP = {
    "'Authentifizierung erforderlich.'": "'errors.auth.required'",
    "'Token ungültig oder abgelaufen.'": "'errors.auth.invalid_token'",
    "'Validierungsfehler'": "'errors.validation'",
    "'Registrierung fehlgeschlagen.'": "'errors.pwa.register_failed'",
    "'Anmeldung fehlgeschlagen.'": "'errors.pwa.login_failed'",
    "'PIN-Anmeldung fehlgeschlagen.'": "'errors.pwa.pin_login_failed'",
    "'Token-Erneuerung fehlgeschlagen.'": "'errors.pwa.token_refresh_failed'",
    "'Konto nicht gefunden.'": "'errors.auth.account_not_found'",
    "'Dashboard konnte nicht geladen werden.'": "'errors.pwa.dashboard_load_failed'",
    "'Tagebuch konnte nicht geladen werden.'": "'errors.pwa.diary_load_failed'",
    "'Eintrag nicht gefunden.'": "'errors.not_found'",
    "'Eintrag konnte nicht geladen werden.'": "'errors.generic'",
    "'Eintrag konnte nicht erstellt werden.'": "'errors.pwa.entry_create_failed'",
    "'Eintrag konnte nicht aktualisiert werden.'": "'errors.pwa.entry_update_failed'",
    "'Eintrag konnte nicht gelöscht werden.'": "'errors.pwa.entry_delete_failed'",
    "'Maßnahmen konnten nicht geladen werden.'": "'errors.pwa.measures_load_failed'",
    "'Trackings konnten nicht geladen werden.'": "'errors.pwa.trackings_load_failed'",
    "'Tracking konnte nicht erstellt werden.'": "'errors.pwa.tracking_create_failed'",
    "'Tracking nicht gefunden.'": "'errors.not_found'",
    "'Tracking konnte nicht aktualisiert werden.'": "'errors.pwa.tracking_update_failed'",
    "'Maßnahme konnte nicht abgeschlossen werden.'": "'errors.pwa.measure_complete_failed'",
    "'Maßnahme konnte nicht übersprungen werden.'": "'errors.pwa.measure_skip_failed'",
    "'Nachrichten konnten nicht geladen werden.'": "'errors.pwa.messages_load_failed'",
    "'Zählung fehlgeschlagen.'": "'errors.generic'",
    "'Nachricht nicht gefunden.'": "'errors.not_found'",
    "'Nachricht konnte nicht geladen werden.'": "'errors.generic'",
    "'Nachricht konnte nicht gesendet werden.'": "'errors.pwa.message_send_failed'",
    "'Nachricht konnte nicht aktualisiert werden.'": "'errors.pwa.message_update_failed'",
    "'Einwilligungen konnten nicht geladen werden.'": "'errors.pwa.consents_load_failed'",
    "'Einwilligungen konnten nicht aktualisiert werden.'": "'errors.pwa.consents_update_failed'",
    "'Geräte konnten nicht geladen werden.'": "'errors.pwa.devices_load_failed'",
    "'Gerät konnte nicht registriert werden.'": "'errors.pwa.device_register_failed'",
    "'Gerät nicht gefunden.'": "'errors.not_found'",
    "'Gerät konnte nicht entfernt werden.'": "'errors.pwa.device_remove_failed'",
    "'Einstellungen konnten nicht geladen werden.'": "'errors.pwa.settings_load_failed'",
    "'Einstellungen konnten nicht aktualisiert werden.'": "'errors.pwa.settings_update_failed'",
    "'Altes Passwort ist falsch.'": "'errors.pwa.wrong_password'",
    "'Passwort konnte nicht geändert werden.'": "'errors.pwa.password_change_failed'",
    "'PIN konnte nicht geändert werden.'": "'errors.pwa.pin_change_failed'",
    "'Synchronisation fehlgeschlagen.'": "'errors.pwa.sync_failed'",
    "'Parameter \"since\" ist erforderlich.'": "'errors.pwa.since_required'",
    "'Änderungen konnten nicht geladen werden.'": "'errors.pwa.changes_load_failed'",
    "'Profil nicht gefunden.'": "'errors.not_found'",
    "'Profil konnte nicht geladen werden.'": "'errors.pwa.profile_load_failed'",
}

# ─── New locale keys to add ─────────────────────────────────
NEW_DE = {
    "session.token_gen_failed": "Fehler beim Generieren des Tokens",
    "session.not_found": "Session nicht gefunden",
    "session.token_refresh_failed": "Token konnte nicht erneuert werden",
    "pwa.register_failed": "Registrierung fehlgeschlagen",
    "pwa.login_failed": "Anmeldung fehlgeschlagen",
    "pwa.pin_login_failed": "PIN-Anmeldung fehlgeschlagen",
    "pwa.token_refresh_failed": "Token-Erneuerung fehlgeschlagen",
    "pwa.dashboard_load_failed": "Dashboard konnte nicht geladen werden",
    "pwa.diary_load_failed": "Tagebuch konnte nicht geladen werden",
    "pwa.entry_create_failed": "Eintrag konnte nicht erstellt werden",
    "pwa.entry_update_failed": "Eintrag konnte nicht aktualisiert werden",
    "pwa.entry_delete_failed": "Eintrag konnte nicht gelöscht werden",
    "pwa.measures_load_failed": "Maßnahmen konnten nicht geladen werden",
    "pwa.trackings_load_failed": "Trackings konnten nicht geladen werden",
    "pwa.tracking_create_failed": "Tracking konnte nicht erstellt werden",
    "pwa.tracking_update_failed": "Tracking konnte nicht aktualisiert werden",
    "pwa.measure_complete_failed": "Maßnahme konnte nicht abgeschlossen werden",
    "pwa.measure_skip_failed": "Maßnahme konnte nicht übersprungen werden",
    "pwa.messages_load_failed": "Nachrichten konnten nicht geladen werden",
    "pwa.message_send_failed": "Nachricht konnte nicht gesendet werden",
    "pwa.message_update_failed": "Nachricht konnte nicht aktualisiert werden",
    "pwa.consents_load_failed": "Einwilligungen konnten nicht geladen werden",
    "pwa.consents_update_failed": "Einwilligungen konnten nicht aktualisiert werden",
    "pwa.devices_load_failed": "Geräte konnten nicht geladen werden",
    "pwa.device_register_failed": "Gerät konnte nicht registriert werden",
    "pwa.device_remove_failed": "Gerät konnte nicht entfernt werden",
    "pwa.settings_load_failed": "Einstellungen konnten nicht geladen werden",
    "pwa.settings_update_failed": "Einstellungen konnten nicht aktualisiert werden",
    "pwa.wrong_password": "Altes Passwort ist falsch",
    "pwa.password_change_failed": "Passwort konnte nicht geändert werden",
    "pwa.pin_change_failed": "PIN konnte nicht geändert werden",
    "pwa.sync_failed": "Synchronisation fehlgeschlagen",
    "pwa.since_required": "Parameter 'since' ist erforderlich",
    "pwa.changes_load_failed": "Änderungen konnten nicht geladen werden",
    "pwa.profile_load_failed": "Profil konnte nicht geladen werden",
}

NEW_EN = {
    "session.token_gen_failed": "Failed to generate token",
    "session.not_found": "Session not found",
    "session.token_refresh_failed": "Failed to refresh token",
    "pwa.register_failed": "Registration failed",
    "pwa.login_failed": "Login failed",
    "pwa.pin_login_failed": "PIN login failed",
    "pwa.token_refresh_failed": "Token refresh failed",
    "pwa.dashboard_load_failed": "Failed to load dashboard",
    "pwa.diary_load_failed": "Failed to load diary",
    "pwa.entry_create_failed": "Failed to create entry",
    "pwa.entry_update_failed": "Failed to update entry",
    "pwa.entry_delete_failed": "Failed to delete entry",
    "pwa.measures_load_failed": "Failed to load measures",
    "pwa.trackings_load_failed": "Failed to load trackings",
    "pwa.tracking_create_failed": "Failed to create tracking",
    "pwa.tracking_update_failed": "Failed to update tracking",
    "pwa.measure_complete_failed": "Failed to complete measure",
    "pwa.measure_skip_failed": "Failed to skip measure",
    "pwa.messages_load_failed": "Failed to load messages",
    "pwa.message_send_failed": "Failed to send message",
    "pwa.message_update_failed": "Failed to update message",
    "pwa.consents_load_failed": "Failed to load consents",
    "pwa.consents_update_failed": "Failed to update consents",
    "pwa.devices_load_failed": "Failed to load devices",
    "pwa.device_register_failed": "Failed to register device",
    "pwa.device_remove_failed": "Failed to remove device",
    "pwa.settings_load_failed": "Failed to load settings",
    "pwa.settings_update_failed": "Failed to update settings",
    "pwa.wrong_password": "Old password is incorrect",
    "pwa.password_change_failed": "Failed to change password",
    "pwa.pin_change_failed": "Failed to change PIN",
    "pwa.sync_failed": "Synchronization failed",
    "pwa.since_required": "Parameter 'since' is required",
    "pwa.changes_load_failed": "Failed to load changes",
    "pwa.profile_load_failed": "Failed to load profile",
}

def apply_map(content, mapping, lang_expr):
    """Replace hardcoded strings in res.status(X).json({ error: 'STRING' })"""
    for german, key in mapping.items():
        # Match: { error: 'STRING' } and { error: 'STRING', details: ... }
        content = content.replace(
            f"{{ error: {german} }}",
            f"{{ error: t({lang_expr}, {key}) }}"
        )
        content = content.replace(
            f"{{ error: {german}, details:",
            f"{{ error: t({lang_expr}, {key}), details:"
        )
    return content

# ─── Fix sessions.ts ─────────────────────────────────────────
path = BASE + '/server/routes/sessions.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add i18n import after existing imports
if "from '../i18n'" not in content:
    content = content.replace(
        "import { hashEmail, encrypt } from '../services/encryption';",
        "import { hashEmail, encrypt } from '../services/encryption';\nimport { t, parseLang } from '../i18n';"
    )

lang_expr = "parseLang(req.headers['accept-language'])"
content = apply_map(content, SESSIONS_MAP, lang_expr)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed sessions.ts")

# ─── Fix pwa.ts ──────────────────────────────────────────────
path = BASE + '/server/routes/pwa.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if "from '../i18n'" not in content:
    content = content.replace(
        "import { Router, Request, Response, NextFunction } from 'express';",
        "import { Router, Request, Response, NextFunction } from 'express';\nimport { t, parseLang } from '../i18n';"
    )

lang_expr = "parseLang(req.headers['accept-language'])"
content = apply_map(content, PWA_MAP, lang_expr)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed pwa.ts")

# ─── Update locale files (de + en) ───────────────────────────
for lang, new_keys in [('de', NEW_DE), ('en', NEW_EN)]:
    file_path = os.path.join(LOCALES, lang, 'errors.json')
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    data.update(new_keys)
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Updated {lang}/errors.json (+{len(new_keys)} keys)")

print("\nDone.")
