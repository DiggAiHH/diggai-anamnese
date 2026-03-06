"""
In pwa.ts catch blocks:
- Import LocalizedError from '../i18n'
- Replace: if (err?.message) return res.status(4XX).json({ error: err.message });
  with:     if (err instanceof LocalizedError) return res.status(4XX).json({ error: t(lang, err.errorKey) });
            if (err?.message) return res.status(4XX).json({ error: err.message });
"""
import re

BASE = 'C:/Users/tubbeTEC/Downloads/Anamnese-kimi/anamnese-app'

for filename in ['server/routes/pwa.ts', 'server/routes/sessions.ts']:
    path = BASE + '/' + filename
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add LocalizedError import
    if 'LocalizedError' not in content:
        content = content.replace(
            "import { t, parseLang } from '../i18n';",
            "import { t, parseLang, LocalizedError } from '../i18n';"
        )

    # Replace: if (err?.message) return res.status(STATUS).json({ error: err.message });
    # With: if (err instanceof LocalizedError) return res.status(STATUS).json({ error: t(lang, err.errorKey) });
    #       if (err?.message) return res.status(STATUS).json({ error: err.message });
    # Note: We need parseLang to be computed once. But catch blocks use inline parseLang calls.
    # Strategy: add the LocalizedError check before the err.message check.

    def add_localized_check(m):
        indent = m.group(1)
        status = m.group(2)
        # Determine the appropriate lang expression based on context
        return (
            f"{indent}if (err instanceof LocalizedError) return res.status({status}).json({{ error: t(parseLang(req.headers['accept-language']), err.errorKey) }});\n"
            f"{m.group(0)}"
        )

    content = re.sub(
        r'( +)(if \(err\?\.message\) return res\.status\((\d+)\)\.json\(\{ error: err\.message \}\);)',
        lambda m: (
            f"{m.group(1)}if (err instanceof LocalizedError) return res.status({m.group(3)}).json({{ error: t(parseLang(req.headers['accept-language']), err.errorKey) }});\n"
            f"{m.group(0)}"
        ),
        content
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    count = content.count('instanceof LocalizedError')
    print(f"Fixed {filename}: {count} LocalizedError check(s) added")
