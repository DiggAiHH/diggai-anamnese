import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Shield, Activity, FileText, Zap, Globe, Database,
  Lock, Eye, Server, Cpu, Users, Clock, TrendingUp, BarChart3,
  CheckCircle, AlertTriangle, Heart, Brain, ArrowRight, ChevronDown,
  ChevronRight, Layers, GitBranch, Box, Workflow, PieChart, History,
  Rocket, Tag, Bug, Sparkles, Wrench, Lightbulb, BookOpen
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart as RechartsPie, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, Legend
} from 'recharts';

// Admin Tab Components
import { UserManagementTab } from '../components/admin/UserManagementTab';
import { PermissionMatrix } from '../components/admin/PermissionMatrix';
import { ROIDashboard } from '../components/admin/ROIDashboard';
import { FragebogenBuilder } from '../components/admin/FragebogenBuilder';
import { WunschboxTab } from '../components/admin/WunschboxTab';
import { WaitingContentTab } from '../components/admin/WaitingContentTab';
import { AuditLogTab } from '../components/admin/AuditLogTab';
import { PvsAdminPanel } from '../components/admin/PvsAdminPanel';

// ─── Types ─────────────────────────────────────────────
interface FlowNode {
  id: string;
  label: string;
  type: 'start' | 'decision' | 'process' | 'end' | 'module' | 'triage';
  children?: FlowNode[];
  condition?: string;
  color?: string;
}

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  description?: string;
}

interface SecurityLayer {
  name: string;
  tech: string;
  detail: string;
  icon: React.ReactNode;
  color: string;
}

// ─── Data ──────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Übersicht', icon: <LayoutDashboard size={18} /> },
  { id: 'users', label: 'Mitarbeiter', icon: <Users size={18} /> },
  { id: 'fragebogen', label: 'Fragebogen', icon: <Layers size={18} /> },
  { id: 'roi', label: 'ROI', icon: <TrendingUp size={18} /> },
  { id: 'wunschbox', label: 'Wunschbox', icon: <Lightbulb size={18} /> },
  { id: 'content', label: 'Wartezeit-Content', icon: <BookOpen size={18} /> },
  { id: 'permissions', label: 'Rechte', icon: <Lock size={18} /> },
  { id: 'audit', label: 'Audit-Log', icon: <FileText size={18} /> },
  { id: 'pvs', label: 'PVS-Integration', icon: <Server size={18} /> },
  { id: 'flow', label: 'Patienten-Flow', icon: <Workflow size={18} /> },
  { id: 'security', label: 'Sicherheit', icon: <Shield size={18} /> },
  { id: 'export', label: 'Export & Berichte', icon: <FileText size={18} /> },
  { id: 'productivity', label: 'Produktivität', icon: <TrendingUp size={18} /> },
  { id: 'architecture', label: 'Architektur', icon: <Layers size={18} /> },
  { id: 'changelog', label: 'Changelog', icon: <History size={18} /> },
] as const;

type TabId = typeof TABS[number]['id'];

const STATS: StatCard[] = [
  { label: 'Fragen gesamt', value: '270+', icon: <FileText size={20} />, color: 'from-blue-500 to-cyan-500', description: '21 Kapitel, 13 Body-Module' },
  { label: 'Service-Pfade', value: 10, icon: <GitBranch size={20} />, color: 'from-purple-500 to-pink-500', description: 'Anamnese bis Nachricht' },
  { label: 'Sprachen', value: 10, icon: <Globe size={20} />, color: 'from-green-500 to-emerald-500', description: 'DE · EN · TR · AR · UK · ES · FA · IT · FR · PL' },
  { label: 'Triage-Regeln', value: 10, icon: <AlertTriangle size={20} />, color: 'from-red-500 to-orange-500', description: '4 CRITICAL + 6 WARNING' },
  { label: 'Komponenten', value: 25, icon: <Box size={20} />, color: 'from-indigo-500 to-violet-500', description: 'React TypeScript' },
  { label: 'i18n-Schlüssel', value: '1.797', icon: <Globe size={20} />, color: 'from-teal-500 to-cyan-500', description: 'Pro Sprache' },
  { label: 'API-Endpunkte', value: 12, icon: <Server size={20} />, color: 'from-amber-500 to-yellow-500', description: 'REST + WebSocket' },
  { label: 'DB-Modelle', value: 10, icon: <Database size={20} />, color: 'from-rose-500 to-pink-500', description: 'Prisma/PostgreSQL' },
];

const SECURITY_LAYERS: SecurityLayer[] = [
  { name: 'Transport', tech: 'TLS 1.3', detail: 'End-to-End-Verschlüsselung aller Daten im Transit', icon: <Lock size={18} />, color: 'border-green-500/50 bg-green-500/10' },
  { name: 'PII-Verschlüsselung', tech: 'AES-256-GCM', detail: 'Name, Adresse, E-Mail – 256-Bit symmetrisch verschlüsselt', icon: <Shield size={18} />, color: 'border-blue-500/50 bg-blue-500/10' },
  { name: 'Pseudonymisierung', tech: 'SHA-256', detail: 'E-Mail-Hash statt Klartext für Patientenzuordnung', icon: <Eye size={18} />, color: 'border-purple-500/50 bg-purple-500/10' },
  { name: 'Authentifizierung', tech: 'JWT + bcrypt', detail: 'HttpOnly Cookies, 24h Ablauf, bcrypt(10) Hashing', icon: <Lock size={18} />, color: 'border-amber-500/50 bg-amber-500/10' },
  { name: 'Autorisierung', tech: 'RBAC (4 Rollen)', detail: 'PATIENT · ARZT · MFA · ADMIN – Rollenbasierte Zugriffskontrolle', icon: <Users size={18} />, color: 'border-cyan-500/50 bg-cyan-500/10' },
  { name: 'API-Schutz', tech: 'Helmet + Rate Limit', detail: 'CSP, HSTS, X-Frame-Options + 100 req/15min pro IP', icon: <Shield size={18} />, color: 'border-red-500/50 bg-red-500/10' },
  { name: 'Audit Trail', tech: 'HIPAA-konform', detail: 'Jeder Zugriff wird mit Timestamp + User protokolliert', icon: <FileText size={18} />, color: 'border-indigo-500/50 bg-indigo-500/10' },
  { name: 'DSGVO', tech: '6 Maßnahmen', detail: 'Einwilligung, Datensparsamkeit, Löschrecht, Portabilität', icon: <CheckCircle size={18} />, color: 'border-emerald-500/50 bg-emerald-500/10' },
];

const SERVICES = [
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

const BODY_MODULES = [
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

const TRIAGE_RULES = [
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

// ─── Deploy History ────────────────────────────────────
interface DeployEntry {
  id: string;
  date: string;
  phase: string;
  version: string;
  type: 'feature' | 'bugfix' | 'security' | 'refactor' | 'deploy';
  changes: string[];
  deployId?: string;
  url?: string;
}

const DEPLOY_HISTORY: DeployEntry[] = [
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
    deployId: '69a4a284',
    url: 'https://diggai-drklaproth.netlify.app',
    changes: [
      'Security: Rate-Limiter auf alle Routen, API-Key-Header, OWASP-Audit',
      'UX: Auto-Scroll bei Frage-Wechsel, RedFlagOverlay mit 2-Schritt-Bestätigung',
      'i18n: ArztDashboard + MFADashboard + AdminDashboard Strings übersetzt',
      'Code Quality: `any` → typisierte Unions (AnswerValue, SessionAnswer)',
      'Performance: React.memo auf StatCards, Font-Preloading im HTML',
      '26 TypeScript-Fehler behoben (Typ-Narrowing, null-Safety)',
    ],
  },
  {
    id: 'deploy-13',
    date: '2026-02-27',
    phase: 'Phase 12',
    version: '12.0',
    type: 'feature',
    deployId: '69a4745b',
    url: 'https://diggai-drklaproth.netlify.app',
    changes: [
      'AdminDashboard: Vollständige Systemdokumentation mit 6 Tabs',
      'Interaktive Charts (Recharts): Service-/Session-/Triage-/Radar-Diagramme',
      'Patienten-Flow-Diagramm: Expandierbarer Baum mit 270+ Fragen',
      'Sicherheitsarchitektur: 8-Schichten-Visualisierung',
      'Produktivitäts-ROI-Rechner + Zeitvergleichstabelle',
      'Architektur-Tab: Tech-Stack, DB-Modelle, API-Endpunkte',
    ],
  },
  {
    id: 'deploy-12',
    date: '2026-02-26',
    phase: 'Phase 11',
    version: '11.0',
    type: 'feature',
    changes: [
      'MFA-Dashboard: QR-Code + Zugangscode-Vergabe für Patienten',
      'Session-Locking: Arzt sperrt aktive Sitzung (Socket.io)',
      'Dateien/Befunde-Upload: Drag & Drop + Kamera (Tesseract OCR)',
      'eGK-Scanner: Kamerazugriff für Versichertenkarte',
    ],
  },
  {
    id: 'deploy-11',
    date: '2026-02-25',
    phase: 'Phase 10',
    version: '10.0',
    type: 'feature',
    changes: [
      'Echtzeit-Chat (Socket.io): Patient ↔ Arzt/MFA Kommunikation',
      'Triage-Engine: 10 Regeln (4 CRITICAL, 6 WARNING)',
      'RedFlagOverlay: 112-Notruf bei akutem Koronarsyndrom',
      'ChatBubble: FAQ-Bot + Team-Chat Tab',
    ],
  },
  {
    id: 'deploy-10',
    date: '2026-02-24',
    phase: 'Phase 9',
    version: '9.0',
    type: 'security',
    changes: [
      'AES-256-GCM Verschlüsselung für alle PII-Felder',
      'SHA-256 Pseudonymisierung für E-Mail-Zuordnung',
      'HIPAA-konformer Audit Trail (alle Zugriffe protokolliert)',
      'JWT HttpOnly Cookies mit 24h Ablauf',
      'DSGVO-Einwilligungsflow vor Datenverarbeitung',
    ],
  },
  {
    id: 'deploy-9',
    date: '2026-02-23',
    phase: 'Phase 8',
    version: '8.0',
    type: 'feature',
    changes: [
      'ArztDashboard: KI-Zusammenfassung mit ICD-10 Codes',
      'PDF/CSV/JSON Export mit digitaler Signatur',
      'Medikamenten-Manager: strukturierte Eingabe',
      'Chirurgie-Manager: OP-Historie',
    ],
  },
  {
    id: 'deploy-8',
    date: '2026-02-22',
    phase: 'Phase 7',
    version: '7.0',
    type: 'feature',
    changes: [
      'i18n: 10 Sprachen (DE, EN, TR, AR, UK, ES, FA, IT, FR, PL) mit 1.797 Schlüsseln',
      'RTL-Support für Arabisch',
      'Sprachauswahl-Komponente mit Flaggen',
      'Language Detection anhand Browser-Einstellung',
    ],
  },
  {
    id: 'deploy-7',
    date: '2026-02-21',
    phase: 'Phase 6',
    version: '6.0',
    type: 'feature',
    changes: [
      '13 Körperregion-Module (Herz, Lunge, GI, Neuro, etc.)',
      'Conditional Routing: showIf/context/equals Operatoren',
      'Schwangerschafts-Check (Alter 14-50, Geschlecht W)',
      'Gynäkologie-Modul, Mammographie, Darmkrebs-Screening',
    ],
  },
  {
    id: 'deploy-6',
    date: '2026-02-20',
    phase: 'Phase 5',
    version: '5.0',
    type: 'feature',
    changes: [
      'QuestionFlowEngine: Drei-Stufen-Routing (Follow-Up → Conditional → Static)',
      '270+ medizinische Fragen in 21 Kapiteln',
      '10 Service-Pfade (Anamnese, Rezepte, AU, BG, etc.)',
      'Dynamische Fragebogen-Logik mit Validierung',
    ],
  },
];

const DEPLOY_TYPE_CONFIG: Record<DeployEntry['type'], { label: string; color: string; icon: React.ReactNode }> = {
  feature: { label: 'Feature', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', icon: <Sparkles size={14} /> },
  bugfix: { label: 'Bugfix', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', icon: <Bug size={14} /> },
  security: { label: 'Security', color: 'bg-green-500/20 text-green-400 border-green-500/40', icon: <Shield size={14} /> },
  refactor: { label: 'Refactor', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40', icon: <Wrench size={14} /> },
  deploy: { label: 'Deploy', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40', icon: <Rocket size={14} /> },
};

const TECH_STACK = [
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

const PRODUCTIVITY_ROWS = [
  { task: 'Papier verteilen', paper: '2 Min', digital: '0 Min (QR-Scan)', saved: '2 Min' },
  { task: 'Patient füllt aus', paper: '15 Min', digital: '5 Min', saved: '10 Min' },
  { task: 'Abgabe & Warten', paper: '3 Min', digital: '0 Min (Auto)', saved: '3 Min' },
  { task: 'MFA tippt ab', paper: '8 Min', digital: '0 Min (Direkt)', saved: '8 Min' },
  { task: 'Arzt liest', paper: '5 Min', digital: '0.5 Min (KI)', saved: '4.5 Min' },
];

// ─── Chart Data ────────────────────────────────────────
const SERVICE_CHART_DATA = [
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

const TRIAGE_PIE_DATA = [
  { name: 'CRITICAL', value: 4, color: '#ef4444' },
  { name: 'WARNING', value: 6, color: '#f59e0b' },
];

const BODY_RADAR_DATA = [
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

const WEEKLY_SESSIONS_DATA = [
  { day: 'Mo', sessions: 42, triage: 3 },
  { day: 'Di', sessions: 38, triage: 2 },
  { day: 'Mi', sessions: 31, triage: 1 },
  { day: 'Do', sessions: 45, triage: 4 },
  { day: 'Fr', sessions: 50, triage: 5 },
  { day: 'Sa', sessions: 12, triage: 0 },
  { day: 'So', sessions: 0, triage: 0 },
];

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  padding: '12px 16px',
  color: '#e2e8f0',
  fontSize: '13px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

// ─── Sub-Components ────────────────────────────────────

function GlassCard({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] backdrop-blur-xl p-5 transition-all duration-300 hover:border-[var(--border-hover)] ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''} ${className}`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      role={onClick ? 'button' : 'presentation'}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

const StatCardComponent = React.memo(function StatCardComponent({ stat }: { stat: StatCard }) {
  return (
    <GlassCard className="relative overflow-hidden group">
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)] mb-1">{stat.label}</p>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{stat.value}</p>
          {stat.description && <p className="text-xs text-[var(--text-muted)] mt-1">{stat.description}</p>}
        </div>
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} text-white`}>
          {stat.icon}
        </div>
      </div>
    </GlassCard>
  );
});

function FlowDiagram() {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root', 'beschwerden']));

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const flowData: FlowNode[] = [
    {
      id: 'landing', label: '🏥 Landing Page', type: 'start',
      children: [
        { id: 'dsgvo', label: '🔒 DSGVO-Einwilligung', type: 'decision', condition: 'Akzeptiert → weiter / Ablehnung → STOPP' },
      ]
    },
    {
      id: 'identifikation', label: '👤 Identifikation', type: 'process',
      children: [
        { id: '0000', label: '0000: Bekannt? (Ja/Nein)', type: 'decision' },
        { id: '0001', label: '0001: Nachname', type: 'process' },
        { id: '0011', label: '0011: Vorname', type: 'process' },
        { id: '0002', label: '0002: Geschlecht (M/W/D)', type: 'process' },
        { id: '0003', label: '0003: Geburtsdatum', type: 'process' },
      ]
    },
    {
      id: 'routing', label: '🔀 Patient-Routing', type: 'decision',
      children: [
        {
          id: 'neu', label: '🆕 Neu-Patient', type: 'module', condition: '0000 = Nein',
          children: [
            { id: 'enrollment', label: 'Versicherung, Adresse, Kontakt (2000–3005)', type: 'process' },
          ]
        },
        {
          id: 'alt', label: '🔄 Bestands-Patient', type: 'module', condition: '0000 = Ja',
          children: [
            { id: 'term100', label: 'TERM-100: Wunschtag', type: 'process' },
            { id: 'term101', label: 'TERM-101: Wunschzeit', type: 'process' },
            { id: 'alt100', label: 'ALT-100: Medikamente geändert?', type: 'decision' },
          ]
        },
      ]
    },
    {
      id: 'besuchsgrund', label: '🎯 VISIT-100: Besuchsgrund', type: 'decision',
      children: [
        { id: 'beschwerdeabklaerung', label: 'Beschwerdeabklärung → 1000', type: 'module', color: 'border-blue-500/40' },
        { id: 'kontrolle', label: 'Kontrolle → 5B-100', type: 'module', color: 'border-green-500/40' },
        { id: 'vorsorge', label: 'Vorsorge → 5C-100', type: 'module', color: 'border-teal-500/40' },
        { id: 'therapie', label: 'Therapieanpassung → 5D-100', type: 'module', color: 'border-amber-500/40' },
        { id: 'befund', label: 'Befunderörterung → 5E-100', type: 'module', color: 'border-purple-500/40' },
        { id: 'tumor', label: 'Tumorverdacht → 5F-100', type: 'module', color: 'border-red-500/40' },
        { id: 'gutachten', label: 'Begutachtung → 5G-100', type: 'module', color: 'border-indigo-500/40' },
        { id: 'unfall', label: 'Unfallfolgen → 5H-100', type: 'module', color: 'border-orange-500/40' },
        { id: 'zweitmeinung', label: 'Zweitmeinung → 5I-100', type: 'module', color: 'border-cyan-500/40' },
      ]
    },
    {
      id: 'beschwerden', label: '🩺 Beschwerden-Chain', type: 'module',
      children: [
        { id: '1000', label: '1000: Beschwerden vorhanden?', type: 'decision', condition: 'Nein + Alt → 9500 (Bewertung)' },
        { id: '1001', label: '1001: Seit wann? (Dauer)', type: 'process' },
        { id: '1004', label: '1004: Wie häufig?', type: 'process' },
        { id: '1005', label: '1005: Auslöser? (Multiselect)', type: 'process' },
        { id: '1006', label: '1006: Verlauf?', type: 'process' },
        { id: '1007', label: '1007: Begleitsymptome', type: 'process' },
        {
          id: '1002', label: '1002: Körperregion → 13 Module', type: 'decision',
          children: BODY_MODULES.map(m => ({
            id: m.id, label: `${m.icon} ${m.name} (${m.id})`, type: 'module' as const,
          }))
        },
      ]
    },
    {
      id: 'history', label: '📋 Medizinische Vorgeschichte', type: 'module',
      children: [
        { id: 'allgemein', label: 'Allgemein: Größe, Gewicht, Diabetes (4000–6007)', type: 'process' },
        { id: 'gewohnheiten', label: 'Gewohnheiten: Rauchen, Sport, Alkohol (4002–4131)', type: 'process' },
        { id: 'vorerkrankungen', label: 'Vorerkrankungen (7000–7011)', type: 'process' },
        { id: 'eingriffe', label: 'Erkrankungen/Eingriffe (8000–8012)', type: 'process' },
      ]
    },
    {
      id: 'conditional', label: '⚙️ Bedingte Blöcke (showIf)', type: 'module',
      children: [
        { id: 'kinder', label: '👶 Kinder (<6 J.): 1500–1604', type: 'module', condition: 'Alter < 6' },
        { id: 'screening', label: '🔍 Screening (>35 J.): 1700–1901', type: 'module', condition: 'Alter > 35' },
        { id: 'schwangerschaft', label: '🤰 Schwangerschaft: 8800–8851', type: 'module', condition: 'W, 14–50 J.' },
        { id: 'gyn', label: '♀️ Gynäkologie: GYN-100–115', type: 'module', condition: 'Geschlecht = W' },
        { id: 'mammo', label: '🩺 Mammografie: MAMMO-100', type: 'module', condition: 'W, >50 J.' },
        { id: 'darm', label: '🔬 Darmkrebs: DARM-W-100', type: 'module', condition: '>50 J.' },
      ]
    },
    {
      id: 'abschluss', label: '✅ Abschluss', type: 'end',
      children: [
        { id: 'medikamente', label: 'MED-100: Medikamente (strukturiert)', type: 'process' },
        { id: 'bewertung', label: '9500–9501: Bewertung (1–5 ⭐)', type: 'process' },
        { id: 'kontakt', label: '9010–9011: Kontaktpräferenz', type: 'process' },
        { id: 'zusammenfassung', label: '📄 Zusammenfassung + PDF-Export', type: 'end' },
      ]
    },
  ];

  const renderNode = (node: FlowNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    const typeStyles: Record<string, string> = {
      start: 'border-green-500/40 bg-green-500/10',
      decision: 'border-amber-500/40 bg-amber-500/10',
      process: 'border-blue-500/40 bg-blue-500/10',
      end: 'border-emerald-500/40 bg-emerald-500/10',
      module: node.color || 'border-purple-500/40 bg-purple-500/10',
      triage: 'border-red-500/40 bg-red-500/10',
    };

    const depthClass = depth === 0 ? '' : depth === 1 ? 'ml-5' : depth === 2 ? 'ml-10' : 'ml-15';

    return (
      <div key={node.id} className={`relative ${depthClass}`}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${typeStyles[node.type]} mb-1.5 transition-all duration-200 hover:scale-[1.01] ${hasChildren ? 'cursor-pointer' : ''}`}
          onClick={hasChildren ? () => toggleNode(node.id) : undefined}
          {...(hasChildren ? { role: 'button' as const, tabIndex: 0, 'aria-expanded': isExpanded } : {})}
          aria-label={node.label}
        >
          {hasChildren && (
            <span className="text-[var(--text-secondary)] transition-transform duration-200">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          {!hasChildren && <ArrowRight size={12} className="text-[var(--text-muted)]" />}
          <span className="text-sm text-[var(--text-primary)] font-medium">{node.label}</span>
          {node.condition && (
            <span className="text-xs text-[var(--text-muted)] ml-auto bg-[var(--bg-input)] px-2 py-0.5 rounded">{node.condition}</span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-3 pl-3 border-l border-[var(--border-primary)]">
            {node.children!.map(child => renderNode(child, 0))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {flowData.map(node => renderNode(node, 0))}
    </div>
  );
}

function AdminProgressBar({ value, max, label, color = 'bg-blue-500' }: { value: number; max: number; label: string; color?: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="text-[var(--text-primary)] font-medium">{pct}%</span>
      </div>
      <div className="h-2 bg-[var(--bg-input)] rounded-full overflow-hidden">
        {/* Dynamic width requires inline style - no Tailwind equivalent for computed percentages */}
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />{/* eslint-disable-line */}
      </div>
    </div>
  );
}

// ─── Tab Contents ──────────────────────────────────────

function OverviewTab() {
  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(stat => <StatCardComponent key={stat.label} stat={stat} />)}
      </div>

      {/* ── Interactive Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Questions per Service */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-400" /> Fragen pro Service-Pfad
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SERVICE_CHART_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Bar dataKey="fragen" name="Fragen" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="dauer" name="Dauer (Min)" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Area Chart: Weekly Sessions */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-400" /> Wöchentliche Sessions (Demo)
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={WEEKLY_SESSIONS_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="sessionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="triageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                <Area type="monotone" dataKey="sessions" name="Sessions" stroke="#3b82f6" fill="url(#sessionGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="triage" name="Triage-Alerts" stroke="#ef4444" fill="url(#triageGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Pie Chart: Triage Distribution */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <PieChart size={20} className="text-amber-400" /> Triage-Verteilung
          </h3>
          <div className="h-[240px] flex items-center justify-center gap-8">
            <div className="w-[200px] h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={TRIAGE_PIE_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4} label={({ name, value }) => `${name}: ${value}`}>
                    {TRIAGE_PIE_DATA.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {TRIAGE_PIE_DATA.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-sm text-[var(--text-secondary)]">{d.name}: <span className="font-semibold text-[var(--text-primary)]">{d.value} Regeln</span></span>
                </div>
              ))}
              <div className="pt-2 border-t border-[var(--border-primary)]">
                <span className="text-xs text-[var(--text-muted)]">Gesamt: 10 Regeln aktiv</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Radar Chart: Body Module Coverage */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Heart size={20} className="text-red-400" /> Body-Modul Abdeckung (%)
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={BODY_RADAR_DATA} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="module" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 9 }} domain={[0, 100]} />
                <Radar name="Coverage" dataKey="coverage" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Services Grid */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Activity size={20} className="text-blue-400" /> 10 Service-Pfade
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {SERVICES.map(s => (
            <GlassCard key={s.id} className="text-center">
              <div className="text-2xl mb-2">{s.icon}</div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{s.name}</p>
              <div className="flex justify-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                <span>⏱ {s.duration}</span>
                <span>📝 {s.questions}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Body Modules */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Heart size={20} className="text-red-400" /> 13 Körperregion-Module
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
          {BODY_MODULES.map(m => (
            <div key={m.id} className={`rounded-xl border ${m.color} bg-[var(--bg-card)] p-3 text-center hover:scale-105 transition-transform`}>
              <div className="text-xl mb-1">{m.icon}</div>
              <p className="text-xs font-medium text-[var(--text-primary)]">{m.name}</p>
              <p className="text-[10px] text-[var(--text-muted)]">ID: {m.id}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Triage Rules */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-400" /> Triage-Regeln (Echtzeit)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {TRIAGE_RULES.map(r => (
            <div key={r.name} className={`rounded-xl border ${r.color} p-3 flex items-start gap-3`}>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${r.level === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-amber-500 text-black'}`}>
                {r.level}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">{r.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">{r.trigger}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">→ {r.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FlowTab() {
  return (
    <div className="space-y-6">
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
          <Workflow size={20} className="text-blue-400" /> Interaktiver Patienten-Flow
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Klicken Sie auf einen Knoten, um den Unterbaum auf-/zuzuklappen. Der Flow zeigt den vollständigen Anamnese-Pfad von der Landing Page bis zum PDF-Export.
        </p>
        <FlowDiagram />
      </GlassCard>

      {/* Routing Engine */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <GitBranch size={20} className="text-purple-400" /> Drei-Stufen-Routing-Engine
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Stufe 1: Follow-Up', desc: 'Option hat spezifische Sub-Fragen? → Folge diesem Pfad', color: 'border-green-500/40 bg-green-500/5', icon: '1️⃣' },
            { title: 'Stufe 2: Conditional', desc: 'Prüfe when/context/equals-Bedingungen → then-Pfad', color: 'border-amber-500/40 bg-amber-500/5', icon: '2️⃣' },
            { title: 'Stufe 3: Static Next', desc: 'Fester nächster Schritt via logic.next Array', color: 'border-blue-500/40 bg-blue-500/5', icon: '3️⃣' },
          ].map(s => (
            <div key={s.title} className={`rounded-xl border ${s.color} p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{s.icon}</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{s.title}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">{s.desc}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Operators */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Cpu size={20} className="text-cyan-400" /> Unterstützte Operatoren
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan', 'contextEquals', 'contextGreaterThan', 'contextLessThan'].map(op => (
            <div key={op} className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-input)] px-3 py-2 text-center">
              <code className="text-xs text-cyan-400 font-mono">{op}</code>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-6">
      {/* Security Layers */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Shield size={20} className="text-green-400" /> 8-Schichten Sicherheitsarchitektur
        </h3>
        <div className="space-y-3">
          {SECURITY_LAYERS.map((layer, i) => (
            <div key={layer.name} className={`rounded-xl border ${layer.color} p-4 flex items-start gap-4`}>
              <div className="flex items-center gap-3 min-w-[200px]">
                <span className="w-7 h-7 rounded-full bg-[var(--bg-input)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">{i + 1}</span>
                {layer.icon}
                <span className="text-sm font-semibold text-[var(--text-primary)]">{layer.name}</span>
              </div>
              <div className="flex-1">
                <span className="text-xs font-mono text-cyan-400 bg-[var(--bg-input)] px-2 py-0.5 rounded">{layer.tech}</span>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{layer.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Encryption Visual */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Lock size={20} className="text-blue-400" /> Verschlüsselungs-Pipeline
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { input: 'PII-Daten', desc: 'Name, Adresse, E-Mail', method: 'AES-256-GCM', icon: '🔐', detail: 'IV: 12B · Tag: 16B · Key: 32B' },
            { input: 'E-Mail (Zuordnung)', desc: 'Patientenmapping', method: 'SHA-256 Hash', icon: '🔗', detail: 'Einweg-Pseudonymisierung' },
            { input: 'Passwörter', desc: 'Arzt-Login', method: 'bcrypt (10)', icon: '🔑', detail: 'Salted + 10 Rounds' },
          ].map(e => (
            <div key={e.method} className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-input)] p-4 text-center space-y-3">
              <p className="text-3xl">{e.icon}</p>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{e.input}</p>
                <p className="text-xs text-[var(--text-muted)]">{e.desc}</p>
              </div>
              <div className="w-full h-px bg-[var(--border-primary)]" />
              <div>
                <p className="text-sm font-mono text-cyan-400">{e.method}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{e.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* DSGVO Checklist */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <CheckCircle size={20} className="text-emerald-400" /> DSGVO-Konformität
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            '✅ Einwilligungserklärung vor Datenverarbeitung',
            '✅ Datensparsamkeit – nur medizinisch notwendige Daten',
            '✅ Pseudonymisierung via SHA-256',
            '✅ Verschlüsselung (AES-256-GCM) für alle PII',
            '✅ Löschrecht – Session-Ablauf nach 24h',
            '✅ Datenportabilität – Export als PDF/CSV/JSON',
            '✅ Audit Trail – vollständige Zugriffsprotokolle',
            '✅ Widerruf jederzeit möglich',
            '✅ Transport-Verschlüsselung (TLS 1.3)',
          ].map(item => (
            <div key={item} className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
              <p className="text-sm text-[var(--text-primary)]">{item}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function ExportTab() {
  return (
    <div className="space-y-6">
      {/* Export Formats */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <FileText size={20} className="text-blue-400" /> Export-Formate
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { format: 'PDF', icon: '📄', endpoint: 'GET /api/export/pdf/:id', features: ['A4-optimiertes Layout', 'Digitale Signatur (Canvas)', 'Praxis-Header', 'Abschnittsgliederung', 'Druckoptimiert'] },
            { format: 'CSV', icon: '📊', endpoint: 'GET /api/export/csv/:id', features: ['Tabellarische Struktur', 'Excel-kompatibel', 'Massenexport möglich', 'UTF-8 Encoding'] },
            { format: 'JSON', icon: '🔧', endpoint: 'GET /api/export/json/:id', features: ['Maschinenlesbar', 'API-Integration', 'Vollständige Metadaten', 'Strukturiertes Schema'] },
          ].map(e => (
            <GlassCard key={e.format}>
              <div className="text-center mb-4">
                <p className="text-4xl mb-2">{e.icon}</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">{e.format}</p>
                <code className="text-xs text-cyan-400 font-mono">{e.endpoint}</code>
              </div>
              <ul className="space-y-2">
                {e.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <CheckCircle size={14} className="text-green-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Report Structure */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <PieChart size={20} className="text-purple-400" /> Berichts-Gliederung
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { group: '👤 Personalien & Kontakt', ids: '0000–9011', items: ['Name, Vorname', 'Geschlecht, Geburtsdatum', 'Adresse, Kontakt', 'Versicherung'] },
            { group: '🏥 Aktuelles Anliegen', ids: '1000–AU-103', items: ['Beschwerden & Dauer', 'Körperregion-Details', 'Triage-Ergebnisse', 'BG-Unfall/AU-Daten'] },
            { group: '📋 Med. Vorgeschichte', ids: '4000–8900', items: ['Vorerkrankungen', 'Operationen', 'Medikamente', 'Allergien, Gewohnheiten'] },
          ].map(g => (
            <div key={g.group} className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-input)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{g.group}</p>
              <p className="text-xs text-[var(--text-muted)] mb-3">IDs: {g.ids}</p>
              <ul className="space-y-1.5">
                {g.items.map(i => (
                  <li key={i} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <ArrowRight size={10} className="text-[var(--text-muted)]" /> {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Signature Feature */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          ✍️ Digitale Signatur
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Der PDF-Export beinhaltet ein interaktives Canvas-Zeichenfeld für digitale Unterschriften.
          Unterstützt Touch-Geräte (Tablet/Smartphone) und Maus-Eingabe. Die Signatur wird als
          Rastergrafik in den Bericht eingebettet.
        </p>
      </GlassCard>
    </div>
  );
}

function ProductivityTab() {
  const totalPaper = PRODUCTIVITY_ROWS.reduce((a, r) => a + parseInt(r.paper), 0);
  const totalDigital = PRODUCTIVITY_ROWS.reduce((a, r) => a + parseFloat(r.digital), 0);
  const totalSaved = totalPaper - totalDigital;

  return (
    <div className="space-y-6">
      {/* Time Comparison */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Clock size={20} className="text-blue-400" /> Zeitersparnis pro Patientenkontakt
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-primary)]">
                <th className="text-left py-3 px-4 text-[var(--text-secondary)] font-medium">Arbeitsschritt</th>
                <th className="text-center py-3 px-4 text-red-400 font-medium">📄 Papier</th>
                <th className="text-center py-3 px-4 text-green-400 font-medium">💻 DiggAI</th>
                <th className="text-center py-3 px-4 text-blue-400 font-medium">⚡ Ersparnis</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTIVITY_ROWS.map(r => (
                <tr key={r.task} className="border-b border-[var(--border-primary)]/50">
                  <td className="py-3 px-4 text-[var(--text-primary)]">{r.task}</td>
                  <td className="py-3 px-4 text-center text-red-400">{r.paper}</td>
                  <td className="py-3 px-4 text-center text-green-400">{r.digital}</td>
                  <td className="py-3 px-4 text-center text-blue-400 font-semibold">{r.saved}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--accent)]">
                <td className="py-3 px-4 font-bold text-[var(--text-primary)]">GESAMT</td>
                <td className="py-3 px-4 text-center font-bold text-red-400">{totalPaper} Min</td>
                <td className="py-3 px-4 text-center font-bold text-green-400">{totalDigital} Min</td>
                <td className="py-3 px-4 text-center font-bold text-blue-400">-{Math.round((totalSaved / totalPaper) * 100)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </GlassCard>

      {/* ROI Calculator */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-green-400" /> ROI – Monatliche Hochrechnung
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Patienten/Tag', value: '40', unit: '', color: 'text-blue-400' },
            { label: 'Ersparnis/Tag', value: '18.3', unit: 'Std.', color: 'text-green-400' },
            { label: 'MFA-Äquivalent', value: '2.5', unit: 'Vollzeit', color: 'text-purple-400' },
            { label: 'Ersparnis/Monat', value: '~8.750', unit: '€', color: 'text-amber-400' },
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-input)] p-4 text-center">
              <p className="text-sm text-[var(--text-secondary)]">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color} mt-1`}>{k.value}</p>
              <p className="text-xs text-[var(--text-muted)]">{k.unit}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Quality Improvements */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-indigo-400" /> Qualitätsverbesserungen
        </h3>
        <div className="space-y-3">
          {[
            { label: 'Vollständigkeit (Pflichtfelder)', value: 100, max: 100, color: 'bg-green-500' },
            { label: 'Lesbarkeit (digital vs. Handschrift)', value: 100, max: 100, color: 'bg-blue-500' },
            { label: 'Triage-Geschwindigkeit', value: 98, max: 100, color: 'bg-red-500' },
            { label: 'Sprachbarrieren beseitigt', value: 5, max: 5, color: 'bg-purple-500' },
            { label: 'Datensicherheit (E2E)', value: 100, max: 100, color: 'bg-emerald-500' },
            { label: 'Papierverbrauch eliminiert', value: 100, max: 100, color: 'bg-teal-500' },
          ].map(p => <AdminProgressBar key={p.label} {...p} />)}
        </div>
      </div>

      {/* Feature Highlights */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Zap size={20} className="text-yellow-400" /> Produktivitäts-Features
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { feature: 'Intelligentes Routing', effect: '-40% Fragen', icon: '🧠' },
            { feature: 'showIf-System', effect: 'Nur relevante Fragen', icon: '⚡' },
            { feature: 'Multiselect-Queue', effect: 'Keine vergessenen Symptome', icon: '📋' },
            { feature: 'OCR-Scanner', effect: '-90% manuelle Eingabe', icon: '📸' },
            { feature: 'Echtzeit-Chat', effect: 'Keine Rückfragen', icon: '💬' },
            { feature: 'Auto-Triage', effect: 'Notfälle in <2s erkannt', icon: '🚨' },
            { feature: 'Dark/Light Mode', effect: 'Bessere Akzeptanz', icon: '🌓' },
            { feature: 'Demo-Modus', effect: 'Offline testen', icon: '🧪' },
          ].map(f => (
            <div key={f.feature} className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-input)] p-3 text-center">
              <p className="text-xl mb-1">{f.icon}</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">{f.feature}</p>
              <p className="text-xs text-green-400 mt-1">{f.effect}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function ChangelogTab() {
  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="text-center">
          <p className="text-3xl font-bold text-blue-400">{DEPLOY_HISTORY.length}</p>
          <p className="text-sm text-[var(--text-secondary)]">Deployments</p>
        </GlassCard>
        <GlassCard className="text-center">
          <p className="text-3xl font-bold text-green-400">{DEPLOY_HISTORY.reduce((a, d) => a + d.changes.length, 0)}</p>
          <p className="text-sm text-[var(--text-secondary)]">Änderungen gesamt</p>
        </GlassCard>
        <GlassCard className="text-center">
          <p className="text-3xl font-bold text-purple-400">{DEPLOY_HISTORY[0]?.version || '—'}</p>
          <p className="text-sm text-[var(--text-secondary)]">Aktuelle Version</p>
        </GlassCard>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[var(--border-primary)]" />
        <div className="space-y-6">
          {DEPLOY_HISTORY.map((entry, idx) => {
            const typeConfig = DEPLOY_TYPE_CONFIG[entry.type];
            return (
              <div key={entry.id} className="relative pl-12">
                {/* Timeline dot */}
                <div className={`absolute left-0 top-1 w-10 h-10 rounded-xl flex items-center justify-center border ${typeConfig.color}`}>
                  {typeConfig.icon}
                </div>

                <GlassCard className={idx === 0 ? 'ring-1 ring-[var(--accent)]/30' : ''}>
                  {/* Header */}
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${typeConfig.color}`}>
                      {typeConfig.label}
                    </span>
                    <Tag size={14} className="text-[var(--text-muted)]" />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {entry.phase} — v{entry.version}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] ml-auto">
                      {new Date(entry.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                    {idx === 0 && (
                      <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Aktuell
                      </span>
                    )}
                  </div>

                  {/* Changes list */}
                  <ul className="space-y-1.5">
                    {entry.changes.map((change, ci) => (
                      <li key={ci} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                        <CheckCircle size={14} className="text-green-400 mt-0.5 shrink-0" />
                        {change}
                      </li>
                    ))}
                  </ul>

                  {/* Deploy info */}
                  {entry.deployId && (
                    <div className="mt-3 pt-3 border-t border-[var(--border-primary)] flex items-center gap-4 text-xs text-[var(--text-muted)]">
                      <span className="font-mono bg-[var(--bg-input)] px-2 py-0.5 rounded">ID: {entry.deployId}</span>
                      {entry.url && (
                        <a href={entry.url} target="_blank" rel="noopener noreferrer"
                           className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
                          <Rocket size={12} /> {entry.url.replace('https://', '')}
                        </a>
                      )}
                    </div>
                  )}
                </GlassCard>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ArchitectureTab() {
  return (
    <div className="space-y-6">
      {/* Tech Stack */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Layers size={20} className="text-purple-400" /> Technologie-Stack
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TECH_STACK.map(cat => (
            <GlassCard key={cat.category}>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 border-b border-[var(--border-primary)] pb-2">{cat.category}</h4>
              <div className="space-y-2">
                {cat.items.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">{item.name}</span>
                    <span className={`text-xs font-mono ${item.color}`}>{item.version || '—'}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Component Architecture */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Box size={20} className="text-cyan-400" /> Komponentenarchitektur (22 Komponenten)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {[
            { name: 'App', type: 'Router', color: 'border-green-500/30' },
            { name: 'LandingPage', type: 'Page', color: 'border-blue-500/30' },
            { name: 'Questionnaire', type: 'Page', color: 'border-blue-500/30' },
            { name: 'ArztDashboard', type: 'Page', color: 'border-purple-500/30' },
            { name: 'MFADashboard', type: 'Page', color: 'border-purple-500/30' },
            { name: 'AdminDashboard', type: 'Page (NEU)', color: 'border-amber-500/30' },
            { name: 'QuestionRenderer', type: 'Core', color: 'border-cyan-500/30' },
            { name: 'HistorySidebar', type: 'Nav', color: 'border-indigo-500/30' },
            { name: 'ProgressBar', type: 'UI', color: 'border-teal-500/30' },
            { name: 'AnswerSummary', type: 'Export', color: 'border-red-500/30' },
            { name: 'PDFExport', type: 'Export', color: 'border-red-500/30' },
            { name: 'RedFlagOverlay', type: 'Triage', color: 'border-rose-500/30' },
            { name: 'DSGVOConsent', type: 'Legal', color: 'border-emerald-500/30' },
            { name: 'ChatBubble', type: 'Chat', color: 'border-violet-500/30' },
            { name: 'MedicationManager', type: 'Medical', color: 'border-pink-500/30' },
            { name: 'SchwangerschaftCheck', type: 'Medical', color: 'border-pink-500/30' },
            { name: 'SurgeryManager', type: 'Medical', color: 'border-pink-500/30' },
            { name: 'UnfallBGFlow', type: 'Medical', color: 'border-orange-500/30' },
            { name: 'IGelServices', type: 'Business', color: 'border-amber-500/30' },
            { name: 'LanguageSelector', type: 'i18n', color: 'border-green-500/30' },
            { name: 'ThemeToggle', type: 'UI', color: 'border-gray-500/30' },
            { name: 'ErrorBoundary', type: 'Error', color: 'border-red-500/30' },
          ].map(c => (
            <div key={c.name} className={`rounded-xl border ${c.color} bg-[var(--bg-input)] p-3`}>
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">{c.name}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{c.type}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Database Models */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Database size={20} className="text-blue-400" /> Datenbankmodelle (Prisma/PostgreSQL)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            { model: 'Patient', fields: 'hashedEmail, sessions, meds', icon: '👤' },
            { model: 'PatientSession', fields: 'status, service, answers', icon: '📋' },
            { model: 'Answer', fields: 'atomId, value, encrypted', icon: '💬' },
            { model: 'TriageEvent', fields: 'level, message, ack', icon: '🚨' },
            { model: 'MedicalAtom', fields: 'module, logic, redFlag', icon: '⚛️' },
            { model: 'ArztUser', fields: 'role, pwHash, sessions', icon: '👨‍⚕️' },
            { model: 'AuditLog', fields: 'action, user, timestamp', icon: '📝' },
            { model: 'AccidentDetails', fields: 'bgName, date, location', icon: '🚑' },
            { model: 'ChatMessage', fields: 'text, from, timestamp', icon: '💭' },
            { model: 'PatientMedication', fields: 'name, dose, freq', icon: '💊' },
          ].map(m => (
            <div key={m.model} className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-input)] p-3">
              <div className="flex items-center gap-2 mb-2">
                <span>{m.icon}</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">{m.model}</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">{m.fields}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* API Endpoints */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Server size={20} className="text-amber-400" /> API-Endpunkte
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-primary)]">
                <th className="text-left py-2 px-3 text-[var(--text-secondary)] font-medium">Methode</th>
                <th className="text-left py-2 px-3 text-[var(--text-secondary)] font-medium">Endpunkt</th>
                <th className="text-left py-2 px-3 text-[var(--text-secondary)] font-medium">Auth</th>
                <th className="text-left py-2 px-3 text-[var(--text-secondary)] font-medium">Beschreibung</th>
              </tr>
            </thead>
            <tbody>
              {[
                { method: 'POST', endpoint: '/api/sessions/start', auth: '–', desc: 'Session erstellen' },
                { method: 'POST', endpoint: '/api/sessions/:id/answers', auth: 'JWT', desc: 'Antwort speichern' },
                { method: 'POST', endpoint: '/api/triage', auth: 'JWT', desc: 'Triage-Event' },
                { method: 'PUT', endpoint: '/api/arzt/sessions/:id/status', auth: 'ARZT', desc: 'Status ändern' },
                { method: 'POST', endpoint: '/api/upload', auth: 'JWT', desc: 'Datei hochladen' },
                { method: 'GET', endpoint: '/api/export/:format/:id', auth: 'ARZT', desc: 'PDF/CSV/JSON' },
                { method: 'GET', endpoint: '/api/arzt/sessions', auth: 'ARZT', desc: 'Alle Sitzungen' },
                { method: 'POST', endpoint: '/api/chats/:id', auth: 'JWT', desc: 'Chat-Nachricht' },
              ].map(e => (
                <tr key={e.endpoint} className="border-b border-[var(--border-primary)]/30">
                  <td className="py-2 px-3">
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${e.method === 'GET' ? 'bg-green-500/20 text-green-400' : e.method === 'PUT' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{e.method}</span>
                  </td>
                  <td className="py-2 px-3 font-mono text-xs text-cyan-400">{e.endpoint}</td>
                  <td className="py-2 px-3 text-xs text-[var(--text-muted)]">{e.auth}</td>
                  <td className="py-2 px-3 text-xs text-[var(--text-secondary)]">{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────

export function AdminDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />;
      case 'users': return <UserManagementTab />;
      case 'fragebogen': return <FragebogenBuilder />;
      case 'roi': return <ROIDashboard />;
      case 'wunschbox': return <WunschboxTab />;
      case 'content': return <WaitingContentTab />;
      case 'permissions': return <PermissionMatrix />;
      case 'audit': return <AuditLogTab />;
      case 'pvs': return <PvsAdminPanel />;
      case 'flow': return <FlowTab />;
      case 'security': return <SecurityTab />;
      case 'export': return <ExportTab />;
      case 'productivity': return <ProductivityTab />;
      case 'architecture': return <ArchitectureTab />;
      case 'changelog': return <ChangelogTab />;
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{t('admin.title', 'Admin-Dashboard')}</h1>
              <p className="text-xs text-[var(--text-muted)]">{t('admin.subtitle', 'DiggAI Anamnese · Systemdokumentation')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              System Online
            </span>
            <a href="/" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              ← {t('admin.back', 'Zurück')}
            </a>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="sticky top-[57px] z-40 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/60 backdrop-blur-xl" role="tablist" aria-label="Dashboard-Tabs">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto py-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-[var(--accent)] text-white shadow-lg shadow-blue-500/25'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6" role="tabpanel" id={`panel-${activeTab}`} aria-label={TABS.find(t => t.id === activeTab)?.label}>
        {tabContent}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]/40 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>{t('admin.footerVersion', 'DiggAI Anamnese App · Phase 14 · Version 14.0')}</span>
          <span>{t('admin.footerCompliance', 'DSGVO-konform · AES-256 · Made in Germany 🇩🇪')}</span>
        </div>
      </footer>
    </div>
  );
}
