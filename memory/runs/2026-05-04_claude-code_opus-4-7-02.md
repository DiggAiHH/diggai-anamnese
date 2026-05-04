2026-05-04T01:45+02:00 | Lauf claude-code-02 | Deploy Single-Source-of-Truth Konsolidierung + leaked Netlify-Token redacted
---
- Aktion: DEPLOY.md (workspace + project) als kanonische Deploy-Doku angelegt; gh secret list verifiziert; 3 widersprüchliche Netlify-Site-IDs dokumentiert (Pick: 4e24807c-…); .env.example Token-Leak redacted; CLAUDE.md Site-ID korrigiert; 5 outdated Docs als SUPERSEDED markiert; DoD-Block auch in AGENTS.md/.cursorrules/copilot-instructions.md
- Blocker: zwei git-Repos (workspace + project), DEPLOY.md musste in beide; pre-existing DoD-Block-Edits aus voriger Session traten in CLAUDE.md-Diff auf
- Fix: DEPLOY.md kopiert in project repo; CLAUDE.md-Pfad-Referenz auf ./DEPLOY.md statt ../../; 3 Agent-Rule-Files (AGENTS.md/.cursorrules/copilot-instructions.md) mit-committet (gleiche Doc-Konsolidierungs-Theme)
- Ergebnis: Commit 904b98d auf docs/deploy-single-source-of-truth; PR #20 https://github.com/DiggAiHH/diggai-anamnese/pull/20
- Out: PR offen mit User-Follow-up-Checklist (Token rotieren, Site-IDs in Netlify-Dashboard verifizieren, vestigial railway/render/vercel-Configs ggf. löschen); 8 GitHub-Secrets dokumentiert; Pipeline = master push → deploy.yml SSH → docker rebuild app, frontend = npm run deploy → Netlify, DB = Supabase via migrate-production-once.yml
