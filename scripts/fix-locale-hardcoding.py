"""
Fix hardcoded 'de-DE' locale in React components.
Replaces toLocaleString('de-DE') and NumberFormat('de-DE') with i18n.language.
"""
import os
import re

SRC_DIR = 'C:/Users/tubbeTEC/Downloads/Anamnese-kimi/anamnese-app/src'

# Files already fixed or skipped
SKIP_FILES = {
    'AuditLogTab.tsx',  # already fixed
}

def fix_file(filepath: str) -> bool:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Check if file has hardcoded 'de-DE' locale
    if "'de-DE'" not in content and '"de-DE"' not in content:
        return False

    # Replace date/number locale strings
    content = content.replace("toLocaleString('de-DE')", "toLocaleString(i18n.language)")
    content = content.replace('toLocaleString("de-DE")', "toLocaleString(i18n.language)")
    content = content.replace("NumberFormat('de-DE'", "NumberFormat(i18n.language")
    content = content.replace('NumberFormat("de-DE"', "NumberFormat(i18n.language")

    if content == original:
        return False

    # Ensure i18n is imported/destructured if file uses React components
    filename = os.path.basename(filepath)
    if filename.endswith('.tsx') or filename.endswith('.ts'):
        # Check if useTranslation is already imported
        if 'useTranslation' not in content and 'i18n.language' in content:
            # Add import after first import line
            content = re.sub(
                r"(import .+? from 'react';?\n)",
                r"\1import { useTranslation } from 'react-i18next';\n",
                content,
                count=1
            )
            if 'useTranslation' not in content:
                # Try with double quotes
                content = re.sub(
                    r'(import .+? from "react";\n)',
                    r'\1import { useTranslation } from "react-i18next";\n',
                    content,
                    count=1
                )

        # Ensure i18n is destructured in the component if not already
        # This is tricky without AST, so we'll do a simple heuristic
        # Only add if file uses React hooks (function component)
        if "i18n.language" in content and "const { i18n }" not in content and "const {i18n}" not in content:
            # Try to add after existing useTranslation destructuring if present
            content = re.sub(
                r"(const \{ t \} = useTranslation\(\);)",
                r"const { t, i18n } = useTranslation();",
                content
            )
            content = re.sub(
                r"(const \{t\} = useTranslation\(\);)",
                r"const { t, i18n } = useTranslation();",
                content
            )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    return True

fixed = []
for root, dirs, files in os.walk(SRC_DIR):
    for fname in files:
        if fname in SKIP_FILES:
            continue
        if not (fname.endswith('.tsx') or fname.endswith('.ts')):
            continue
        fpath = os.path.join(root, fname)
        if fix_file(fpath):
            fixed.append(fpath.replace('C:/Users/tubbeTEC/Downloads/Anamnese-kimi/anamnese-app/', ''))

print(f"Fixed {len(fixed)} file(s):")
for f in fixed:
    print(f"  {f}")
