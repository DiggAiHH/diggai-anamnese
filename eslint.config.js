import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'server',
    'scripts',
    'netlify',
    'prisma',
    'e2e',
    'tests_py',
    'tests',
    'testing',
    'coverage-vitest',
    'playwright-report',
    'test-results',
    'monitoring',
    'docker',
    'k8s',
    'node_modules',
    'apps',
    'docs',
    'shared',
    '**/*.d.ts',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': 'allow-with-description' }],
      '@typescript-eslint/no-namespace': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  Class-I Code-Trennung — Capture darf NIE Suite-Code importieren.
  //
  //  Anker: DiggAi-Restrukturierungs-Plan v1.0 §6.1 (Static Code Tests).
  //
  //  Aktiviert wird diese Regel ab Phase 3 (Capture-Code in
  //  packages/capture/), wenn die Trennung tatsächlich greift. Heute (Phase 1)
  //  ist sie ein Tripwire — wenn ein Dev versehentlich einen Suite-Path
  //  importiert, schlägt der Lint fehl.
  // ─────────────────────────────────────────────────────────────
  {
    files: ['packages/capture/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/packages/suite/**', '@diggai/suite', '@diggai/suite/*'],
            message: 'Capture (Klasse I) darf KEINE Suite-Module (Klasse IIa) importieren. Siehe DiggAi-Restrukturierungs-Plan §6.1.',
          },
          {
            group: ['**/agent-core/**', '**/services/therapy/**', '**/services/ai/**'],
            message: 'Capture darf keine Class-IIa-Trigger-Module importieren (Triage, AI-Engine, Therapie-Logik).',
          },
        ],
      }],
    },
  },
])
