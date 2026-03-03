import json
import os

base = os.path.join('public', 'locales')

with open(os.path.join(base, 'en', 'translation.json'), 'r', encoding='utf-8') as f:
    en = json.load(f)

langs = [('IT', 'it'), ('FR', 'fr'), ('PL', 'pl'), ('FA', 'fa')]
results = {}

for label, code in langs:
    with open(os.path.join(base, code, 'translation.json'), 'r', encoding='utf-8') as f:
        lang = json.load(f)
    untranslated = []
    for key, en_val in en.items():
        if key in lang and lang[key] == en_val:
            untranslated.append((key, en_val))
    results[label] = untranslated

output_lines = []
for label in ['IT', 'FR', 'PL', 'FA']:
    items = results[label]
    output_lines.append('')
    output_lines.append('===== ' + label + ' -- ' + str(len(items)) + ' untranslated keys =====')
    for key, val in items:
        output_lines.append('  "' + key + '": "' + val + '"')

output_lines.append('')
output_lines.append('=== SUMMARY ===')
for label in ['IT', 'FR', 'PL', 'FA']:
    output_lines.append(label + ': ' + str(len(results[label])) + ' untranslated')
output_lines.append('Total EN keys: ' + str(len(en)))

report = '\n'.join(output_lines)

with open('untranslated_report.txt', 'w', encoding='utf-8') as f:
    f.write(report)

print(report)
