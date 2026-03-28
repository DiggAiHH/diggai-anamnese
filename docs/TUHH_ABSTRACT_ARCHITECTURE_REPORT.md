# TUHH Abstract Report: Technische Architektur der DiggAI Anamnese-App

## Zielbild und Einordnung

Die `anamnese-app` ist als modular aufgebaute, DSGVO-orientierte Plattform für die digitale Patientenaufnahme in Arztpraxen konzipiert. Aus technischer Sicht kombiniert sie eine moderne Web-Frontend-Architektur mit einem serviceorientierten Node/Express-Backend, einem relationalen medizinischen Datenmodell und einer hybriden Entscheidungslogik aus deterministischen Regelwerken und optionalen LLM-Diensten. Für einen wissenschaftlichen Abstract ist besonders relevant, dass die klinisch sensiblen Kernfunktionen der Anamnese nicht primär von generativer KI abhängen, sondern regelbasiert und nachvollziehbar implementiert sind; KI wird ergänzend für Assistenz- und Dokumentationsaufgaben vorbereitet.

## Tech Stack und Gesamtarchitektur

Die Frontend-Seite basiert auf React 19 mit TypeScript, Vite, Tailwind CSS, React Router, TanStack React Query und Zustand. Diese Kombination spricht für eine bewusst gewählte Trennung zwischen Präsentationslogik, serverseitigem Datenzugriff, lokalem UI-State und performanter Navigation. Die Anwendung ist route-basiert stark segmentiert und lädt große Bereiche lazy, was Skalierbarkeit auf UI-Ebene und modulare Erweiterbarkeit unterstützt. Ergänzt wird das Frontend durch PWA-Funktionalität, Service-Worker-Update-Mechanismen, Sentry-Monitoring und Web-Vitals-Erfassung.

Das Backend verwendet Express 5, Prisma ORM und PostgreSQL als Kernstack. Die Serverarchitektur ist klar middleware-getrieben aufgebaut und integriert Security-Headers, CORS-Härtung, Rate Limiting, CSRF-Schutz, Cookie-basierte Authentifizierung, rollenbasierte Zugriffskontrolle sowie Health-, Readiness- und Metrics-Endpunkte. Zusätzlich sind Socket.IO für Echtzeit-Kommunikation sowie optionale Infrastrukturkomponenten wie Redis und RabbitMQ vorgesehen. In der Produktionsarchitektur wird das System über Docker-Services, Reverse Proxy und getrennte Infrastrukturbausteine ausgerollt.

Architektonisch ergibt sich daraus ein hybrides Plattformmodell mit folgenden Schichten:

- **Präsentationsschicht:** patienten- und mitarbeiterseitige React-Oberflächen
- **Applikationsschicht:** Express-Routen, Middleware, Session- und Workflow-Steuerung
- **Domänenschicht:** Triage-Engine, Question-Flow-Engine, medizinische Geschäftslogik
- **Persistenzschicht:** Prisma/PostgreSQL mit mandantenfähigem Schema
- **Assistenzschicht:** optionale AI-Services, Agent-Core-Integration, lokale LLM-Anbindung

Für eine Abstract-Darstellung lässt sich die Architektur damit als **privacy-first, modular, mandantenfähig und klinisch regelbasiert erweitert um optionale KI-Assistenz** charakterisieren.

## KI- und LLM-Integration

Die KI-Integration ist im aktuellen Stand technisch vorhanden, aber bewusst nicht als alleinige Entscheidungsinstanz für die klinische Kernlogik ausgelegt. Der entscheidende Befund aus dem Code ist: **Anamnese-Routing und Red-Flag-Erkennung erfolgen primär regelbasiert**. Die `TriageEngine` kodiert medizinische Warn- und Kritikalitätsregeln explizit, während die `QuestionFlowEngine` den dynamischen Fragepfad über deterministische Bedingungen, Folgefragen und Zustandsregeln steuert.

Die LLM-Schicht ist als konfigurierbarer Zusatzdienst implementiert. Unterstützt werden derzeit die Provider-Modi „none“, „ollama“ und „openai“. Gleichzeitig enthält die AI-Schicht technische Schutzmechanismen gegen Prompt-Injection, Eingabesäuberung und providerabhängige Sicherheitsregeln. Besonders wichtig ist die Privacy-Orientierung: Für PHI-nahe Anwendungsfälle erzwingt die AI-Routing-Logik lokale bzw. kontrollierte Provider-Nutzung. Im direkt verifizierten Routenbestand dienen KI-Funktionen aktuell vor allem der **administrativen bzw. dokumentationsnahen Assistenz**, etwa für Billing-Optimierung oder Ambient-Scribe-Szenarien.

Für einen wissenschaftlichen Kontext ist deshalb eine sachlich präzise Formulierung sinnvoll: Das System verfolgt **keinen LLM-first-Ansatz**, sondern eine **hybride Clinical Decision Support Architecture**, in der erklärbare Regeln den sicherheitskritischen Kern bilden und generative Modelle als optionale, kontrollierte Unterstützungsschicht eingebettet werden.

## Multilingualität

Die Anwendung besitzt eine klar strukturierte Internationalisierungsarchitektur auf Basis von `i18next` mit Sprachdetektion, Fallback auf Deutsch, asynchronem Laden von Übersetzungsressourcen und RTL-Unterstützung für Arabisch und Farsi. Das ist für medizinische Aufnahmeprozesse relevant, weil Sprachbarrieren im Frontdoor-Prozess reduziert und dadurch Datenqualität sowie Zugänglichkeit verbessert werden können.

Wichtig ist jedoch die präzise Einordnung des aktuellen Implementierungsstands: Im aktiv konfigurierten Frontend sind **10 Sprachen** direkt hinterlegt, darunter Deutsch, Englisch, Arabisch, Türkisch, Ukrainisch, Spanisch, Farsi, Italienisch, Französisch und Polnisch. Zusätzlich existiert mindestens ein weiterer Locale-Bestand für Russisch, der aber nicht Teil der aktiv konfigurierten `supportedLngs` ist. Die im Prompt genannte Zahl von **13 Sprachen** lässt sich aus dem direkt verifizierten Codebestand daher derzeit **nicht belastbar bestätigen**.

Für den Abstract sollte Multilingualität also nicht als bloße Marketingzahl, sondern als technisches Merkmal formuliert werden: Die Plattform verfügt über eine produktionsnahe i18n-Infrastruktur mit aktiver Unterstützung mehrerer europäischer und RTL-Sprachen und ist grundsätzlich auf weitere Sprachräume erweiterbar.

## Security, DSGVO und Compliance-Nähe

Die Sicherheitsarchitektur ist eines der stärksten, direkt im Code erkennbaren Merkmale des Systems. Die Plattform nutzt JWT-basierte Authentifizierung mit `HttpOnly`-Cookies, Algorithmus-Pinning, Token-Blacklisting, rollenbasierte Autorisierung und sitzungsbezogene Ownership-Prüfungen. Hinzu kommen CSRF-Schutz mittels Double-Submit-Cookie-Ansatz, Security-Headers via Helmet, abgestufte Rate Limits, mandantenbezogene Zugriffstrennung und Audit-relevante Persistenzstrukturen.

Für schützensame Gesundheitsdaten ist besonders hervorzuheben, dass personenbezogene Informationen kryptographisch behandelt werden. Die Verschlüsselung erfolgt mittels AES-256-GCM, ergänzt um deterministische Hashing-/Pseudonymisierungsmechanismen für E-Mail-Bezüge sowie versionierte Schlüsselverarbeitung. Auch das Datenmodell selbst enthält Strukturen für Consent, Audit, Signaturen und klinische Ereignisse. Dadurch wird nicht nur Datenspeicherung, sondern auch Nachvollziehbarkeit und Governance technisch adressiert.

Aus regulatorischer Perspektive zeigt der Code deutliche **Compliance-Vorbereitung** für ein deutsches Gesundheitsumfeld, etwa durch:

- technische Datensparsamkeit und PII-Schutz
- Auditierbarkeit zentraler Prozesse
- Rollen- und Rechtekonzepte
- Mandantenfähigkeit für Praxisstrukturen
- vorbereitete Integrationen in TI-/ePA-/KIM-nahe Domänenobjekte

Gleichzeitig muss wissenschaftlich sauber zwischen **technischer Compliance-Nähe** und **formaler Zertifizierung** unterschieden werden. Aus dem inspizierten Repository lässt sich ableiten, dass die Lösung stark auf DSGVO-konforme und medizinisch regulierte Betriebsmodelle vorbereitet ist. Eine formale MDR-/MPDG-Zulassung oder Zertifizierung ist aus dem Code allein jedoch nicht beweisbar und sollte daher im Abstract nicht behauptet, sondern höchstens als Zielkontext beschrieben werden.

## Datenmodell der Anamnese

Das Prisma-Schema zeigt ein für digitale Patientenaufnahme ungewöhnlich breites und zugleich strukturiertes Domänenmodell. Zentral sind die Entitäten für **Patient**, **PatientSession**, **Answer**, **TriageEvent** und **MedicalAtom**. Daraus ergibt sich ein mehrschichtiges Anamnesemodell:

1. **Patientenebene:** Stammdaten, Identität, Einwilligungen, Kontextbezüge
2. **Session-Ebene:** konkreter Aufnahmevorgang, Status, Zugriffs- und Workflowsteuerung
3. **Antwortebene:** einzelne anamnestische Angaben als persistierte Eingaben
4. **Klinische Ereignisebene:** Triage-Warnungen, Alerts, Ableitungen
5. **Semantische Atomebene:** strukturierte medizinische Information für Weiterverarbeitung und Interoperabilität

Dieses Modell erlaubt es, die Anamnese nicht nur als lineares Formular, sondern als semantisch verarbeitbare, auditierbare und weiterleitbare Datensammlung zu behandeln. Die Session-Logik zeigt zudem, dass Antworten, Triage-Ereignisse und Statusinformationen gebündelt für ärztliche Oberflächen bereitgestellt werden. Im erweiterten Modell finden sich außerdem Objekte für Therapiepläne, Clinical Alerts, Telemedizin, Signaturen, Praxisverwaltung sowie TI-/ePA-/KIM-nahe Integrationspunkte. Das deutet auf eine Plattformarchitektur hin, die über die reine Erstaufnahme hinaus in klinische Prozessketten hinein verlängert werden kann.

Besonders relevant für den Abstract ist, dass das eigentliche Fragenmodell kanonisch in einem zentralen Fragenkatalog gepflegt wird. Beschwerden, Besuchsgründe, Folgefragen und Bedingungslogik sind strukturiert modelliert. Damit entsteht ein **regelbasiertes, domänenspezifisches Wissensmodell**, das sowohl klinische Nachvollziehbarkeit als auch spätere Interoperabilität begünstigt.

## Skalierbarkeit und Betriebsreife

Im Repository sind klare Hinweise auf Betriebsreife und Skalierungsabsicht vorhanden: Docker-basierte Produktionskonfiguration, Redis/RabbitMQ-Optionen, Observability-Endpunkte, Hintergrundprozesse, Sentry-Integration und ein dokumentierter Skalierungsplan. Die Dokumentation adressiert Lastszenarien im Bereich von mehr als 1000 gleichzeitigen Nutzern und skizziert Wachstumspfade für größere Betriebsgrößen.

Wichtig ist jedoch auch hier die wissenschaftlich saubere Trennung zwischen **dokumentierter Zielarchitektur** und **empirisch belegter Produktivleistung**. Aussagen wie „64.000 Patienten pro Monat“ konnten im direkt geprüften Code- und Doku-Bestand nicht hinreichend verifiziert werden. Für den Abstract sollten daher nur die technisch nachweisbaren Befunde verwendet werden: Das System ist architektonisch auf horizontal und organisatorisch skalierbaren Betrieb vorbereitet, aber nicht jede Kapazitätszahl ist im Repository selbst evidenzbasiert hinterlegt.

## Verdichtete Kernaussage für einen wissenschaftlichen Abstract

Die DiggAI Anamnese-App realisiert eine modulare, mandantenfähige und datenschutzorientierte Plattform für digitale Patientenaufnahme, in der klinisch sensible Kernfunktionen über regelbasierte Entscheidungslogik abgebildet werden und optionale LLM-Dienste als kontrollierte Assistenzschicht dienen. Die technische Architektur verbindet ein modernes React/TypeScript-Frontend mit einem Express/Prisma/PostgreSQL-Backend, einem semantisch anschlussfähigen Anamnesedatenmodell, mehrsprachiger Interaktion sowie einer deutlich erkennbaren Security- und Compliance-Orientierung für den medizinischen Einsatzkontext. Damit eignet sich das System als Beispiel für eine hybride MedTech-Architektur, die Nachvollziehbarkeit, Datenschutz und Erweiterbarkeit höher priorisiert als eine unkontrollierte End-to-End-Automatisierung durch generative KI.

## Methodische Hinweise zur Verwendung

Für die Einreichung sollte der Report als **technisch validierte Grundlage** genutzt werden. Empfehlenswert ist dabei folgende Sprachdisziplin:

- **behaupten:** nur direkt im Code oder in der Infrastruktur nachweisbare Merkmale
- **einordnen:** Zielbild, Skalierungsabsichten, Interoperabilität und Compliance-Vorbereitung
- **nicht überziehen:** aktive Sprachanzahl, reale Durchsatzkennzahlen, formale Regulierung oder Zulassung

So bleibt der wissenschaftliche Text belastbar, präzise und anschlussfähig für Review-Prozesse.
