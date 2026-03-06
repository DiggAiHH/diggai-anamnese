"""
Fix TypeScript errors from the locale hardcoding fix script.
"""
import re, os

def read(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

BASE = 'C:/Users/tubbeTEC/Downloads/Anamnese-kimi/anamnese-app/src'

# ─── exportUtils.ts — not a React component, use navigator.language fallback
path = BASE + '/utils/exportUtils.ts'
content = read(path)
# Remove any useTranslation import that was added
content = re.sub(r"import \{ useTranslation \} from 'react-i18next';\n", "", content)
content = re.sub(r'import \{ useTranslation \} from "react-i18next";\n', "", content)
# Replace i18n.language with a document-level fallback
content = content.replace(
    "toLocaleString(i18n.language)",
    "toLocaleString(typeof document !== 'undefined' ? document.documentElement.lang || 'de' : 'de')"
)
write(path, content)
print("Fixed exportUtils.ts")

# ─── For component files that imported useTranslation but didn't use it:
# These files don't have useTranslation() called in the component body.
# Solution: add const { i18n } = useTranslation() right after their existing useState/hook calls.

FILES_NEEDING_HOOK = [
    # (relative path, "existing first line in component body" to add after)
    ('components/gamification/LeaderboardTable.tsx', None),
    ('components/gamification/PointsDisplay.tsx', None),
    ('components/payment/NfcPaymentTerminal.tsx', None),
    ('components/payment/PaymentSuccess.tsx', None),
    ('components/pvs/PvsConnectionWizard.tsx', None),
    ('components/pvs/PvsTransferLog.tsx', None),
    ('components/therapy/ClinicalAlertBanner.tsx', None),
    ('components/therapy/TherapyTimeline.tsx', None),
    ('pages/SystemPanel.tsx', None),
    ('pages/TIStatusPanel.tsx', None),
    ('pages/StaffTodoList.tsx', None),
]

for (rel, _) in FILES_NEEDING_HOOK:
    path = BASE + '/' + rel
    if not os.path.exists(path):
        print(f"SKIP (not found): {rel}")
        continue
    content = read(path)

    # Fix 1: if useTranslation is imported but not called in a hook,
    # and i18n.language is used, we need to add the hook call.
    if 'i18n.language' in content:
        if 'useTranslation' not in content:
            # Add import first
            content = re.sub(
                r"(import .+? from 'react'[^;]*;?\n)",
                r"\1import { useTranslation } from 'react-i18next';\n",
                content, count=1
            )

        # Check if { i18n } is destructured somewhere
        if 'const { i18n }' not in content and '{ i18n }' not in content and '{ t, i18n }' not in content:
            # Add i18n hook in the first function component
            # Find pattern: export function/const FunctionName (or similar) and add hook inside
            # Strategy: find first 'return (' in the component and add before it
            # More robust: find a return statement and add the hook before the first useState or before return
            # Simple: add after "export function Xxx() {" or "export const Xxx = () => {"
            content = re.sub(
                r'(export (?:default )?function \w+[^{]*\{)',
                r'\1\n  const { i18n } = useTranslation();',
                content, count=1
            )
            if 'const { i18n } = useTranslation();' not in content:
                # Try arrow function component pattern
                content = re.sub(
                    r'(export (?:default )?const \w+ = \([^)]*\)[^{]*\{)',
                    r'\1\n  const { i18n } = useTranslation();',
                    content, count=1
                )

    write(path, content)
    print(f"Fixed component: {rel}")

# ─── Fix ArztDashboard.tsx — multiple { t, i18n } declarations, some unused
path = BASE + '/pages/ArztDashboard.tsx'
content = read(path)
# Replace all "const { t, i18n } = useTranslation();" with "const { t } = useTranslation();"
# Then fix the specific lines where i18n.language is actually used
# Find which lines use i18n.language
lines = content.split('\n')
has_i18n_use = any('i18n.language' in line for line in lines)
if has_i18n_use:
    # Replace first occurrence of "const { t } = useTranslation();" with "const { t, i18n } = useTranslation();"
    # And all subsequent with "const { t } = useTranslation();"
    first_replaced = False
    new_lines = []
    for line in lines:
        if 'const { t, i18n } = useTranslation();' in line or "const {t, i18n} = useTranslation();" in line:
            if not first_replaced:
                new_lines.append(line)  # keep first one as-is (has i18n)
                first_replaced = True
            else:
                new_lines.append(line.replace(', i18n', '').replace(',i18n', ''))
        else:
            new_lines.append(line)
    content = '\n'.join(new_lines)
write(path, content)
print("Fixed ArztDashboard.tsx")

# ─── Fix MFADashboard.tsx — same issue
path = BASE + '/pages/MFADashboard.tsx'
content = read(path)
lines = content.split('\n')
has_i18n_use = any('i18n.language' in line for line in lines)
if has_i18n_use:
    first_replaced = False
    new_lines = []
    for line in lines:
        if 'const { t, i18n } = useTranslation();' in line or "const {t, i18n} = useTranslation();" in line:
            if not first_replaced:
                new_lines.append(line)  # keep first
                first_replaced = True
            else:
                new_lines.append(line.replace(', i18n', '').replace(',i18n', ''))
        else:
            new_lines.append(line)
    content = '\n'.join(new_lines)
write(path, content)
print("Fixed MFADashboard.tsx")

print("\nDone! Now run npm run build to verify.")
