Du agierst ab sofort als mein Autonomous Lead QA & SDET (Software Development Engineer in Test).
​DEIN ZIEL: > Die vollständige E2E-Automatisierung und Absicherung des User-Registrierungs- und Login-Workflows (Authentication) unserer "anamnese-app". Wir nutzen dafür Playwright mit der Chromium-Engine.
​UNSERE METHODIK (TDD & Auto-Healing):
Wir arbeiten streng nach Test-Driven Development und einer autonomen Reparatur-Schleife. Du darfst Fehler nicht nur melden, du musst sie selbstständig beheben.
​ERSTELLE JETZT EINEN PLAN FÜR FOLGENDEN ABLAUF:
​Phase 1: Setup & TDD Basis
​Analysiere unsere bestehende playwright.config.ts. Stelle sicher, dass sie für Chromium konfiguriert ist und gegen unsere lokale Entwicklungs-URL oder die Production-URL laufen kann.
​Schreibe einen vollständigen E2E-Test (e2e/auth-flow.spec.ts) für den gesamten Lebenszyklus eines Users:
​Aufrufen der Registrierungsseite.
​Ausfüllen des Formulars (mit validen und invaliden Daten für Edge-Cases).
​Absenden und Verifizieren der DSGVO-konformen Session-Erstellung.
​Erfolgreicher Login und Weiterleitung zum korrekten Dashboard (je nach Rolle).
​Phase 2: Der autonome Execution-Loop (Auto-Healing)
Sobald ich deinen Plan freigebe und wir in den Ausführungs-Modus wechseln, gilt diese absolute Kernregel für dich:
​Führe den Test aus (npx playwright test e2e/auth-flow.spec.ts --project=chromium).
​WENN ER FEHLSCHLÄGT: Stoppe sofort. Analysiere den Trace/Error-Log. Identifiziere, ob der Fehler im Test-Skript oder im tatsächlichen App-Code (Frontend/Backend) liegt.
​Implementiere den Fix im entsprechenden Code.
​Führe den Test erneut aus.
​Wiederhole diese Schleife komplett autonom, bis der Test zu 100% grün ist und du ihn nicht mehr weiter perfektionieren kannst.
​Phase 3: Abschluss-Reporting
Wenn alles fehlerfrei durchläuft, generiere einen kurzen Playwright-HTML-Report und bestätige mir, dass der Auth-Flow wasserdicht ist.
​DEINE AKTUELLE AUFGABE:
Wir sind im Plan-Modus. Schreibe noch keinen Code und führe noch keine Tests aus. Erstelle mir lediglich die exakte, schrittweise Blaupause für diese Phasen. Sobald ich deinen Plan lese und für gut befinde, wechsle ich in den Ausführungs-Modus und du legst los.
​Sobald der Agent dir den Plan liefert und du ihn absegnest, wird er versuchen, den Test solange gegen die Wand (und danach in den korrekten Code) zu fahren, bis die Anmeldung via Chromium reibungslos und perfekt funktioniert.ok mach mair einen plan, was wir Heute schaffen können. also realistisch du allein als code agent schaffen kansst. nicht auf menschen Zeit bezogen, sondern auf Agenten Zeit bezogen. ich will einen Detallierten plan ( maxiamle subagenten, maximale parallitt, ohen interference miteinadner). was wir heute voll implementieren können.

bei voll impleemntiereung meine ich, plann

go make a planmach mal erstmal eine Gründliche Recherche über die besten Vertrauen und simplicity sind. die Ergebnisse sollten auf Studien Basierend. danach sammle alle Informationen wie wir das implementieren und mach nur den Plan bitte und nicht anderes. bitte nutze so viele subagenten wie möglich um den plan zu optimieren und führe die so viel wie möglich parallel, ohne dass sie sich gegenseitig überlappen. danach werden wir mit dem selben Taktik( so viele subagenten wie möglich mit maximale parallität ohne die Arbeit voneinander zu stören. bitte auch Speicher das als unsere Hauptregel für all Code Session ( maximale subagenten, maximale parallitt, ohne Interferenzen miteinadner)
)

mach Agenten Teams daraus und sie du der ORchester.
