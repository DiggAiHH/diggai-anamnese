"""Replace hardcoded throw new Error() in auth.service.ts with LocalizedError."""

BASE = 'C:/Users/tubbeTEC/Downloads/Anamnese-kimi/anamnese-app'
path = BASE + '/server/services/pwa/auth.service.ts'

REPLACEMENTS = [
    (
        "throw new Error('Kein Patient mit dieser Patientennummer und Geburtsdatum gefunden.');",
        "throw new LocalizedError('errors.auth.patient_not_found');"
    ),
    (
        "throw new Error('Für diesen Patienten existiert bereits ein Konto.');",
        "throw new LocalizedError('errors.auth.account_exists');"
    ),
    (
        "throw new Error('Ungültige Anmeldedaten.');",
        "throw new LocalizedError('errors.auth.invalid_credentials');"
    ),
    (
        "throw new Error('PIN-Login nicht verfügbar.');",
        "throw new LocalizedError('errors.auth.pin_unavailable');"
    ),
    (
        "throw new Error('Ungültige PIN.');",
        "throw new LocalizedError('errors.auth.pin_invalid');"
    ),
    (
        "throw new Error('Token ungültig oder abgelaufen.');",
        "throw new LocalizedError('errors.auth.token_expired');"
    ),
    (
        "throw new Error('Konto nicht gefunden oder deaktiviert.');",
        "throw new LocalizedError('errors.auth.account_disabled');"
    ),
    (
        "throw new Error('Verifikationslink ungültig oder abgelaufen.');",
        "throw new LocalizedError('errors.auth.verify_link_invalid');"
    ),
    (
        "throw new Error('Zu viele Anfragen. Bitte warten Sie 5 Minuten.');",
        "throw new LocalizedError('errors.auth.too_many_requests');"
    ),
    (
        "throw new Error('Passwort-Reset-Link ungültig oder abgelaufen.');",
        "throw new LocalizedError('errors.auth.reset_link_invalid');"
    ),
    (
        "throw new Error('Konto nicht gefunden.');",
        "throw new LocalizedError('errors.auth.account_not_found');"
    ),
]

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

count = 0
for old, new in REPLACEMENTS:
    occurrences = content.count(old)
    content = content.replace(old, new)
    if occurrences:
        print(f"Replaced {occurrences}x: {old[:60]}...")
        count += occurrences

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal: {count} replacements in auth.service.ts")
