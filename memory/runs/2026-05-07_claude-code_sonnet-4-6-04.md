2026-05-07T07:15+02:00 | Lauf sonnet-4-6-04 | C1: Postgres-Rollen gegen Neon erstellt + node_modules-Restore
---
- Aktion: C1 ausgeführt — 3 Rollen (diggai_capture, diggai_suite, diggai_owner) via Node.js pg-Client gegen Neon angelegt; pg npm-Modul temporär installiert via C:\Temp\install-pg.bat + run-pg-roles.cjs
- Blocker: pg nicht in node_modules; `npm install pg --no-save` korrumpierte node_modules (husky + 556 Pakete entfernt); node -e mit Pfad-Spaces schlug fehl; run-pg-roles.cjs brauchte absoluten Modul-Pfad
- Fix: pg via install-pg.bat in Projektdir installiert; Script C:\Temp\run-pg-roles.cjs mit path.join() auf absoluten pg-Pfad; nach C1 package-lock.json via `git checkout HEAD -- package-lock.json` wiederhergestellt
- Ergebnis: RESULT: [{"rolname":"diggai_capture","rolcanlogin":true},{"rolname":"diggai_owner","rolcanlogin":true},{"rolname":"diggai_suite","rolcanlogin":true}] — alle 3 Rollen auf Neon verifiziert; 2 WARNs (CustomForm + AgentTask existieren noch nicht, GRANTs nach Tabellen-Migration nachholen)
- Out: C1 ✅ (Rollen auf Neon); C2 ✅ (Fly-Secret + Capture-PW); E4 ✅ (4 Audit-Lücken commit e69613f); Push ✅ eee7282..e69613f auf GitHub; package-lock.json sauber; K27 (DNS) offen
