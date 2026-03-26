import React from 'react';
import {
  LayoutDashboard, Activity, FileText, Globe,
  AlertTriangle, Heart, Box, GitBranch, Database,
  Lock, Eye, Server, Users, Clock, TrendingUp,
  CheckCircle, Shield, Zap, Wrench, Bug, Sparkles,
  Rocket, History, Layers
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────
export interface FlowNode {
  id: string;
  label: string;
  type: 'start' | 'decision' | 'process' | 'end' | 'module' | 'triage';
  children?: FlowNode[];
  condition?: string;
  color?: string;
}

export interface StatCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  description?: string;
}

export interface SecurityLayer {
  name: string;
  tech: string;
  detail: string;
  icon: React.ReactNode;
  color: string;
}

export interface DeployEntry {
  id: string;
  date: string;
  phase: string;
  version: string;
  type: 'feature' | 'bugfix' | 'security' | 'refactor' | 'deploy';
  changes: string[];
  deployId?: string;
  url?: string;
}

// ─── Data ──────────────────────────────────────────────
export const STATS: StatCard[] = [
  { label: 'Fragen gesamt', value: '270+', icon: React.createElement(FileText, { size: 20 }), color: 'from-blue-500 to-cyan-500', description: '21 Kapitel, 13 Body-Module' },
  { label: 'Service-Pfade', value: 10, icon: React.createElement(GitBranch, { size: 20 }), color: 'from-purple-500 to-pink-500', description: 'Anamnese bis Nachricht' },
  { label: 'Sprachen', value: 10, icon: React.createElement(Globe, { size: 20 }), color: 'from-green-500 to-emerald-500', description: 'DE · EN · TR · AR · UK · ES · FA · IT · FR · PL' },
  { label: 'Triage-Regeln', value: 10, icon: React.createElement(AlertTriangle, { size: 20 }), color: 'from-red-500 to-orange-500', description: '4 CRITICAL + 6 WARNING' },
  { label: 'Komponenten', value: 25, icon: React.createElement(Box, { size: 20 }), color: 'from-indigo-500 to-violet-500', description: 'React TypeScript' },
  { label: 'i18n-Schlüssel', value: '1.797', icon: React.createElement(Globe, { size: 20 }), color: 'from-teal-500 to-cyan-500', description: 'Pro Sprache' },
  { label: 'API-Endpunkte', value: 12, icon: React.createElement(Server, { size: 20 }), color: 'from-amber-500 to-yellow-500', description: 'REST + WebSocket' },
  { label: 'DB-Modelle', value: 10, icon: React.createElement(Database, { size: 20 }), color: 'from-rose-500 to-pink-500', description: 'Prisma/PostgreSQL' },
];

export const SERVICES = [
  { name: 'Termin / Anamnese', id: 'anamnese', duration: '5–8 Min', questions: '170+', icon: '🏥' },
  { name: 'Medikamente / Rezepte', id: 'prescription', duration: '2 Min', questions: '6', icon: '💊' },
  { name: 'AU (Krankschreibung)', id: 'au', duration: '3 Min', questions: '5', icon: '📋' },
  { name: 'Unfallmeldung (BG)', id: 'unfall', duration: '5 Min', questions: '12', icon: '🚑' },
  { name: 'Überweisung', id: 'referral', duration: '2 Min', questions: '4', icon: '🔄' },
  { name: 'Terminabsage', id: 'cancel', duration: '1 Min', questions: '3', icon: '❌' },
  { name: 'Dateien / Befunde', id: 'docs', duration: '2 Min', questions: '4', icon: '📁' },
  { name: 'Telefonanfrage', id: 'callback', duration: '2 Min', questions: '3', icon: '📞' },
  { name: 'Dokumente anfordern', id: 'request', duration: '2 Min', questions: '3', icon: '📄' },
  { name: 'Nachricht', id: 'message', duration: '3 Min', questions: '3', icon: '💬' },
];

export const BODY_MODULES = [
  { name: 'Angiologie', id: '1010', icon: '🫀', color: 'border-red-400/30' },
  { name: 'Atembeschwerden', id: '1020', icon: '🫁', color: 'border-sky-400/30' },
  { name: 'Magen-Darm', id: '1030', icon: '🧬', color: 'border-yellow-400/30' },
  { name: 'Haut', id: '1040', icon: '🧴', color: 'border-orange-400/30' },
  { name: 'Herz-Kreislauf', id: '1050', icon: '❤️', color: 'border-rose-400/30' },
  { name: 'Stoffwechsel', id: '1060', icon: '⚡', color: 'border-amber-400/30' },
  { name: 'Bewegungsapparat', id: '1070', icon: '🦴', color: 'border-lime-400/30' },
  { name: 'Neurologie', id: '1080', icon: '🧠', color: 'border-purple-400/30' },
  { name: 'Urologie', id: '1090', icon: '🔬', color: 'border-teal-400/30' },
  { name: 'Augen', id: '1A00', icon: '👁️', color: 'border-blue-400/30' },
  { name: 'HNO', id: '1B00', icon: '👂', color: 'border-indigo-400/30' },
  { name: 'Gemüt/Psyche', id: '1C00', icon: '🧘', color: 'border-violet-400/30' },
  { name: 'Gynäkologie', id: 'GYN', icon: '♀️', color: 'border-pink-400/30' },
];

export const TRIAGE_RULES = [
  { name: 'Akutes Koronarsyndrom', level: 'CRITICAL', trigger: 'Brustschmerzen + Atemnot/Lähmung', action: 'Vollbild-Overlay, 112-Notruf', color: 'bg-red-500/20 border-red-500/40' },
  { name: 'Suizidalität', level: 'CRITICAL', trigger: 'Depression + spez. Indikatoren', action: 'Sofort-Alert an Arzt', color: 'bg-red-500/20 border-red-500/40' },
  { name: 'SAH/Aneurysma', level: 'CRITICAL', trigger: 'Kopfschmerzen + Bewusstseinsstörung', action: '112-Notruf', color: 'bg-red-500/20 border-red-500/40' },
  { name: 'Syncope + Risiko', level: 'CRITICAL', trigger: 'Ohnmacht + Herzrhythmusstörung', action: 'Sofort-Alert', color: 'bg-red-500/20 border-red-500/40' },
  { name: 'GI-Blutung', level: 'WARNING', trigger: 'Blutverdünner + Bauchschmerzen', action: 'Arzt-Warnung', color: 'bg-amber-500/15 border-amber-500/40' },
  { name: 'Diab. Fußsyndrom', level: 'WARNING', trigger: 'Diabetes + Fußsyndrom', action: 'Arzt-Warnung', color: 'bg-amber-500/15 border-amber-500/40' },
  { name: 'Starker Raucher', level: 'WARNING', trigger: '>30 Pack-Years', action: 'Arzt-Hinweis', color: 'bg-amber-500/15 border-amber-500/40' },
  { name: 'Schwangerschaft + Meds', level: 'WARNING', trigger: 'Schwanger + Blutverdünner', action: 'Arzt-Warnung', color: 'bg-amber-500/15 border-amber-500/40' },
  { name: 'Polypharmazie', level: 'WARNING', trigger: '>5 Medikamente', action: 'Arzt-Hinweis', color: 'bg-amber-500/15 border-amber-500/40' },
  { name: 'Doppel-Blutverdünner', level: 'WARNING', trigger: '≥2 Antikoagulantien', action: 'Arzt-Warnung', color: 'bg-amber-500/15 border-amber-500/40' },
];

export const SECURITY_LAYERS: SecurityLayer[] = [
  { name: 'Transport', tech: 'TLS 1.3', detail: 'End-to-End-Verschlüsselung aller Daten im Transit', icon: React.createElement(Lock, { size: 18 }), color: 'border-green-500/50 bg-green-500/10' },
  { name: 'PII-Verschlüsselung', tech: 'AES-256-GCM', detail: 'Name, Adresse, E-Mail – 256-Bit symmetrisch verschlüsselt', icon: React.createElement(Shield, { size: 18 }), color: 'border-blue-500/50 bg-blue-500/10' },
  { name: 'Pseudonymisierung', tech: 'SHA-256', detail: 'E-Mail-Hash statt Klartext für Patientenzuordnung', icon: React.createElement(Eye, { size: 18 }), color: 'border-purple-500/50 bg-purple-500/10' },
  { name: 'Authentifizierung', tech: 'JWT + bcrypt', detail: 'HttpOnly Cookies, 24h Ablauf, bcrypt(10) Hashing', icon: React.createElement(Lock, { size: 18 }), color: 'border-amber-500/50 bg-amber-500/10' },
  { name: 'Autorisierung', tech: 'RBAC (4 Rollen)', detail: 'PATIENT · ARZT · MFA · ADMIN – Rollenbasierte Zugriffskontrolle', icon: React.createElement(Users, { size: 18 }), color: 'border-cyan-500/50 bg-cyan-500/10' },
  { name: 'API-Schutz', tech: 'Helmet + Rate Limit', detail: 'CSP, HSTS, X-Frame-Options + 100 req/15min pro IP', icon: React.createElement(Shield, { size: 18 }), color: 'border-red-500/50 bg-red-500/10' },
  { name: 'Audit Trail', tech: 'HIPAA-konform', detail: 'Jeder Zugriff wird mit Timestamp + User protokolliert', icon: React.createElement(FileText, { size: 18 }), color: 'border-indigo-500/50 bg-indigo-500/10' },
  { name: 'DSGVO', tech: '6 Maßnahmen', detail: 'Einwilligung, Datensparsamkeit, Löschrecht, Portabilität', icon: React.createElement(CheckCircle, { size: 18 }), color: 'border-emerald-500/50 bg-emerald-500/10' },
];

export const SERVICE_CHART_DATA = [
  { name: 'Anamnese', fragen: 170, dauer: 8 },
  { name: 'Rezepte', fragen: 6, dauer: 2 },
  { name: 'AU', fragen: 5, dauer: 3 },
  { name: 'Unfall BG', fragen: 12, dauer: 5 },
  { name: 'Überweisung', fragen: 4, dauer: 2 },
  { name: 'Absage', fragen: 3, dauer: 1 },
  { name: 'Befunde', fragen: 4, dauer: 2 },
  { name: 'Telefon', fragen: 3, dauer: 2 },
  { name: 'Dokumente', fragen: 3, dauer: 2 },
  { name: 'Nachricht', fragen: 3, dauer: 3 },
];

export const TRIAGE_PIE_DATA = [
  { name: 'CRITICAL', value: 4, color: '#E07A5F' },
  { name: 'WARNING', value: 6, color: '#F4A261' },
];

export const BODY_RADAR_DATA = [
  { module: 'Herz', coverage: 95 },
  { module: 'Lunge', coverage: 90 },
  { module: 'GI', coverage: 88 },
  { module: 'Neuro', coverage: 92 },
  { module: 'MSK', coverage: 85 },
  { module: 'Haut', coverage: 80 },
  { module: 'Uro', coverage: 82 },
  { module: 'Psyche', coverage: 78 },
  { module: 'HNO', coverage: 75 },
  { module: 'Augen', coverage: 70 },
  { module: 'Gyn', coverage: 88 },
  { module: 'Stoffw.', coverage: 83 },
  { module: 'Angio', coverage: 86 },
];

export const WEEKLY_SESSIONS_DATA = [
  { day: 'Mo', sessions: 42, triage: 3 },
  { day: 'Di', sessions: 38, triage: 2 },
  { day: 'Mi', sessions: 31, triage: 1 },
  { day: 'Do', sessions: 45, triage: 4 },
  { day: 'Fr', sessions: 50, triage: 5 },
  { day: 'Sa', sessions: 12, triage: 0 },
  { day: 'So', sessions: 0, triage: 0 },
];

export const PRODUCTIVITY_ROWS = [
  { task: 'Papier verteilen', paper: '2 Min', digital: '0 Min (QR-Scan)', saved: '2 Min' },
  { task: 'Patient füllt aus', paper: '15 Min', digital: '5 Min', saved: '10 Min' },
  { task: 'Abgabe & Warten', paper: '3 Min', digital: '0 Min (Auto)', saved: '3 Min' },
  { task: 'MFA tippt ab', paper: '8 Min', digital: '0 Min (Direkt)', saved: '8 Min' },
  { task: 'Arzt liest', paper: '5 Min', digital: '0.5 Min (KI)', saved: '4.5 Min' },
];

export const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  padding: '12px 16px',
  color: '#D9D9D9',
  fontSize: '13px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

export const DEPLOY_HISTORY: DeployEntry[] = [
  {
    id: 'deploy-16',
    date: '2026-03-02',
    phase: 'Phase 15',
    version: '15.0',
    type: 'feature',
    changes: [
      'i18n: 4 neue Sprachen: Farsi (RTL), Italienisch, Französisch, Polnisch – insg. 10 Sprachen mit 1.797 Schlüsseln',
      'Fehlende Übersetzungen: time.min, validation.required_field/please_fill in allen 10 Sprachen',
      'Hardcoded-Deutsch entfernt: SelectInput, DateInput, FileInput, BgAccidentForm, LandingPage, Questionnaire',
      'Pflichtfeld-Validierung jetzt mehrsprachig (validation.please_fill)',
      'Zeitangaben (Min.) jetzt via i18n in LandingPage + Questionnaire',
      'QuestionRenderer: toLocaleDateString nutzt jetzt Browser-Locale statt hardcoded de-DE',
    ],
  },
  {
    id: 'deploy-15',
    date: '2026-03-01',
    phase: 'Phase 14',
    version: '14.0',
    type: 'feature',
    changes: [
      'Changelog-Tab im AdminDashboard hinzugefügt',
      'i18n: UnfallBGFlow, ErrorBoundary, Navigation, FontSizeControl, KioskToggle, ChatBubble FAQ übersetzt',
      'Triage-Acknowledge UI für Ärzte implementiert',
      'Wartezimmer/Queue-System mit Echtzeit-Updates',
      'Chat: Typing-Indicator für Patienten, Read-Receipts',
      'Security: localStorage-Antworten verschlüsselt, Token-Refresh',
      'Server: Code-Quality (catch unknown, @ts-ignore entfernt)',
    ],
  },
  {
    id: 'deploy-14',
    date: '2026-02-28',
    phase: 'Phase 13',
    version: '13.0',
    type: 'refactor',
    changes: [
      'Security: Rate-Limiter auf alle Routen, API-Key-Header, OWASP-Audit',
      'UX: Auto-Scroll bei Frage-Wechsel, RedFlagOverlay mit 2-Schritt-Bestätigung',
      'i18n: ArztDashboard + MFADashboard + AdminDashboard Strings übersetzt',
      'Code Quality: `any` → typisierte Unions (AnswerValue, SessionAnswer)',
      'Performance: React.memo auf StatCards, Font-Preloading im HTML',
      '26 TypeScript-Fehler behoben (Typ-Narrowing, null-Safety)',
    ],
  },
];

export const DEPLOY_TYPE_CONFIG: Record<DeployEntry['type'], { label: string; color: string; icon: React.ReactNode }> = {
  feature: { label: 'Feature', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', icon: React.createElement(Sparkles, { size: 14 }) },
  bugfix: { label: 'Bugfix', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', icon: React.createElement(Bug, { size: 14 }) },
  security: { label: 'Security', color: 'bg-green-500/20 text-green-400 border-green-500/40', icon: React.createElement(Shield, { size: 14 }) },
  refactor: { label: 'Refactor', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40', icon: React.createElement(Wrench, { size: 14 }) },
  deploy: { label: 'Deploy', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40', icon: React.createElement(Rocket, { size: 14 }) },
};

export const TECH_STACK = [
  { category: 'Frontend', items: [
    { name: 'React', version: '19', color: 'text-cyan-400' },
    { name: 'TypeScript', version: '5.9', color: 'text-blue-400' },
    { name: 'Vite', version: '8', color: 'text-purple-400' },
    { name: 'Tailwind CSS', version: '4', color: 'text-teal-400' },
    { name: 'Zustand', version: '5', color: 'text-amber-400' },
    { name: 'React Query', version: '5', color: 'text-red-400' },
    { name: 'i18next', version: '25', color: 'text-green-400' },
    { name: 'Socket.io Client', version: '4', color: 'text-gray-400' },
  ]},
  { category: 'Backend', items: [
    { name: 'Express', version: '5', color: 'text-green-400' },
    { name: 'Prisma ORM', version: '6', color: 'text-indigo-400' },
    { name: 'PostgreSQL', version: '15+', color: 'text-blue-400' },
    { name: 'JWT', version: '9', color: 'text-amber-400' },
    { name: 'Socket.io', version: '4', color: 'text-gray-400' },
    { name: 'Helmet', version: '8', color: 'text-red-400' },
  ]},
  { category: 'Sicherheit', items: [
    { name: 'AES-256-GCM', version: '', color: 'text-green-400' },
    { name: 'SHA-256', version: '', color: 'text-cyan-400' },
    { name: 'bcrypt', version: '10 Rounds', color: 'text-purple-400' },
    { name: 'TLS 1.3', version: '', color: 'text-emerald-400' },
  ]},
  { category: 'Testing & Deploy', items: [
    { name: 'Playwright', version: '1.58', color: 'text-green-400' },
    { name: 'Netlify', version: '', color: 'text-teal-400' },
    { name: 'Tesseract.js', version: '7 (OCR)', color: 'text-orange-400' },
  ]},
];

export const FLOW_DATA = {}; // Placeholder, defined in FlowDiagram.tsx
