-- ─────────────────────────────────────────────────────────────
--  Postgres-Rollen für DiggAi Capture/Suite Trennung
--
--  Anker: DiggAi-Restrukturierungs-Plan v1.0, §5.2
--
--  Diese Datei richtet drei Datenbank-Rollen ein, die die regulatorische
--  Trennung zwischen Klasse-I-Capture und Klasse-IIa-Suite auf der
--  Datenbank-Ebene durchsetzen — als Defense-in-Depth zur Code-Trennung.
--
--  Verwendung:
--    psql $DATABASE_URL -f prisma/sql/01_postgres_roles.sql
--
--  Achtung: Ersetze die Passwörter '***' durch echte Secrets. Speichere
--  die Passwörter in Fly-Secrets (flyctl secrets set DATABASE_CAPTURE_URL=...
--  bzw. DATABASE_SUITE_URL=...) und niemals in Klartext im Repo.
-- ─────────────────────────────────────────────────────────────

-- ── 1) Capture-Rolle ────────────────────────────────────────
-- Darf NUR Capture-Tabellen schreiben. Class-IIa-Tabellen sind komplett
-- verboten — selbst wenn ein Bug in Capture-Code versucht, etwas dort zu
-- schreiben, wird die Datenbank "permission denied" liefern.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'diggai_capture') THEN
        CREATE ROLE diggai_capture LOGIN PASSWORD 'CHANGE_ME_capture';
        RAISE NOTICE 'Created role diggai_capture';
    ELSE
        RAISE NOTICE 'Role diggai_capture already exists';
    END IF;
END $$;

-- Connect-Privilegien
GRANT CONNECT ON DATABASE neondb TO diggai_capture;
GRANT USAGE ON SCHEMA public TO diggai_capture;

-- SELECT auf alle Tabellen (Capture liest auch Tenant- und Patient-Daten)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO diggai_capture;

-- INSERT/UPDATE auf Pure-Capture-Tabellen (Bucket B + Auth-Tabellen aus C)
-- Dies sind die Tabellen aus DiggAi-Restrukturierungs-Plan §5.1 "Capture-Tabellen"
GRANT INSERT, UPDATE ON
    "Tenant",
    "Patient",
    "PatientAccount",
    "PatientSession",
    "Answer",
    "ChatMessage",
    "Signature",
    "AccidentDetails",
    "AnliegenTracking",
    "CustomForm",
    "CustomFormAnswer",
    "AuditLog",          -- Capture darf eigene Audit-Einträge schreiben
    "RefreshToken",      -- Auth-Domäne
    "ArztUser"           -- nur für Login-Use-Case (UPDATE lastLogin etc.)
TO diggai_capture;

-- KEIN Schreib-Zugriff auf Class-IIa-Tabellen — diese werden von Suite verwaltet.
-- Ein REVOKE ist defensiv: GRANT SELECT (oben) gibt nur SELECT, also
-- INSERT/UPDATE/DELETE sind ohnehin nicht erteilt. Wir machen es explizit
-- für die Code-Audit-Doku.
REVOKE INSERT, UPDATE, DELETE ON
    "TriageEvent",
    "ClinicalAlert",
    "TherapyPlan",
    "TherapyMeasure",
    "AgentTask"
FROM diggai_capture;

-- Sequenzen (für UUIDs / serial primary keys)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO diggai_capture;

-- ── 2) Suite-Rolle ──────────────────────────────────────────
-- Darf alles lesen, aber Class-IIa-Schreibzugriff exklusiv. So kann Suite
-- die Roh-Daten der Capture-Patienten anschauen und ihre eigenen
-- Bewertungen daran knüpfen — aber Suite überschreibt keine Capture-Daten.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'diggai_suite') THEN
        CREATE ROLE diggai_suite LOGIN PASSWORD 'CHANGE_ME_suite';
        RAISE NOTICE 'Created role diggai_suite';
    ELSE
        RAISE NOTICE 'Role diggai_suite already exists';
    END IF;
END $$;

GRANT CONNECT ON DATABASE neondb TO diggai_suite;
GRANT USAGE ON SCHEMA public TO diggai_suite;

-- Volle Lese-Berechtigung — Suite muss Patient-Sessions, Antworten, Forms
-- lesen, um die Bewertungen zu erstellen.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO diggai_suite;

-- Schreibzugriff nur auf Suite-Tabellen (Bucket A)
GRANT INSERT, UPDATE, DELETE ON
    "TriageEvent",
    "ClinicalAlert",
    "TherapyPlan",
    "TherapyMeasure",
    "AgentTask",
    "AuditLog"
TO diggai_suite;

-- Suite darf NICHT in Capture-Tabellen schreiben
REVOKE INSERT, UPDATE, DELETE ON
    "Tenant",
    "Patient",
    "PatientSession",
    "Answer",
    "Signature",
    "CustomForm",
    "CustomFormAnswer"
FROM diggai_suite;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO diggai_suite;

-- ── 3) Owner-Rolle ──────────────────────────────────────────
-- Migrations und administrative Aufgaben. Diese Rolle wird NUR für
-- Schema-Updates und Backups genutzt, niemals zur Laufzeit der Apps.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'diggai_owner') THEN
        CREATE ROLE diggai_owner LOGIN PASSWORD 'CHANGE_ME_owner';
        RAISE NOTICE 'Created role diggai_owner';
    ELSE
        RAISE NOTICE 'Role diggai_owner already exists';
    END IF;
END $$;

GRANT ALL PRIVILEGES ON DATABASE neondb TO diggai_owner;
GRANT ALL PRIVILEGES ON SCHEMA public TO diggai_owner;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO diggai_owner;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO diggai_owner;

-- Default-Privilegien für zukünftige Tabellen (nach Migrations)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO diggai_capture, diggai_suite;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE ON SEQUENCES TO diggai_capture, diggai_suite;

-- ── 4) Verifikation ────────────────────────────────────────
-- Diese Block druckt eine Übersicht der angelegten Rollen und ihrer Rechte.
-- Wird beim Lauf des Scripts angezeigt; in Production über pg_dump prüfen.

\echo
\echo '=== Rollen-Übersicht ==='
SELECT rolname, rolcanlogin, rolconnlimit
FROM pg_roles
WHERE rolname LIKE 'diggai_%'
ORDER BY rolname;

\echo
\echo '=== Tabellen-Berechtigungen für diggai_capture ==='
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'diggai_capture' AND table_schema = 'public'
ORDER BY table_name, privilege_type;

\echo
\echo '=== Tabellen-Berechtigungen für diggai_suite ==='
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'diggai_suite' AND table_schema = 'public'
ORDER BY table_name, privilege_type;

\echo
\echo '=== FERTIG ==='
\echo 'Nächste Schritte:'
\echo '  1) ALTER USER diggai_capture WITH PASSWORD ''<echtes-passwort>'';'
\echo '  2) ALTER USER diggai_suite WITH PASSWORD ''<echtes-passwort>'';'
\echo '  3) ALTER USER diggai_owner WITH PASSWORD ''<echtes-passwort>'';'
\echo '  4) Connection-Strings als Fly-Secrets:'
\echo '     flyctl secrets set --app diggai-capture-api DATABASE_URL="postgresql://diggai_capture:..."'
\echo '     flyctl secrets set --app diggai-suite-api DATABASE_URL="postgresql://diggai_suite:..."'
\echo '  5) Migrations laufen weiterhin als diggai_owner.'
