# DiggAI Anamnese — Implementierungsplan Modul 1 + 2

> **Prompt 1a** — Detailplan für Agentenmodus-Implementierung  
> **Datum:** 04.03.2026 | **Modell:** Opus 4.6  
> **Scope:** Modul 1 (Wartezeit-Management) + Modul 2 (Software-Admin Erweiterung)  
> **Abhängigkeit:** Baut auf bestehender Codebasis Phase 14 auf

---

## Inhaltsverzeichnis

1. [Modul 1: Wartezeit-Management & Patienten-Engagement](#modul-1)
   - 1.1 [Prisma-Schema-Erweiterungen](#11-prisma)
   - 1.2 [API-Endpunkte](#12-api)
   - 1.3 [Socket.IO Events](#13-socket)
   - 1.4 [Frontend-Komponenten](#14-frontend)
   - 1.5 [Adaptiver Flow-Algorithmus](#15-algorithmus)
   - 1.6 [Dependencies](#16-deps)
   - 1.7 [Tests](#17-tests)
2. [Modul 2: Software-Admin Erweiterung](#modul-2)
   - 2.1 [Prisma-Schema-Erweiterungen](#21-prisma)
   - 2.2 [API-Endpunkte](#22-api)
   - 2.3 [Frontend-Komponenten](#23-frontend)
   - 2.4 [ROI-Formel](#24-roi)
   - 2.5 [Wunschbox KI-Prompt](#25-wunschbox)
   - 2.6 [Dependencies](#26-deps)
   - 2.7 [Tests](#27-tests)
3. [Migrations-Strategie](#migrations)
4. [Dateiliste: Alle Änderungen](#dateiliste)
5. [Implementierungs-Reihenfolge](#reihenfolge)

---

<a name="modul-1"></a>
## 1. Modul 1: Wartezeit-Management & Patienten-Engagement

### Ziel
Patienten im Wartezimmer beschäftigen, die gefühlte Wartezeit reduzieren, und den Fragebogen-Flow adaptiv an die reale Wartezeit anpassen. Das System erkennt wie viele Patienten warten und verlängert/verkürzt den Ablauf intelligent.

### Übersicht der Komponenten

```
┌─────────────────────────────────────────────────────────────────┐
│                    WARTEZEIT-MANAGEMENT                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Content-     │    │  Adaptiver   │    │  Praxis-News │      │
│  │  Engine       │    │  Flow-       │    │  Manager     │      │
│  │  (Server)     │    │  Controller  │    │  (Admin)     │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                    │              │
│         ▼                   ▼                    ▼              │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              PatientWartezimmer (erweitert)            │      │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌───────────┐  │      │
│  │  │ Queue-  │ │ Health-  │ │ Mini-  │ │ Praxis-   │  │      │
│  │  │ Status  │ │ Tips     │ │ Games  │ │ News      │  │      │
│  │  └─────────┘ └──────────┘ └────────┘ └───────────┘  │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │         Questionnaire (erweitert mit Infobreaks)      │      │
│  │  ┌─────┐ ┌──────────┐ ┌─────┐ ┌──────────┐ ┌─────┐ │      │
│  │  │ Q1  │→│ InfoBreak│→│ Q2  │→│ InfoBreak│→│ Q3  │ │      │
│  │  └─────┘ └──────────┘ └─────┘ └──────────┘ └─────┘ │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

<a name="11-prisma"></a>
### 1.1 Prisma-Schema-Erweiterungen

**Datei:** `prisma/schema.prisma`

#### Neues Model: `WaitingContent`
```prisma
model WaitingContent {
  id          String   @id @default(uuid())
  type        String   // HEALTH_TIP, PRAXIS_NEWS, MINI_QUIZ, BREATHING_EXERCISE, FUN_FACT, SEASONAL_INFO
  category    String   // "allgemein", "ernaehrung", "bewegung", "psyche", "saisonal", "praxis"
  title       String
  body        String   // Markdown-fähiger Inhalt
  imageUrl    String?  // Optional: Illustrationslink
  quizData    String?  // JSON: { question, options: [{text, correct}], explanation }
  priority    Int      @default(0)  // Höher = wird bevorzugt angezeigt
  isActive    Boolean  @default(true)
  seasonal    String?  // "SPRING", "SUMMER", "AUTUMN", "WINTER" oder null für ganzjährig
  language    String   @default("de") // ISO 639-1
  minWaitMin  Int      @default(0)    // Zeige erst ab X Minuten Wartezeit
  maxWaitMin  Int?     // Zeige nur bis X Minuten (null = unbegrenzt)
  displayDurationSec Int @default(30) // Wie lange der Content angezeigt wird
  viewCount   Int      @default(0)
  likeCount   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([type, isActive, language])
  @@index([seasonal, isActive])
}
```

#### Neues Model: `WaitingAnalytics`
```prisma
model WaitingAnalytics {
  id              String   @id @default(uuid())
  sessionId       String
  contentId       String?  // FK zu WaitingContent (nullable für Flow-Events)
  eventType       String   // CONTENT_VIEW, CONTENT_LIKE, QUIZ_ANSWER, GAME_START, GAME_COMPLETE, INFOBREAK_VIEW, INFOBREAK_SKIP
  metadata        String?  // JSON: { quizCorrect?, gameScore?, durationSec?, skippedAfterSec? }
  waitPositionAtEvent Int? // Queue-Position als der Event stattfand
  createdAt       DateTime @default(now())

  @@index([sessionId, createdAt])
  @@index([contentId, eventType])
}
```

#### Erweiterung: `QueueEntry` (von in-memory → Prisma persistiert)
```prisma
model QueueEntry {
  id                  String   @id @default(uuid())
  sessionId           String   @unique
  patientName         String   // AES-verschlüsselt
  service             String
  priority            String   @default("NORMAL") // NORMAL, URGENT, EMERGENCY
  status              String   @default("WAITING") // WAITING, CALLED, IN_TREATMENT, DONE
  position            Int      @default(0)
  joinedAt            DateTime @default(now())
  calledAt            DateTime?
  treatmentStartedAt  DateTime?
  completedAt         DateTime?
  estimatedWaitMin    Int?
  entertainmentMode   String   @default("AUTO") // AUTO, GAMES, READING, QUIET
  contentHistory      String?  // JSON: string[] — IDs der bereits gesehenen Contents
  deviceType          String?  // TABLET, MOBILE, DESKTOP
  feedbackRating      Int?     // 1-5 Sterne nach Besuch

  session             PatientSession @relation(fields: [sessionId], references: [id])

  @@index([status, priority])
  @@index([joinedAt])
}
```

> **Migrationshinweis:** Die bestehende in-memory Queue in `server/routes/queue.ts` wird komplett durch das Prisma-Modell ersetzt. Alle bestehenden Queue-Endpoints bleiben API-kompatibel, nutzen aber Prisma statt Array.

#### Erweiterung: `PatientSession` (Relation)
```prisma
// In bestehendem PatientSession-Modell hinzufügen:
model PatientSession {
  // ... bestehende Felder ...
  queueEntry  QueueEntry?  // Neue 1:1 Relation
}
```

---

<a name="12-api"></a>
### 1.2 API-Endpunkte

**Datei:** `server/routes/queue.ts` (erweitert) + `server/routes/content.ts` (neu)

#### A. Queue-Endpunkte (Überarbeitung von `queue.ts`)

| Method | Path | Auth | Roles | Request Body | Response | Änderung |
|--------|------|------|-------|-------------|----------|----------|
| `POST` | `/api/queue/join` | `requireAuth` | any | `{ sessionId, patientName, service, priority?, entertainmentMode?, deviceType? }` | `{ entry: QueueEntry }` | **Erweitert:** Prisma statt in-memory, neue Felder |
| `GET` | `/api/queue` | `requireAuth` | arzt,admin,mfa | — | `{ queue: QueueEntry[], stats: { waiting, called, inTreatment, total, avgWaitMin, longestWaitMin } }` | **Erweitert:** Prisma, mehr Stats |
| `GET` | `/api/queue/position/:sessionId` | `requireAuth` | any | — | `{ position, status, estimatedWaitMin, entertainmentSuggestions: string[], queueLength }` | **Erweitert:** Entertainment-Vorschläge |
| `PUT` | `/api/queue/:id/call` | `requireAuth` | mfa,admin,arzt | — | `{ entry }` | Prisma statt Array |
| `PUT` | `/api/queue/:id/treat` | `requireAuth` | mfa,admin,arzt | — | `{ entry }` | Prisma + `treatmentStartedAt` |
| `PUT` | `/api/queue/:id/done` | `requireAuth` | mfa,admin,arzt | — | `{ entry }` | Prisma + `completedAt` |
| `PUT` | `/api/queue/:id/feedback` | `requireAuth` | any | `{ rating: 1-5 }` | `{ success }` | **NEU** |
| `DELETE` | `/api/queue/:id` | `requireAuth` | mfa,admin | — | `{ success }` | Prisma |

#### B. Content-Endpunkte (Neuer Router: `server/routes/content.ts`)

| Method | Path | Auth | Roles | Request Body | Response | Zweck |
|--------|------|------|-------|-------------|----------|-------|
| `GET` | `/api/content/waiting` | `requireAuth` | any | Query: `?lang=de&waitMin=5&exclude=id1,id2&category=allgemein&limit=5` | `{ items: WaitingContent[] }` | Personalisierter Content-Feed für wartende Patienten |
| `POST` | `/api/content/waiting/:id/view` | `requireAuth` | any | `{ sessionId, durationSec }` | `{ success }` | Analytics: Content wurde angesehen |
| `POST` | `/api/content/waiting/:id/like` | `requireAuth` | any | `{ sessionId }` | `{ success, newLikeCount }` | Patient liked Content |
| `POST` | `/api/content/waiting/quiz/:id/answer` | `requireAuth` | any | `{ sessionId, selectedOption, correct }` | `{ success }` | Quiz-Antwort tracken |
| `GET` | `/api/content/waiting/analytics` | `requireAuth` | admin | Query: `?days=30` | `{ totalViews, avgEngagementSec, quizAccuracy, topContent[], contentByType[] }` | Admin Analytics Dashboard |

#### C. Content-Admin-Endpunkte (in `server/routes/admin.ts` ergänzen)

| Method | Path | Auth | Roles | Request Body | Response | Zweck |
|--------|------|------|-------|-------------|----------|-------|
| `GET` | `/api/admin/content` | admin | admin | Query: `?type&category&isActive` | `{ items: WaitingContent[], total }` | Alle Contents auflisten |
| `POST` | `/api/admin/content` | admin | admin | `WaitingContent` (ohne id/timestamps) | `{ item }` | Content erstellen |
| `PUT` | `/api/admin/content/:id` | admin | admin | `Partial<WaitingContent>` | `{ item }` | Content bearbeiten |
| `DELETE` | `/api/admin/content/:id` | admin | admin | — | `{ success }` | Content löschen |
| `POST` | `/api/admin/content/seed` | admin | admin | — | `{ created: number }` | Initialen Content-Katalog seeden (50+ Einträge) |

---

<a name="13-socket"></a>
### 1.3 Socket.IO Events

**Datei:** `server/socket.ts` (erweitert)

#### Neue Events

| Event | Direction | Room | Payload | Zweck |
|-------|-----------|------|---------|-------|
| `queue:entertainment` | Server → Client | `session:{id}` | `{ content: WaitingContent, reason: string }` | Personaliesierten Content an wartenden Patient pushen |
| `queue:announcement` | Server → Client | broadcast | `{ title, body, type: 'info'\|'urgent' }` | Praxis-weite Ankündigung an alle Wartenden |
| `queue:mood-check` | Server → Client | `session:{id}` | `{ question: string, options: string[] }` | Stimmungs-Check nach X Minuten Wartezeit |
| `queue:mood-response` | Client → Server | — | `{ sessionId, mood: string }` | Antwort auf Mood-Check |
| `queue:infobreak-trigger` | Server → Client | `session:{id}` | `{ contentId, type, durationSec }` | InfoBreak im Fragebogen-Flow auslösen |

#### Logik: Entertainment-Push (`server/services/entertainmentEngine.ts` — NEU)

```typescript
// Pseudocode: EntertainmentEngine
class EntertainmentEngine {
  // Alle 60 Sekunden für jeden wartenden Patient ausführen:
  async tick(sessionId: string): Promise<void> {
    const entry = await getQueueEntry(sessionId);
    if (entry.status !== 'WAITING') return;

    const waitMin = diffMinutes(entry.joinedAt, now());
    const seen = JSON.parse(entry.contentHistory || '[]');

    // Content-Auswahl basierend auf:
    // 1. Wartezeit (minWaitMin/maxWaitMin Filter)
    // 2. Bereits gesehener Content (exclude)
    // 3. Saison (aktueller Monat → SPRING/SUMMER/AUTUMN/WINTER)
    // 4. Sprache (aus Session)
    // 5. Priorität (höher = bevorzugt)
    // 6. Entertainment-Mode Präferenz (GAMES/READING/QUIET)
    const content = await selectNextContent(waitMin, seen, entry);

    if (content) {
      io.to(`session:${sessionId}`).emit('queue:entertainment', {
        content,
        reason: waitMin > 15 ? 'lange_wartezeit' : 'engagement'
      });
      // Content als gesehen markieren
      await markContentSeen(entry.id, content.id);
    }

    // Mood-Check nach 10, 20, 30 Minuten
    if ([10, 20, 30].includes(waitMin)) {
      io.to(`session:${sessionId}`).emit('queue:mood-check', {
        question: 'Wie geht es Ihnen gerade?',
        options: ['😊 Gut', '😐 Geht so', '😟 Ungeduldig', '😰 Besorgt']
      });
    }
  }
}
```

---

<a name="14-frontend"></a>
### 1.4 Frontend-Komponenten

#### A. `PatientWartezimmer.tsx` — KOMPLETT ÜBERARBEITEN

**Aktuelle Struktur:** Einfache Queue-Anzeige mit 3 statischen Tips  
**Neue Struktur:** Reichhaltiges Entertainment-Center mit Tabs

```typescript
// src/components/PatientWartezimmer.tsx — Neue Struktur
interface PatientWartezimmerProps {
  sessionId: string;
  patientName: string;
  service: string;
  token?: string;
}

// Interne Tabs:
type WartezimmerTab = 'queue' | 'tipps' | 'games' | 'news';
```

**Layout (Neue UI):**
```
┌───────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────┐  │
│  │     Ihre Wartenummer: 3                 │  │
│  │     Geschätzte Wartezeit: ~16 Min       │  │
│  │     ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░  62%            │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌────┐ ┌────────┐ ┌──────┐ ┌──────┐        │
│  │ 📋 │ │ 💡     │ │ 🎮   │ │ 📰   │        │
│  │Queue│ │Gesund- │ │Spiele│ │Praxis│        │
│  │     │ │heit   │ │      │ │News  │        │
│  └────┘ └────────┘ └──────┘ └──────┘        │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │                                         │  │
│  │         [Tab-Content Area]              │  │
│  │                                         │  │
│  │   Health Tips / Mini-Games / News       │  │
│  │                                         │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  💬 Stimmung: Wie geht es Ihnen?       │  │
│  │  😊  😐  😟  😰                        │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

**Tab-Inhalte:**

| Tab | Komponente | Inhalt |
|-----|-----------|--------|
| `queue` | `QueueStatusCard` | Position, geschätzte Zeit, Fortschrittsbalken, Verbindungsstatus |
| `tipps` | `HealthTipCarousel` | Karussell durch `WaitingContent` vom Typ `HEALTH_TIP`, `FUN_FACT`, `SEASONAL_INFO` |
| `games` | `WaitingGames` | Mini-Quiz, Atemübung, Body-Scan Relaxation, bestehendes `DatenschutzGame` |
| `news` | `PraxisNewsFeed` | `WaitingContent` vom Typ `PRAXIS_NEWS`, chronologisch sortiert |

#### B. Neue Komponenten

| Komponente | Datei | Props | Beschreibung |
|-----------|-------|-------|-------------|
| `QueueStatusCard` | `src/components/waiting/QueueStatusCard.tsx` | `{ position, estimatedMin, status, queueLength }` | Kompakter Queue-Status mit animiertem Fortschritt |
| `HealthTipCarousel` | `src/components/waiting/HealthTipCarousel.tsx` | `{ items: WaitingContent[], onView, onLike }` | Auto-Rotation alle 30s, manuelles Blättern, Like-Button |
| `WaitingGames` | `src/components/waiting/WaitingGames.tsx` | `{ sessionId, onGameComplete }` | Game-Launcher: Quiz, Atemübung, Memory, Datenschutz-Game |
| `MiniQuiz` | `src/components/waiting/MiniQuiz.tsx` | `{ quiz: WaitingContent, onAnswer }` | Eine Quizfrage mit 3-4 Optionen, Erklärung nach Antwort |
| `BreathingExercise` | `src/components/waiting/BreathingExercise.tsx` | `{ durationSec?: number }` | Geführte 4-7-8 Atemübung mit Animation |
| `PraxisNewsFeed` | `src/components/waiting/PraxisNewsFeed.tsx` | `{ items: WaitingContent[] }` | Newsfeed mit Markdown-Rendering |
| `MoodCheck` | `src/components/waiting/MoodCheck.tsx` | `{ onRespond: (mood: string) => void }` | Emoji-basierte Stimmungsabfrage |
| `InfoBreak` | `src/components/waiting/InfoBreak.tsx` | `{ content: WaitingContent, onDismiss, onSkip }` | Zwischen-Fragen Info-Einschub mit Countdown-Skip |
| `WaitingContentAdmin` | `src/components/admin/WaitingContentAdmin.tsx` | — | CRUD für WaitingContent (Admin-Tab) |

#### C. `Questionnaire.tsx` — InfoBreak-Integration

**Erweiterung des Fragebogen-Flows:**

```typescript
// In Questionnaire.tsx — neuer State
const [infoBreak, setInfoBreak] = useState<WaitingContent | null>(null);
const [infoBreakTimer, setInfoBreakTimer] = useState<NodeJS.Timeout | null>(null);

// Adaptive Flow Controller (in useEffect)
// Prüft nach jeder beantworteten Frage:
function shouldInsertInfoBreak(): boolean {
  const queueEntry = useQueuePosition(sessionId);
  if (!queueEntry || queueEntry.status !== 'WAITING') return false;

  const waitMin = queueEntry.estimatedWaitMin || 0;
  const answeredCount = Object.keys(answers).length;

  // Regel: Ab 10 Min Wartezeit & mehr als 5 Wartende
  //        → Alle 3 Fragen einen InfoBreak einfügen
  if (waitMin > 10 && queueEntry.queueLength > 5) {
    return answeredCount % 3 === 0;
  }
  // Regel: Ab 20 Min → Alle 2 Fragen
  if (waitMin > 20) {
    return answeredCount % 2 === 0;
  }
  return false;
}

// Bei Navigation zur nächsten Frage:
function handleNextQuestion(nextAtomId: string) {
  if (shouldInsertInfoBreak()) {
    // InfoBreak laden und anzeigen
    const content = await api.getWaitingContent({ limit: 1, exclude: seenContent });
    if (content.items[0]) {
      setInfoBreak(content.items[0]);
      return; // Pausiert Navigation
    }
  }
  navigateToAtom(nextAtomId);
}
```

**InfoBreak UI-Flow:**
1. Frage beantwortet → `shouldInsertInfoBreak()` = true
2. InfoBreak-Overlay erscheint (Health-Tip oder Fun-Fact)
3. Patient liest 15-60 Sekunden (Countdown-Timer)
4. "Weiter"-Button wird aktiv ODER Patient klickt "Überspringen"
5. Navigation zur nächsten Frage

---

<a name="15-algorithmus"></a>
### 1.5 Adaptiver Flow-Algorithmus

**Datei:** `server/services/adaptiveFlowService.ts` (NEU)

```typescript
interface AdaptiveFlowConfig {
  // Basis: Keine Verzögerung, normaler Flow
  BASE_QUESTIONS_BETWEEN_BREAKS: 999;  // = nie

  // Stufe 1: Leichte Verzögerung (Wartezeit > 10 Min ODER Queue > 5)
  LEVEL1_QUESTIONS_BETWEEN_BREAKS: 5;
  LEVEL1_BREAK_DURATION_SEC: 15;
  LEVEL1_CONTENT_TYPES: ['HEALTH_TIP', 'FUN_FACT'];

  // Stufe 2: Moderate Verzögerung (Wartezeit > 20 Min ODER Queue > 10)
  LEVEL2_QUESTIONS_BETWEEN_BREAKS: 3;
  LEVEL2_BREAK_DURATION_SEC: 30;
  LEVEL2_CONTENT_TYPES: ['HEALTH_TIP', 'FUN_FACT', 'MINI_QUIZ', 'SEASONAL_INFO'];

  // Stufe 3: Maximale Beschäftigung (Wartezeit > 30 Min ODER Queue > 15)
  LEVEL3_QUESTIONS_BETWEEN_BREAKS: 2;
  LEVEL3_BREAK_DURATION_SEC: 45;
  LEVEL3_CONTENT_TYPES: ['HEALTH_TIP', 'MINI_QUIZ', 'BREATHING_EXERCISE', 'PRAXIS_NEWS'];
  LEVEL3_EXTRA_QUESTIONS: true; // Optionale Zusatzfragen einfügen
}

// Berechnung der aktuellen Stufe
function getAdaptiveLevel(waitMinutes: number, queueLength: number): 0 | 1 | 2 | 3 {
  if (waitMinutes > 30 || queueLength > 15) return 3;
  if (waitMinutes > 20 || queueLength > 10) return 2;
  if (waitMinutes > 10 || queueLength > 5)  return 1;
  return 0; // Kein Eingriff
}
```

**Server-Endpunkt für Flow-Config:**

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `GET` | `/api/queue/flow-config/:sessionId` | `requireAuth` | `{ level: 0-3, breakFrequency, breakDuration, contentTypes[], extraQuestionsEnabled }` |

Das Frontend fragt diesen Endpunkt alle 30 Sekunden ab und passt seinen internen InfoBreak-Timer an.

---

<a name="16-deps"></a>
### 1.6 Neue Dependencies

| Package | Version | Zweck | Datei |
|---------|---------|-------|-------|
| `react-markdown` | `^9.0.0` | Markdown-Rendering für Content-Body | `package.json` |
| `swiper` | `^11.0.0` | Karussell für Health-Tips | `package.json` |

> Keine Backend-Dependencies nötig — alles mit bestehendem Stack (Prisma, Socket.IO, Zod) lösbar.

---

<a name="17-tests"></a>
### 1.7 Tests

**Datei:** `e2e/wartezimmer-engagement.spec.ts` (NEU)

| Test | Beschreibung |
|------|-------------|
| `Queue join and position tracking` | Patient tritt Queue bei, Position wird korrekt angezeigt |
| `Content carousel loads and rotates` | Health-Tips laden und rotieren automatisch |
| `InfoBreak triggers after N questions` | Bei langer Wartezeit erscheint InfoBreak zwischen Fragen |
| `InfoBreak can be skipped` | Skip-Button funktioniert, nächste Frage erscheint |
| `Mood check appears at intervals` | Nach 10 Min erscheint Stimmungs-Abfrage |
| `Queue persistence across refresh` | Queue-Entry überlebt Page-Reload (Prisma statt in-memory) |
| `Entertainment mode preference` | Patient wählt GAMES → bekommt Spiele statt Lese-Inhalte |
| `Admin content CRUD` | Admin kann Content erstellen/bearbeiten/löschen |

---

<a name="modul-2"></a>
## 2. Modul 2: Software-Admin Erweiterung

### Ziel
Admin-Dashboard von statischer Dokumentation zu einer echten Management-Oberfläche umbauen: Live-Daten, Fragebogen-Konfiguration, ROI-Tracking, Rollen-/Rechte-Management, und KI-gestützte Wunschbox für Feature-Requests.

### Übersicht der Erweiterungen

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD (ERWEITERT)                  │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tabs (bestehend):                                              │
│  [Übersicht*] [Flow] [Sicherheit] [Export] [Produktivität]     │
│  [Architektur] [Changelog]                                      │
│                                                                 │
│  Tabs (NEU):                                                    │
│  [👥 Mitarbeiter] [📋 Fragebogen] [📊 ROI] [💡 Wunschbox]     │
│  [📰 Wartezeit-Content] [🔐 Rechte] [📋 Audit-Log*]          │
│                                                                 │
│  * = Von Hardcoded zu Live-Daten umgebaut                       │
└─────────────────────────────────────────────────────────────────┘
```

---

<a name="21-prisma"></a>
### 2.1 Prisma-Schema-Erweiterungen

**Datei:** `prisma/schema.prisma`

#### Neues Model: `Permission`
```prisma
model Permission {
  id          String   @id @default(uuid())
  code        String   @unique  // z.B. "patients.view", "patients.edit", "queue.manage", "admin.users", "admin.content", "export.pdf", "triage.acknowledge"
  name        String   // Anzeigename: "Patienten ansehen"
  description String?  // "Zugriff auf Patientenliste und Detailansicht"
  category    String   // "patients", "queue", "admin", "export", "triage", "chat", "atoms"
  createdAt   DateTime @default(now())

  roles       RolePermission[]

  @@index([category])
}
```

#### Neues Model: `RolePermission`
```prisma
model RolePermission {
  id           String     @id @default(uuid())
  role         String     // "ARZT", "MFA", "ADMIN" — oder custom role
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  grantedAt    DateTime   @default(now())
  grantedBy    String?    // userId des Admins der dies gewährt hat

  @@unique([role, permissionId])
  @@index([role])
}
```

#### Neues Model: `WunschboxEntry`
```prisma
model WunschboxEntry {
  id              String   @id @default(uuid())
  submittedBy     String   // userId
  originalText    String   // Freitext des Users
  aiParsedChanges String?  // JSON: [{ area, description, priority, estimatedEffort }]
  status          String   @default("PENDING") // PENDING, AI_PROCESSED, REVIEWED, APPROVED, REJECTED, IMPLEMENTED
  adminNotes      String?
  exportedSpec    String?  // JSON: Fertiges Spezifikations-Dokument für Entwickler
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  reviewedAt      DateTime?
  reviewedBy      String?  // Admin userId

  @@index([status, createdAt])
  @@index([submittedBy])
}
```

#### Neues Model: `ROISnapshot`
```prisma
model ROISnapshot {
  id                    String   @id @default(uuid())
  date                  DateTime @default(now()) @unique // Täglich um Mitternacht erstellt
  patientsServed        Int      // Bediente Patienten an diesem Tag
  sessionsCompleted     Int      // Abgeschlossene Fragebögen
  avgCompletionMinutes  Float    // Durchschnittliche Ausfüllzeit
  messagesCount         Int      // Nachrichten an Patienten/Mitarbeiter
  mfaMinutesSaved       Float    // Geschätzte eingesparte MFA-Minuten
  estimatedCostSaving   Float    // Euro-Wert der Einsparung
  
  // Konfigurierbare Praxis-Parameter (bei Erstellung kopiert)
  mfaHourlyCost         Float    @default(22.50)  // €/Stunde MFA
  avgManualIntakeMin    Float    @default(12.0)    // Minuten pro manuelle Anamnese
  monthlyLicenseCost    Float    @default(299.0)   // Monatliche Lizenzkosten DiggAI

  @@index([date])
}
```

#### Neues Model: `AtomDraft` (Fragebogen-Builder Entwürfe)
```prisma
model AtomDraft {
  id             String   @id @default(uuid())
  atomId         String?  // null = neuer Atom, sonst = Bearbeitung bestehender
  draftData      String   // JSON: Kompletter MedicalAtom als Draft
  status         String   @default("DRAFT") // DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, REJECTED
  createdBy      String   // userId
  reviewedBy     String?
  publishedAt    DateTime?
  changeNote     String?  // Beschreibung der Änderung
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([status])
  @@index([atomId])
}
```

#### Erweiterung: `ArztUser`
```prisma
model ArztUser {
  // ... bestehende Felder ...
  customPermissions String?  // JSON: string[] — Zusätzliche Permission-Codes über Rolle hinaus
  lastLoginAt       DateTime?
  loginCount        Int      @default(0)
}
```

---

<a name="22-api"></a>
### 2.2 API-Endpunkte

#### A. Fragebogen-Builder (`server/routes/atoms.ts` — erweitert)

| Method | Path | Auth | Roles | Request | Response | Zweck |
|--------|------|------|-------|---------|----------|-------|
| `GET` | `/api/atoms` | any | any | `?ids=...&module=...&section=...` | `{ atoms[] }` | **Bestehend:** erweitert um Filter |
| `GET` | `/api/atoms/:id` | any | any | — | `{ atom }` | **NEU:** Einzelnen Atom laden |
| `PUT` | `/api/atoms/reorder` | admin | admin | `{ orders: [{ id, orderIndex }] }` | `{ success, updated }` | **NEU:** Reihenfolge ändern (Drag&Drop) |
| `PUT` | `/api/atoms/:id/toggle` | admin | admin | `{ isActive: boolean }` | `{ atom }` | **NEU:** Frage aktivieren/deaktivieren |
| `POST` | `/api/atoms/draft` | admin | admin | `{ atomId?, draftData, changeNote? }` | `{ draft: AtomDraft }` | **NEU:** Entwurf speichern |
| `GET` | `/api/atoms/drafts` | admin | admin | `?status=DRAFT` | `{ drafts[] }` | **NEU:** Entwürfe auflisten |
| `PUT` | `/api/atoms/draft/:id/publish` | admin | admin | — | `{ atom, draft }` | **NEU:** Entwurf veröffentlichen (→ MedicalAtom upsert) |
| `DELETE` | `/api/atoms/draft/:id` | admin | admin | — | `{ success }` | **NEU:** Entwurf löschen |

> **Schema-Erweiterung für MedicalAtom:** Neues Feld `isActive Boolean @default(true)` hinzufügen.  
> Die QuestionFlowEngine und alle Frontend-Logik muss `isActive` prüfen.

#### B. Rechte-Management (`server/routes/admin.ts` — erweitert)

| Method | Path | Auth | Roles | Request | Response | Zweck |
|--------|------|------|-------|---------|----------|-------|
| `GET` | `/api/admin/permissions` | admin | admin | — | `{ permissions: Permission[] }` | Alle verfügbaren Rechte |
| `GET` | `/api/admin/roles/:role/permissions` | admin | admin | — | `{ permissions: Permission[] }` | Rechte einer Rolle |
| `PUT` | `/api/admin/roles/:role/permissions` | admin | admin | `{ permissionIds: string[] }` | `{ success, count }` | Rechte einer Rolle setzen (replace all) |
| `PUT` | `/api/admin/users/:id/permissions` | admin | admin | `{ permissionCodes: string[] }` | `{ success }` | Individuelle Zusatz-Rechte für User |
| `GET` | `/api/admin/permissions/check` | any | any | `?code=patients.view` | `{ allowed: boolean }` | Eigene Berechtigung prüfen |

**Vordefinierte Berechtigungen (Seed):**

| Code | Name | Kategorie | Default: ADMIN | Default: ARZT | Default: MFA |
|------|------|-----------|:-:|:-:|:-:|
| `patients.view` | Patienten ansehen | patients | ✅ | ✅ | ✅ |
| `patients.edit` | Patienten bearbeiten | patients | ✅ | ✅ | ❌ |
| `patients.delete` | Patienten löschen | patients | ✅ | ❌ | ❌ |
| `sessions.view` | Sitzungen ansehen | sessions | ✅ | ✅ | ✅ |
| `sessions.manage` | Sitzungen verwalten | sessions | ✅ | ✅ | ✅ |
| `queue.view` | Warteschlange ansehen | queue | ✅ | ✅ | ✅ |
| `queue.manage` | Patienten aufrufen | queue | ✅ | ✅ | ✅ |
| `triage.view` | Triage-Alerts ansehen | triage | ✅ | ✅ | ✅ |
| `triage.acknowledge` | Triage bestätigen | triage | ✅ | ✅ | ❌ |
| `chat.patient` | Mit Patienten chatten | chat | ✅ | ✅ | ✅ |
| `chat.staff` | Team-Chat | chat | ✅ | ✅ | ✅ |
| `export.pdf` | PDF exportieren | export | ✅ | ✅ | ✅ |
| `export.csv` | CSV exportieren | export | ✅ | ✅ | ❌ |
| `export.json` | JSON exportieren | export | ✅ | ❌ | ❌ |
| `atoms.view` | Fragebogen ansehen | atoms | ✅ | ✅ | ❌ |
| `atoms.edit` | Fragebogen bearbeiten | atoms | ✅ | ❌ | ❌ |
| `admin.users` | Benutzer verwalten | admin | ✅ | ❌ | ❌ |
| `admin.content` | Inhalte verwalten | admin | ✅ | ❌ | ❌ |
| `admin.audit` | Audit-Log einsehen | admin | ✅ | ❌ | ❌ |
| `admin.roi` | ROI-Dashboard | admin | ✅ | ❌ | ❌ |
| `admin.wunschbox` | Wunschbox verwalten | admin | ✅ | ❌ | ❌ |
| `admin.settings` | Systemeinstellungen | admin | ✅ | ❌ | ❌ |

#### C. Wunschbox (`server/routes/wunschbox.ts` — NEU)

| Method | Path | Auth | Roles | Request | Response | Zweck |
|--------|------|------|-------|---------|----------|-------|
| `POST` | `/api/wunschbox` | any staff | arzt,mfa,admin | `{ text: string }` | `{ entry: WunschboxEntry }` | Wunsch einreichen |
| `GET` | `/api/wunschbox` | admin | admin | `?status&page&limit` | `{ entries[], pagination }` | Alle Wünsche auflisten |
| `POST` | `/api/wunschbox/:id/process` | admin | admin | — | `{ entry mit aiParsedChanges }` | KI-Verarbeitung auslösen |
| `PUT` | `/api/wunschbox/:id/review` | admin | admin | `{ status, adminNotes? }` | `{ entry }` | Status ändern |
| `POST` | `/api/wunschbox/:id/export` | admin | admin | — | `{ spec: string }` | Fertige Spezifikation generieren |
| `GET` | `/api/wunschbox/my` | any staff | arzt,mfa,admin | — | `{ entries[] }` | Eigene Wünsche |

#### D. ROI-Dashboard (`server/routes/roi.ts` — NEU)

| Method | Path | Auth | Roles | Request | Response | Zweck |
|--------|------|------|-------|---------|----------|-------|
| `GET` | `/api/roi/today` | admin | admin | — | `{ snapshot: ROISnapshot (live berechnet) }` | Live Tages-ROI |
| `GET` | `/api/roi/history` | admin | admin | `?period=week\|month\|year` | `{ snapshots[], summary: { avgDaily, total, trend } }` | Historische ROI-Daten |
| `GET` | `/api/roi/config` | admin | admin | — | `{ mfaHourlyCost, avgManualIntakeMin, monthlyLicenseCost }` | Aktuelle ROI-Parameter |
| `PUT` | `/api/roi/config` | admin | admin | `{ mfaHourlyCost?, avgManualIntakeMin?, monthlyLicenseCost? }` | `{ config }` | ROI-Parameter anpassen |
| `GET` | `/api/roi/projection` | admin | admin | `?months=12` | `{ monthly: [{ month, projected, cumulative }] }` | ROI-Prognose |

---

<a name="23-frontend"></a>
### 2.3 Frontend-Komponenten

#### A. Admin Dashboard Live-Umbau (`src/pages/AdminDashboard.tsx`)

**Phase 1: Bestehende Tabs auf Live-Daten umstellen**

| Tab | Aktuell | Neu |
|-----|---------|-----|
| `overview` | 8 hardcoded Stats | React Query → `GET /api/admin/stats` |
| `overview` | Hardcoded Charts | React Query → `GET /api/admin/sessions/timeline`, `/analytics/services`, `/analytics/triage` |
| `productivity` | Hardcoded ROI | React Query → `GET /api/roi/today` + `/roi/history` |

**Phase 2: Neue Tabs hinzufügen**

#### B. Neue Admin-Komponenten

| Komponente | Datei | Beschreibung |
|-----------|-------|-------------|
| `UserManagementTab` | `src/components/admin/UserManagementTab.tsx` | Tabelle aller `ArztUser`, Erstellen/Bearbeiten/Deaktivieren Dialog, Rollen-Zuweisung. Konsumiert `GET/POST/PUT/DELETE /api/admin/users` |
| `PermissionMatrix` | `src/components/admin/PermissionMatrix.tsx` | Matrix-Ansicht: Zeilen = Rechte, Spalten = Rollen. Checkboxen zum Aktivieren/Deaktivieren. Drag-Spalten für Custom Roles |
| `UserPermissionDialog` | `src/components/admin/UserPermissionDialog.tsx` | Dialog für individuelle Zusatz-Rechte pro User (über Rolle hinaus) |
| `FragebogenBuilder` | `src/components/admin/FragebogenBuilder.tsx` | Hauptkomponente: Linke Spalte = Fragen-Liste (sortierbar, filterbar nach Modul/Section), Rechte Spalte = Frage-Editor |
| `AtomListPanel` | `src/components/admin/AtomListPanel.tsx` | Drag&Drop-sortierbare Liste aller MedicalAtoms mit Toggle (aktiv/inaktiv), Modul-Filter, Suchfeld |
| `AtomEditorPanel` | `src/components/admin/AtomEditorPanel.tsx` | Formular zum Bearbeiten: questionText, answerType (Dropdown), options (dynamisch), validationRules (JSON Editor), branchingLogic (visuell), isRedFlag Toggle |
| `BranchingLogicEditor` | `src/components/admin/BranchingLogicEditor.tsx` | Visueller Editor: Wenn-Dann Blöcke, Bedingungen als Dropdowns (Frage → Operator → Wert → Ziel-Frage) |
| `ROIDashboard` | `src/components/admin/ROIDashboard.tsx` | Live-ROI: Tages-Karte (Patienten, Minuten gespart, €-Einsparung), Wochen-/Monats-Charts (Recharts BarChart), Jahres-Prognose (LineChart), Konfigurierbare Parameter |
| `ROIConfigDialog` | `src/components/admin/ROIConfigDialog.tsx` | Dialog: MFA-Stundensatz, Manuelle Anamnese-Dauer, Lizenzkosten eingeben |
| `WunschboxTab` | `src/components/admin/WunschboxTab.tsx` | Zwei Bereiche: (1) Eingabe-Textfeld für neuen Wunsch, (2) Liste bestehender Wünsche mit Status-Filter |
| `WunschboxDetail` | `src/components/admin/WunschboxDetail.tsx` | Detail-Ansicht: Original-Text, KI-geparste Änderungen als Checkliste, Admin-Notizen, Status-Änderung, Export-Button |
| `AuditLogTab` | `src/components/admin/AuditLogTab.tsx` | Paginierte Tabelle mit Filtern (Action, User, Datum). Konsumiert `GET /api/admin/audit-log` — **existiert als Backend, fehlt im Frontend** |
| `WaitingContentTab` | `src/components/admin/WaitingContentTab.tsx` | CRUD für `WaitingContent`: Liste + Editor. Filterbar nach Typ/Kategorie. Preview-Funktion |

#### C. Fragebogen-Builder Detail-Design

```
┌─────────────────────────────────────────────────────────────────┐
│  Fragebogen-Builder                                  [Entwürfe] │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────── Modul-Filter ──────────┐                           │
│  │ [Alle] [Basis] [Beschwerden]     │                           │
│  │ [Enrollment] [Spezial] [Allg.]   │                           │
│  └──────────────────────────────────┘                           │
│                                                                 │
│  ┌─── Fragen-Liste (Drag&Drop) ───┐  ┌─── Fragen-Editor ────┐ │
│  │ ☰ 0000 Bekannter Patient? [✓]  │  │ ID: 0000             │ │
│  │ ☰ 0001 Vorname          [✓]  │  │ Frage: __________    │ │
│  │ ☰ 0011 Nachname         [✓]  │  │ Typ: [radio ▼]       │ │
│  │ ☰ 0002 Geschlecht       [✓]  │  │ Pflichtfeld: [✓]     │ │
│  │ ☰ 0003 Geburtsdatum     [✓]  │  │ Red-Flag: [ ]        │ │
│  │ ☰ 1000 Hauptbeschwerde  [✓]  │  │ PII: [✓]             │ │
│  │ ☰ 1001 Seit wann?       [✓]  │  │                      │ │
│  │   ...                         │  │ Optionen:            │ │
│  │ ☰ GYN-100 Letzte Periode [○]  │  │ + Option hinzufügen  │ │
│  │       ○ = deaktiviert         │  │                      │ │
│  │                               │  │ Verzweigung:         │ │
│  │ [+ Neue Frage]               │  │ [Visueller Editor]   │ │
│  └───────────────────────────────┘  │                      │ │
│                                      │ [Als Entwurf]       │ │
│                                      │ [Veröffentlichen]   │ │
│                                      └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Interaktion:**
1. Admin klickt auf Frage in Liste → Editor rechts zeigt Frage-Details
2. Drag&Drop verschiebt Reihenfolge → `PUT /api/atoms/reorder`
3. Toggle-Switch deaktiviert Frage → `PUT /api/atoms/:id/toggle`
4. "Als Entwurf" speichert als `AtomDraft` → Review-Flow
5. "Veröffentlichen" = sofortige Änderung am Live-System (mit Bestätigungsdialog)
6. "Entwürfe"-Tab zeigt alle nicht-publizierten Änderungen

---

<a name="24-roi"></a>
### 2.4 ROI-Formel

**Grundformel (Tages-ROI):**

```
Eingesparte_MFA_Minuten = Patienten_bedient × Avg_Manuelle_Anamnese_Min
Kosten_Einsparung_€ = (Eingesparte_MFA_Minuten / 60) × MFA_Stundensatz
ROI_Tag_€ = Kosten_Einsparung_€ - (Monatliche_Lizenzkosten / Arbeitstage_pro_Monat)
```

**Server-Berechnung (`server/services/roiService.ts` — NEU):**

```typescript
interface ROIConfig {
  mfaHourlyCost: number;       // Default: 22.50 €/h
  avgManualIntakeMin: number;  // Default: 12 Min
  monthlyLicenseCost: number;  // Default: 299 €/Monat
  workdaysPerMonth: number;    // Default: 21
}

interface DailyROI {
  date: string;
  patientsServed: number;           // COUNT(sessions WHERE completedAt = today)
  sessionsCompleted: number;         // COUNT(sessions WHERE status=COMPLETED today)
  avgCompletionMinutes: number;      // AVG(completedAt - createdAt) für heute
  messagesCount: number;             // COUNT(chatMessages today)
  mfaMinutesSaved: number;           // patientsServed × avgManualIntakeMin
  costSaving: number;                // (mfaMinutesSaved / 60) × mfaHourlyCost
  licenseCostPerDay: number;         // monthlyLicenseCost / workdaysPerMonth
  netROI: number;                    // costSaving - licenseCostPerDay
  cumulativeMonthROI: number;        // Summe aller netROI des Monats
}

// Prognose
interface ROIProjection {
  month: string;                     // "2026-03"
  projectedPatients: number;         // Basierend auf Durchschnitt der letzten N Tage
  projectedSaving: number;
  projectedNetROI: number;
  cumulativeROI: number;
}
```

**Cron-Job:** `server/jobs/roiSnapshot.ts` — Täglich um 23:59 einen `ROISnapshot` erstellen mit den Tageswerten. Falls keine historischen Daten vorhanden → Prognose basierend auf aktuellem Tag hochrechnen.

**Wochen-Ansicht:** Durchschnitt der letzten 5 Arbeitstage  
**Monats-Ansicht:** Durchschnitt der letzten 21 Arbeitstage  
**Jahres-Ansicht:** Hochrechnung basierend auf verfügbaren Monatsdaten

---

<a name="25-wunschbox"></a>
### 2.5 Wunschbox KI-Prompt

**Datei:** `server/services/wunschboxService.ts` (NEU)

#### Vordefinierter System-Prompt:

```
Du bist ein technischer Analyst für die DiggAI Anamnese-App. 
Du erhältst Feature-Requests von Praxis-Mitarbeitern und übersetzt diese in strukturierte technische Spezifikationen.

Die App ist eine React+Express+PostgreSQL Webanwendung für digitale Anamnese in Arztpraxen.

Antworte IMMER als JSON-Array mit folgender Struktur:
[
  {
    "area": "frontend" | "backend" | "database" | "config" | "design",
    "component": "Betroffene Komponente oder Seite",
    "description": "Klare Beschreibung der Änderung",
    "priority": "high" | "medium" | "low",
    "estimatedEffort": "XS" | "S" | "M" | "L" | "XL",
    "technicalNotes": "Technische Hinweise zur Umsetzung",
    "dependencies": ["Liste von Abhängigkeiten"]
  }
]

Regeln:
- Interpretiere den Wunsch großzügig — auch unklare Formulierungen sollen in konkrete Features übersetzt werden
- Zerlege komplexe Wünsche in mehrere kleine Änderungen
- Schätze den Aufwand realistisch (XS=<1h, S=1-4h, M=4-8h, L=1-3 Tage, XL=3+ Tage)
- Berücksichtige bestehende Komponenten (Admin-Dashboard, Fragebogen, Patient-Flow)
- Weise auf potenzielle Risiken oder Nebenwirkungen hin via technicalNotes
```

#### Flow:

```
Praxis-Mitarbeiter               Admin                     System
      │                            │                          │
      ├─ Freitext eingeben ───────►│                          │
      │  "Wir brauchen eine       │                          │
      │   Möglichkeit Rezepte     │                          │
      │   direkt zu verschicken"  │                          │
      │                            ├─ POST /wunschbox ───────►│
      │                            │                          ├─ Status: PENDING
      │                            │                          │
      │                            ├─ POST /wunschbox/:id/    │
      │                            │       process ──────────►│
      │                            │                          ├─ KI verarbeitet
      │                            │                          ├─ aiParsedChanges: [
      │                            │                          │    { area: "backend",
      │                            │                          │      component: "Rezept-Route",
      │                            │                          │      description: "...",
      │                            │                          │      priority: "high",
      │                            │                          │      estimatedEffort: "L" },
      │                            │                          │    { area: "frontend",
      │                            │                          │      component: "Rezept-Form",
      │                            │                          │      ... }
      │                            │                          │  ]
      │                            │◄─────────────────────────┤
      │                            │                          │
      │                            ├─ Admin reviewt Liste     │
      │                            ├─ Passt an / Genehmigt    │
      │                            ├─ PUT /wunschbox/:id/     │
      │                            │       review             │
      │                            │    status: APPROVED      │
      │                            │                          │
      │                            ├─ POST /wunschbox/:id/    │
      │                            │       export ───────────►│
      │                            │                          ├─ Generiert vollständige
      │                            │                          │  Spezifikation als JSON
      │                            │◄─────────────────────────┤
      │                            │                          │
      │                            │  Spec wird per Mail an   │
      │                            │  Entwickler geschickt    │
      │                            │  oder direkt in VS Code  │
      │                            │  Copilot eingefügt       │
```

#### Export-Format (für Entwickler):

```json
{
  "id": "wunsch-uuid",
  "originalRequest": "Freitext...",
  "createdAt": "2026-03-04T10:00:00Z",
  "approvedBy": "admin-name",
  "changes": [
    {
      "area": "backend",
      "component": "server/routes/rezepte.ts",
      "action": "CREATE",
      "description": "Neuen Router für Rezept-Versand erstellen",
      "endpoints": [
        {
          "method": "POST",
          "path": "/api/rezepte/send",
          "requestBody": { "patientId": "string", "medication": "string[]" },
          "responseBody": { "success": "boolean", "sentAt": "string" }
        }
      ],
      "estimatedEffort": "L",
      "priority": "high"
    }
  ],
  "totalEstimatedHours": 24,
  "generatedAt": "2026-03-04T10:05:00Z"
}
```

#### KI-Integration:

**Phase 1 (MVP):** Nutze bestehenden `aiService.ts` Pattern — regelbasiertes Parsing mit Keyword-Matching. Der Admin kann manuell die Änderungsliste anpassen.

**Phase 2 (mit API-Key):** OpenAI/Anthropic API-Call mit dem vordefinierten Prompt. Environment Variable `WUNSCHBOX_AI_API_KEY` und `WUNSCHBOX_AI_MODEL` (default: `gpt-4o-mini`).

**Phase 3 (Lokal):** Lokales LLM (Modul 6) übernimmt die Verarbeitung.

---

<a name="26-deps"></a>
### 2.6 Neue Dependencies

| Package | Version | Zweck | Datei |
|---------|---------|-------|-------|
| `@dnd-kit/core` | `^6.1.0` | Drag&Drop für Fragebogen-Builder | `package.json` |
| `@dnd-kit/sortable` | `^8.0.0` | Sortierbare Listen | `package.json` |
| `@dnd-kit/utilities` | `^3.2.2` | DnD Utilities | `package.json` |
| `node-cron` | `^3.0.3` | Cron-Job für ROI-Snapshot | `package.json` |
| `openai` | `^4.0.0` | *Optional* — nur für Wunschbox Phase 2 | `package.json` |

---

<a name="27-tests"></a>
### 2.7 Tests

**Datei:** `e2e/admin-erweiterung.spec.ts` (NEU)

| Test | Beschreibung |
|------|-------------|
| `Admin login and dashboard loads` | Login als Admin, Dashboard zeigt Live-Daten |
| `User CRUD operations` | Erstellen, Bearbeiten, Deaktivieren von Mitarbeitern |
| `Permission matrix toggle` | Recht aktivieren/deaktivieren, Auswirkung sofort sichtbar |
| `Fragebogen reorder via drag` | Frage per Drag&Drop verschieben, neue Reihenfolge gespeichert |
| `Fragebogen toggle active/inactive` | Frage deaktivieren, verschwindet aus Patient-Flow |
| `ROI dashboard shows live data` | Tages-ROI berechnet aus echten Session-Daten |
| `ROI config update` | MFA-Stundensatz ändern, Berechnung aktualisiert sich |
| `Wunschbox submit and review` | Text einreichen, KI-Verarbeitung, Admin-Review, Export |
| `Audit log filter and pagination` | Filter nach Action/User/Datum, Seiten blättern |
| `Content CRUD for waiting room` | Wartezeit-Content erstellen, bearbeiten, deaktivieren |

---

<a name="migrations"></a>
## 3. Migrations-Strategie

### Prisma Migration

```bash
# Migration erstellen
npx prisma migrate dev --name add_modul_1_2

# Änderungen:
# 1. Neue Models: WaitingContent, WaitingAnalytics, QueueEntry, Permission, 
#    RolePermission, WunschboxEntry, ROISnapshot, AtomDraft
# 2. Erweiterte Models: PatientSession (queueEntry Relation), 
#    ArztUser (customPermissions, lastLoginAt, loginCount),
#    MedicalAtom (isActive)
```

### Seed-Script Erweiterungen (`prisma/seed.ts`)

1. **50+ WaitingContent-Einträge** (10 Health-Tips, 10 Fun-Facts, 10 Mini-Quizze, 5 Atemübungen, 10 Saisonale, 5 Praxis-News)
2. **22 Permission-Einträge** (siehe Tabelle oben)
3. **Default RolePermission-Zuordnungen** für ADMIN, ARZT, MFA
4. **ROI-Config** Initialwerte

### Bestehende Daten

- **Queue:** In-memory Array wird verworfen. Kein Datenverlust — Queue-Daten sind transient.
- **MedicalAtom:** `isActive` default `true` → alle bestehenden Fragen bleiben aktiv.
- **ArztUser:** Neue Felder haben Defaults → keine Breaking Changes.

### Rückwärtskompatibilität

- Alle bestehenden API-Responses behalten ihre Struktur
- Neue Felder sind optional in Responses
- Frontend `isDemoMode()` muss für alle neuen Endpoints Demo-Mocks erhalten

---

<a name="dateiliste"></a>
## 4. Dateiliste: Alle Änderungen

### Neue Dateien

| Pfad | Typ | Beschreibung |
|------|-----|-------------|
| `server/routes/content.ts` | Backend | Content-Endpunkte für Wartezeit-Material |
| `server/routes/wunschbox.ts` | Backend | Wunschbox CRUD + KI-Verarbeitung |
| `server/routes/roi.ts` | Backend | ROI-Berechnung und -Historie |
| `server/services/entertainmentEngine.ts` | Backend | Content-Auswahl + Push-Logik für Wartende |
| `server/services/adaptiveFlowService.ts` | Backend | Berechnung der Flow-Verlangsamung |
| `server/services/roiService.ts` | Backend | ROI-Berechnung, Prognose, Config |
| `server/services/wunschboxService.ts` | Backend | KI-Prompt + Parsing für Wunschbox |
| `server/jobs/roiSnapshot.ts` | Backend | Täglicher Cron-Job für ROI-Snapshots |
| `src/components/waiting/QueueStatusCard.tsx` | Frontend | Queue-Status-Anzeige |
| `src/components/waiting/HealthTipCarousel.tsx` | Frontend | Gesundheitstipp-Karussell |
| `src/components/waiting/WaitingGames.tsx` | Frontend | Mini-Game-Launcher |
| `src/components/waiting/MiniQuiz.tsx` | Frontend | Quiz-Einzelfrage |
| `src/components/waiting/BreathingExercise.tsx` | Frontend | Atemübungs-Animation |
| `src/components/waiting/PraxisNewsFeed.tsx` | Frontend | Praxis-Nachrichtenfeed |
| `src/components/waiting/MoodCheck.tsx` | Frontend | Stimmungsabfrage |
| `src/components/waiting/InfoBreak.tsx` | Frontend | Informations-Pause im Fragebogen |
| `src/components/admin/UserManagementTab.tsx` | Frontend | Mitarbeiter-Verwaltung |
| `src/components/admin/PermissionMatrix.tsx` | Frontend | Rechte-Matrix |
| `src/components/admin/UserPermissionDialog.tsx` | Frontend | Individuelle Rechte-Zuweisung |
| `src/components/admin/FragebogenBuilder.tsx` | Frontend | Hauptkomponente Fragebogen-Builder |
| `src/components/admin/AtomListPanel.tsx` | Frontend | Drag&Drop Fragen-Liste |
| `src/components/admin/AtomEditorPanel.tsx` | Frontend | Fragen-Editor-Formular |
| `src/components/admin/BranchingLogicEditor.tsx` | Frontend | Visueller Wenn-Dann Editor |
| `src/components/admin/ROIDashboard.tsx` | Frontend | Live-ROI-Anzeige |
| `src/components/admin/ROIConfigDialog.tsx` | Frontend | ROI-Parameter-Konfiguration |
| `src/components/admin/WunschboxTab.tsx` | Frontend | Wunschbox Übersicht |
| `src/components/admin/WunschboxDetail.tsx` | Frontend | Wunsch Detail + KI-Ergebnis |
| `src/components/admin/AuditLogTab.tsx` | Frontend | Audit-Log-Ansicht |
| `src/components/admin/WaitingContentTab.tsx` | Frontend | Wartezeit-Content-Verwaltung |
| `e2e/wartezimmer-engagement.spec.ts` | Test | E2E-Tests Modul 1 |
| `e2e/admin-erweiterung.spec.ts` | Test | E2E-Tests Modul 2 |
| `prisma/seed-content.ts` | Seed | 50+ WaitingContent Einträge |
| `prisma/seed-permissions.ts` | Seed | 22 Permissions + Default-Zuordnungen |

### Geänderte Dateien

| Pfad | Änderung |
|------|----------|
| `prisma/schema.prisma` | 8 neue Models, 3 Model-Erweiterungen (siehe 1.1 + 2.1) |
| `server/index.ts` | 3 neue Route-Imports mounten: content, wunschbox, roi |
| `server/routes/queue.ts` | Komplett überarbeiten: in-memory → Prisma, neue Felder, neue Endpoints |
| `server/routes/admin.ts` | Content-CRUD + Permission-Endpoints hinzufügen |
| `server/routes/atoms.ts` | CRUD-Endpoints hinzufügen (reorder, toggle, draft) |
| `server/middleware/auth.ts` | `requirePermission(code)` Middleware hinzufügen (prüft Permission statt nur Role) |
| `server/socket.ts` | 5 neue Events (entertainment, announcement, mood-check, mood-response, infobreak-trigger) |
| `server/engine/QuestionFlowEngine.ts` | `isActive` Filter für MedicalAtoms |
| `src/components/PatientWartezimmer.tsx` | Komplett überarbeiten → Tab-System mit Entertainment (siehe 1.4) |
| `src/components/Questionnaire.tsx` | InfoBreak-Integration (siehe 1.4.C) |
| `src/pages/AdminDashboard.tsx` | Hardcoded → Live-Daten, 7 neue Tabs hinzufügen |
| `src/api/client.ts` | ~30 neue API-Methoden + Demo-Mocks |
| `src/hooks/useApi.ts` | ~20 neue React Query Hooks |
| `src/store/sessionStore.ts` | `infoBreakHistory`, `entertainmentMode` Felder |
| `package.json` | 5-6 neue Dependencies |
| `public/locales/de/translation.json` | ~100 neue Übersetzungs-Keys (admin.*, waiting.*, roi.*, wunschbox.*) |
| `public/locales/{en,tr,ar,...}/translation.json` | Übersetzungen für alle 10 Sprachen |
| `prisma/seed.ts` | Import der neuen Seed-Scripts |

---

<a name="reihenfolge"></a>
## 5. Implementierungs-Reihenfolge

### Phase A: Basis-Infrastruktur (Prompt 2a — Geschätzter Aufwand: ~4h Agent-Zeit)

```
Schritt 1: Prisma-Schema erweitern (alle neuen Models + Erweiterungen)
Schritt 2: Migration ausführen
Schritt 3: Seed-Scripts erstellen (Permissions, Content, ROI-Config)
Schritt 4: Auth-Middleware erweitern (requirePermission)
```

### Phase B: Queue & Wartezeit-Backend (Prompt 2b — ~3h)

```
Schritt 5: queue.ts überarbeiten (in-memory → Prisma)
Schritt 6: content.ts Route erstellen
Schritt 7: entertainmentEngine.ts erstellen
Schritt 8: adaptiveFlowService.ts erstellen
Schritt 9: Socket.IO neue Events
Schritt 10: server/index.ts — Routes mounten
```

### Phase C: Admin-Backend (Prompt 2c — ~3h)

```
Schritt 11: atoms.ts CRUD-Endpoints
Schritt 12: wunschbox.ts Route + Service
Schritt 13: roi.ts Route + Service + Cron-Job
Schritt 14: admin.ts erweitern (Content-CRUD, Permissions)
```

### Phase D: Wartezeit-Frontend (Prompt 2d — ~4h)

```
Schritt 15: waiting/ Komponenten (8 neue Dateien)
Schritt 16: PatientWartezimmer.tsx überarbeiten
Schritt 17: Questionnaire.tsx InfoBreak-Integration
Schritt 18: API-Client + Hooks erweitern
Schritt 19: Demo-Mode Mocks
```

### Phase E: Admin-Frontend (Prompt 2e — ~5h)

```
Schritt 20: AdminDashboard Live-Umbau (Overview + Productivity)
Schritt 21: UserManagementTab + PermissionMatrix
Schritt 22: FragebogenBuilder (AtomListPanel + AtomEditorPanel + BranchingLogicEditor)
Schritt 23: ROIDashboard + ROIConfigDialog
Schritt 24: WunschboxTab + WunschboxDetail
Schritt 25: AuditLogTab + WaitingContentTab
```

### Phase F: I18n + Tests (Prompt 2f — ~2h)

```
Schritt 26: Alle Übersetzungs-Keys für 10 Sprachen
Schritt 27: E2E-Tests (wartezimmer-engagement.spec.ts)
Schritt 28: E2E-Tests (admin-erweiterung.spec.ts)
Schritt 29: Integration-Test: Wartezeit-Flow End-to-End
Schritt 30: Demo-Mode vollständig testen
```

---

## Zusammenfassung

| Metrik | Wert |
|--------|------|
| Neue Prisma-Models | 8 |
| Erweiterte Prisma-Models | 3 |
| Neue API-Endpunkte | ~25 |
| Neue Frontend-Komponenten | ~28 |
| Neue Backend-Services | 5 |
| Neue Socket-Events | 5 |
| Neue Seed-Einträge | ~75 |
| Geänderte bestehende Dateien | ~18 |
| Geschätzte Implementierungs-Prompts | 6 (2a–2f) |
| Neue npm-Dependencies | 5–6 |
| Neue Übersetzungs-Keys | ~100 pro Sprache |

> **Nächster Schritt:** Prompt 1b (Modul 3: PVS/FHIR Integration + Modul 4: Therapieplan)
