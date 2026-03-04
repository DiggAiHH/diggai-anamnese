import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck, Lock, Eye, FileText, Server, Key, Users,
  CheckCircle, XCircle, ChevronRight, Award, Star, Sparkles,
  ArrowRight, Trophy, Heart, Info
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

interface QuizQuestion {
  id: string;
  category: 'rights' | 'technical' | 'purpose' | 'legal';
  question: string;
  options: { text: string; correct: boolean; explanation: string }[];
  icon: React.ReactNode;
}

interface ConsentItem {
  id: string;
  title: string;
  description: string;
  detailSections: { heading: string; content: string }[];
  icon: React.ReactNode;
  color: string;
  quizQuestions: QuizQuestion[];
}

type GamePhase = 'intro' | 'consent-journey' | 'quiz' | 'summary' | 'complete';

interface DatenschutzGameProps {
  onAccept: () => void;
  onDecline: () => void;
  praxisName?: string;
}

// ─── Component ──────────────────────────────────────────────

export const DatenschutzGame: React.FC<DatenschutzGameProps> = ({
  onAccept,
  onDecline,
  praxisName = 'Gemeinschaftspraxis'
}) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [currentConsentIndex, setCurrentConsentIndex] = useState(0);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [, setConsentChecked] = useState<Record<string, boolean>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number | null>>({});
  const [quizFeedback, setQuizFeedback] = useState<Record<string, 'correct' | 'wrong' | null>>({});
  const [score, setScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedSections, setCompletedSections] = useState<string[]>([]);

  // ─── Consent Items (the journey) ─────────────────────────

  const consentItems: ConsentItem[] = [
    {
      id: 'datenverarbeitung',
      title: t('dsgvoGame.consent1Title', 'Einwilligung in die Datenverarbeitung'),
      description: t('dsgvoGame.consent1Desc', `Ich willige ein, dass die ${praxisName} meine personenbezogenen Daten (Name, Geburtsdatum, Kontaktdaten, Versicherungsstatus) zum Zweck der Behandlungsplanung verarbeitet.`),
      icon: <FileText className="w-6 h-6" />,
      color: 'blue',
      detailSections: [
        {
          heading: t('dsgvoGame.whatData', 'Welche Daten genau?'),
          content: t('dsgvoGame.whatDataContent', '• Ihr vollständiger Name\n• Geburtsdatum\n• Telefonnummer & E-Mail\n• Versicherungsstatus (GKV/PKV)\n• Versicherungsnummer')
        },
        {
          heading: t('dsgvoGame.whyData', 'Warum brauchen wir diese Daten?'),
          content: t('dsgvoGame.whyDataContent', 'Zur eindeutigen Identifikation, Terminplanung, Abrechnung mit Ihrer Krankenkasse und um Sie im Notfall kontaktieren zu können.')
        },
        {
          heading: t('dsgvoGame.legalBasis', 'Rechtsgrundlage'),
          content: t('dsgvoGame.legalBasisContent', 'Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) – Der Behandlungsvertrag erfordert diese Daten.')
        }
      ],
      quizQuestions: [
        {
          id: 'q1',
          category: 'purpose',
          question: t('dsgvoGame.quiz1Q', 'Wofür wird Ihr Name in der Praxis verwendet?'),
          options: [
            { text: t('dsgvoGame.quiz1A1', 'Für Werbung per Post'), correct: false, explanation: t('dsgvoGame.quiz1E1', 'Nein! Ihre Daten werden NIEMALS für Marketing verwendet.') },
            { text: t('dsgvoGame.quiz1A2', 'Zur Identifikation und Behandlungsplanung'), correct: true, explanation: t('dsgvoGame.quiz1E2', 'Richtig! ✓ Nur für Ihre medizinische Versorgung.') },
            { text: t('dsgvoGame.quiz1A3', 'Wird an Versicherungen verkauft'), correct: false, explanation: t('dsgvoGame.quiz1E3', 'Absolut nicht! Es findet kein Datenverkauf statt.') }
          ],
          icon: <Users className="w-5 h-5" />
        }
      ]
    },
    {
      id: 'medizinischeDaten',
      title: t('dsgvoGame.consent2Title', 'Verarbeitung von Gesundheitsdaten'),
      description: t('dsgvoGame.consent2Desc', 'Ich stimme gemäß Art. 9 Abs. 2 lit. a DSGVO ausdrücklich der Verarbeitung meiner Gesundheitsdaten zu (Vorerkrankungen, Medikamente, Symptome, Allergien).'),
      icon: <Heart className="w-6 h-6" />,
      color: 'rose',
      detailSections: [
        {
          heading: t('dsgvoGame.healthData', 'Was sind Gesundheitsdaten?'),
          content: t('dsgvoGame.healthDataContent', '• Vorerkrankungen & Diagnosen\n• Aktuelle Medikamente & Dosierungen\n• Symptome & Beschwerden\n• Allergien & Unverträglichkeiten\n• Frühere Operationen')
        },
        {
          heading: t('dsgvoGame.whySpecial', 'Warum besonderer Schutz?'),
          content: t('dsgvoGame.whySpecialContent', 'Gesundheitsdaten gehören zu den „besonderen Kategorien" nach Art. 9 DSGVO. Sie sind extra sensibel und dürfen NUR mit Ihrer ausdrücklichen Einwilligung verarbeitet werden.')
        },
        {
          heading: t('dsgvoGame.encryption', 'Wie werden sie geschützt?'),
          content: t('dsgvoGame.encryptionContent', '🔐 AES-256-GCM Verschlüsselung (Militärstandard)\n🔒 TLS 1.3 für alle Übertragungen\n🛡️ Pseudonymisierung durch SHA-256 Hashing\n👤 Zugriff nur durch autorisiertes Praxispersonal')
        }
      ],
      quizQuestions: [
        {
          id: 'q2',
          category: 'technical',
          question: t('dsgvoGame.quiz2Q', 'Wie werden Ihre Gesundheitsdaten verschlüsselt?'),
          options: [
            { text: t('dsgvoGame.quiz2A1', 'Gar nicht – alles im Klartext'), correct: false, explanation: t('dsgvoGame.quiz2E1', 'Falsch! Alle Daten werden mit AES-256-GCM verschlüsselt.') },
            { text: t('dsgvoGame.quiz2A2', 'Mit einem einfachen Passwort'), correct: false, explanation: t('dsgvoGame.quiz2E2', 'Nein – wir verwenden Militärgrad-Verschlüsselung.') },
            { text: t('dsgvoGame.quiz2A3', 'AES-256-GCM (Militärstandard)'), correct: true, explanation: t('dsgvoGame.quiz2E3', 'Genau! ✓ Der gleiche Standard, den Banken und Regierungen verwenden.') }
          ],
          icon: <Key className="w-5 h-5" />
        }
      ]
    },
    {
      id: 'speicherung',
      title: t('dsgvoGame.consent3Title', 'Speicherdauer & Aufbewahrung'),
      description: t('dsgvoGame.consent3Desc', 'Ich verstehe, dass meine Daten gemäß §630f BGB für 10 Jahre nach Behandlungsende aufbewahrt und danach automatisch gelöscht werden.'),
      icon: <Server className="w-6 h-6" />,
      color: 'amber',
      detailSections: [
        {
          heading: t('dsgvoGame.howLong', 'Wie lange gespeichert?'),
          content: t('dsgvoGame.howLongContent', '📅 10 Jahre nach Abschluss der letzten Behandlung\n⚖️ Gesetzliche Pflicht nach §630f BGB\n🗑️ Automatische Löschung nach Ablauf der Frist')
        },
        {
          heading: t('dsgvoGame.whereSaved', 'Wo werden Daten gespeichert?'),
          content: t('dsgvoGame.whereSavedContent', '🇩🇪 Ausschließlich auf Servern in Deutschland\n🔒 ISO 27001-zertifizierte Rechenzentren\n💾 Verschlüsselte Backups nach 3-2-1-Prinzip')
        }
      ],
      quizQuestions: [
        {
          id: 'q3',
          category: 'legal',
          question: t('dsgvoGame.quiz3Q', 'Wie lange dürfen Patientendaten maximal gespeichert werden?'),
          options: [
            { text: t('dsgvoGame.quiz3A1', 'Für immer'), correct: false, explanation: t('dsgvoGame.quiz3E1', 'Nein! Nach §630f BGB sind es 10 Jahre.') },
            { text: t('dsgvoGame.quiz3A2', '10 Jahre nach Behandlungsende'), correct: true, explanation: t('dsgvoGame.quiz3E2', 'Korrekt! ✓ Danach werden die Daten gelöscht.') },
            { text: t('dsgvoGame.quiz3A3', '1 Jahr'), correct: false, explanation: t('dsgvoGame.quiz3E3', 'Zu kurz – Ärzte sind gesetzlich verpflichtet, 10 Jahre aufzubewahren.') }
          ],
          icon: <Server className="w-5 h-5" />
        }
      ]
    },
    {
      id: 'rechte',
      title: t('dsgvoGame.consent4Title', 'Ihre Rechte & Widerruf'),
      description: t('dsgvoGame.consent4Desc', 'Mir ist bekannt, dass ich die Einwilligung jederzeit widerrufen, meine Daten einsehen, berichtigen oder löschen lassen kann.'),
      icon: <Eye className="w-6 h-6" />,
      color: 'emerald',
      detailSections: [
        {
          heading: t('dsgvoGame.yourRights', 'Ihre 7 DSGVO-Rechte'),
          content: t('dsgvoGame.yourRightsContent', '📋 Art. 15 – Auskunftsrecht: Erfahren Sie, welche Daten wir haben\n✏️ Art. 16 – Berichtigung: Korrekturen jederzeit möglich\n🗑️ Art. 17 – Löschung: „Recht auf Vergessenwerden"\n⏸️ Art. 18 – Einschränkung: Verarbeitung pausieren\n📦 Art. 20 – Datenübertragbarkeit: Daten mitnehmen\n✋ Art. 21 – Widerspruch: Verarbeitung stoppen\n⚖️ Beschwerderecht bei der Aufsichtsbehörde')
        },
        {
          heading: t('dsgvoGame.howToRevoke', 'Wie kann ich widerrufen?'),
          content: t('dsgvoGame.howToRevokeContent', '📧 Per E-Mail an die Praxis\n📞 Telefonisch während der Sprechzeiten\n🏥 Persönlich in der Praxis\n\n⚡ Der Widerruf gilt ab sofort – bereits verarbeitete Daten bleiben bis zum Widerruf rechtmäßig.')
        }
      ],
      quizQuestions: [
        {
          id: 'q4',
          category: 'rights',
          question: t('dsgvoGame.quiz4Q', 'Was passiert, wenn Sie Ihre Einwilligung widerrufen?'),
          options: [
            { text: t('dsgvoGame.quiz4A1', 'Nichts – der Widerruf wird ignoriert'), correct: false, explanation: t('dsgvoGame.quiz4E1', 'Falsch! Ihr Widerrufrecht ist gesetzlich geschützt.') },
            { text: t('dsgvoGame.quiz4A2', 'Die Verarbeitung stoppt sofort'), correct: true, explanation: t('dsgvoGame.quiz4E2', 'Richtig! ✓ Ab dem Widerruf dürfen keine neuen Daten mehr verarbeitet werden.') },
            { text: t('dsgvoGame.quiz4A3', 'Sie müssen eine Strafe zahlen'), correct: false, explanation: t('dsgvoGame.quiz4E3', 'Niemals! Der Widerruf ist Ihr Grundrecht – kostenlos und ohne Begründung.') }
          ],
          icon: <Eye className="w-5 h-5" />
        }
      ]
    },
    {
      id: 'technik',
      title: t('dsgvoGame.consent5Title', 'Technische Sicherheit'),
      description: t('dsgvoGame.consent5Desc', 'Ich habe verstanden, dass modernste Verschlüsselungs- und Sicherheitstechnologien zum Schutz meiner Daten eingesetzt werden.'),
      icon: <Lock className="w-6 h-6" />,
      color: 'violet',
      detailSections: [
        {
          heading: t('dsgvoGame.techMeasures', 'Unsere Sicherheitsmaßnahmen'),
          content: t('dsgvoGame.techMeasuresContent', '🔐 AES-256-GCM – Verschlüsselung aller personenbezogenen Daten\n🔒 TLS 1.3 – Modernste Transportverschlüsselung\n🔑 JWT-basierte Zugriffskontrolle mit Rollen (Arzt/MFA/Admin)\n📊 HIPAA-konformes Audit-Logging aller Zugriffe\n🛡️ Rate-Limiting gegen Brute-Force-Angriffe\n🌐 Content Security Policy (CSP) für XSS-Schutz')
        },
        {
          heading: t('dsgvoGame.whoAccess', 'Wer hat Zugriff?'),
          content: t('dsgvoGame.whoAccessContent', '👨‍⚕️ Ihr behandelnder Arzt\n👩‍⚕️ Autorisierte MFA (Medizinische Fachangestellte)\n🔒 Kein Zugriff durch IT-Personal auf entschlüsselte Daten\n❌ Kein Zugriff durch Dritte oder externe Stellen')
        }
      ],
      quizQuestions: [
        {
          id: 'q5',
          category: 'technical',
          question: t('dsgvoGame.quiz5Q', 'Wer kann Ihre entschlüsselten Gesundheitsdaten einsehen?'),
          options: [
            { text: t('dsgvoGame.quiz5A1', 'Jeder Mitarbeiter der Praxis'), correct: false, explanation: t('dsgvoGame.quiz5E1', 'Nein! Nur autorisierte Ärzte und MFA mit Ihrer Behandlung.') },
            { text: t('dsgvoGame.quiz5A2', 'Der IT-Administrator'), correct: false, explanation: t('dsgvoGame.quiz5E2', 'Nein! Daten sind verschlüsselt – IT sieht nur verschlüsselte Zeichenketten.') },
            { text: t('dsgvoGame.quiz5A3', 'Nur Ihr Arzt und autorisierte MFA'), correct: true, explanation: t('dsgvoGame.quiz5E3', 'Genau! ✓ Strenge rollenbasierte Zugriffskontrolle schützt Ihre Daten.') }
          ],
          icon: <Lock className="w-5 h-5" />
        }
      ]
    }
  ];

  const totalQuestions = consentItems.reduce((acc, c) => acc + c.quizQuestions.length, 0);
  const progress = completedSections.length / consentItems.length;

  // ─── Handle quiz answer ──────────────────────────────────

  const handleQuizAnswer = useCallback((questionId: string, optionIndex: number, isCorrect: boolean) => {
    if (quizFeedback[questionId]) return; // already answered

    setQuizAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    setQuizFeedback(prev => ({ ...prev, [questionId]: isCorrect ? 'correct' : 'wrong' }));

    if (isCorrect) {
      setScore(s => s + 1);
    }
  }, [quizFeedback]);

  // ─── Complete a consent section ──────────────────────────

  const completeSection = useCallback((sectionId: string) => {
    if (!completedSections.includes(sectionId)) {
      setCompletedSections(prev => [...prev, sectionId]);
    }
    setConsentChecked(prev => ({ ...prev, [sectionId]: true }));

    // Move to next section or quiz
    if (currentConsentIndex < consentItems.length - 1) {
      setCurrentConsentIndex(i => i + 1);
    } else {
      setPhase('quiz');
    }
  }, [completedSections, currentConsentIndex, consentItems.length]);

  // ─── Celebration effect ────────────────────────────────────

  useEffect(() => {
    if (phase === 'complete') {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // ─── Render: Intro ────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-xl animate-fade-in">
          <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl overflow-hidden">
            {/* Hero */}
            <div className="relative px-8 pt-10 pb-8 text-center bg-gradient-to-b from-blue-600/20 to-transparent">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-5">
                <ShieldCheck className="w-10 h-10 text-blue-400" />
              </div>
              <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2">
                {t('dsgvoGame.title', 'Datenschutz-Entdecker')}
              </h2>
              <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                {t('dsgvoGame.introText', 'Bevor wir starten, möchten wir sicherstellen, dass Sie genau verstehen, was mit Ihren Daten passiert. In 5 kurzen Stationen erfahren Sie alles — und testen Ihr Wissen!')}
              </p>
            </div>

            {/* Features */}
            <div className="px-8 pb-6 grid grid-cols-3 gap-4">
              {[
                { icon: <Eye className="w-5 h-5" />, label: t('dsgvoGame.introF1', '100% Transparent'), color: 'text-emerald-400' },
                { icon: <Star className="w-5 h-5" />, label: t('dsgvoGame.introF2', 'Quiz & Punkte'), color: 'text-amber-400' },
                { icon: <Lock className="w-5 h-5" />, label: t('dsgvoGame.introF3', 'Militärschutz'), color: 'text-violet-400' },
              ].map((f, i) => (
                <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)]">
                  <div className={f.color}>{f.icon}</div>
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] text-center">{f.label}</span>
                </div>
              ))}
            </div>

            {/* Estimated time */}
            <div className="px-8 pb-4">
              <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                <Info className="w-3.5 h-3.5" />
                {t('dsgvoGame.introTime', '⏱️ Dauer: ca. 2 Minuten')}
              </div>
            </div>

            {/* Actions */}
            <div className="px-8 pb-8 flex flex-col gap-3">
              <button
                onClick={() => setPhase('consent-journey')}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
              >
                <Sparkles className="w-4 h-4" />
                {t('dsgvoGame.startJourney', 'Entdeckungsreise starten')}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onDecline}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-sm transition-all"
              >
                {t('dsgvoGame.decline', 'Nein danke, ich möchte nicht fortfahren')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Consent Journey ──────────────────────────────

  if (phase === 'consent-journey') {
    const currentItem = consentItems[currentConsentIndex];
    const colorMap: Record<string, string> = {
      blue: 'border-blue-500/30 bg-blue-500/10',
      rose: 'border-rose-500/30 bg-rose-500/10',
      amber: 'border-amber-500/30 bg-amber-500/10',
      emerald: 'border-emerald-500/30 bg-emerald-500/10',
      violet: 'border-violet-500/30 bg-violet-500/10',
    };
    const iconColorMap: Record<string, string> = {
      blue: 'text-blue-400 bg-blue-500/20',
      rose: 'text-rose-400 bg-rose-500/20',
      amber: 'text-amber-400 bg-amber-500/20',
      emerald: 'text-emerald-400 bg-emerald-500/20',
      violet: 'text-violet-400 bg-violet-500/20',
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
          <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl overflow-hidden flex flex-col">
            {/* Progress Bar */}
            <div className="px-6 pt-4 pb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                  {t('dsgvoGame.station', 'Station')} {currentConsentIndex + 1}/{consentItems.length}
                </span>
                <span className="text-[10px] font-bold text-[var(--text-muted)]">
                  {Math.round(progress * 100)}%
                </span>
              </div>
              <div className="h-2 bg-[var(--bg-card)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${((currentConsentIndex) / consentItems.length) * 100}%` }}
                />
              </div>
              {/* Step indicators */}
              <div className="flex gap-1.5 mt-3">
                {consentItems.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => i <= Math.max(currentConsentIndex, completedSections.length) && setCurrentConsentIndex(i)}
                    disabled={i > Math.max(currentConsentIndex, completedSections.length)}
                    className={`flex-1 h-1.5 rounded-full transition-all ${
                      completedSections.includes(item.id) ? 'bg-emerald-500' :
                      i === currentConsentIndex ? 'bg-blue-500 animate-pulse' :
                      'bg-[var(--bg-card)]'
                    } ${i <= Math.max(currentConsentIndex, completedSections.length) ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'}`}
                    aria-label={`Station ${i + 1}: ${item.title}`}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Section Header */}
              <div className={`flex items-start gap-4 p-5 rounded-xl border ${colorMap[currentItem.color]}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconColorMap[currentItem.color]}`}>
                  {currentItem.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">{currentItem.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{currentItem.description}</p>
                </div>
              </div>

              {/* Detail Sections (expandable) */}
              <div className="space-y-2">
                {currentItem.detailSections.map((section, idx) => (
                  <div key={idx} className="rounded-xl border border-[var(--border-primary)] overflow-hidden">
                    <button
                      onClick={() => setExpandedSection(expandedSection === `${currentItem.id}-${idx}` ? null : `${currentItem.id}-${idx}`)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--bg-card)] transition-colors"
                    >
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{section.heading}</span>
                      <ChevronRight className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${expandedSection === `${currentItem.id}-${idx}` ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedSection === `${currentItem.id}-${idx}` && (
                      <div className="px-4 pb-4 text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line border-t border-[var(--border-primary)] pt-3">
                        {section.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Inline mini-quiz */}
              {currentItem.quizQuestions.map(q => (
                <div key={q.id} className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                      {q.icon}
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                      {t('dsgvoGame.quickQuiz', 'Schnell-Quiz')}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">{q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = quizAnswers[q.id] === optIdx;
                      const feedback = quizFeedback[q.id];
                      const showResult = feedback !== null && feedback !== undefined;
                      const isCorrectOption = opt.correct;

                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleQuizAnswer(q.id, optIdx, opt.correct)}
                          disabled={showResult}
                          className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                            showResult && isCorrectOption
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                              : showResult && isSelected && !isCorrectOption
                              ? 'border-red-500/50 bg-red-500/10 text-red-300'
                              : showResult
                              ? 'border-[var(--border-primary)] opacity-50'
                              : 'border-[var(--border-primary)] hover:border-blue-500/40 hover:bg-blue-500/5'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              showResult && isCorrectOption ? 'border-emerald-400 bg-emerald-500' :
                              showResult && isSelected ? 'border-red-400 bg-red-500' :
                              'border-[var(--border-primary)]'
                            }`}>
                              {showResult && isCorrectOption && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                              {showResult && isSelected && !isCorrectOption && <XCircle className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <span className={showResult && (isCorrectOption || isSelected) ? 'font-semibold' : 'text-[var(--text-secondary)]'}>{opt.text}</span>
                          </div>
                          {showResult && (isSelected || isCorrectOption) && (
                            <p className="mt-2 ml-9 text-xs text-[var(--text-muted)] leading-relaxed">{opt.explanation}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--border-primary)] flex items-center justify-between">
              <button
                onClick={onDecline}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                {t('Ablehnen')}
              </button>
              <button
                onClick={() => completeSection(currentItem.id)}
                disabled={!currentItem.quizQuestions.every(q => quizFeedback[q.id])}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  currentItem.quizQuestions.every(q => quizFeedback[q.id])
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 hover:scale-[1.02]'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {currentConsentIndex < consentItems.length - 1 ? (
                  <>
                    {t('dsgvoGame.nextStation', 'Nächste Station')}
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    {t('dsgvoGame.toSummary', 'Zur Zusammenfassung')}
                    <Trophy className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Quiz Summary ──────────────────────────────────

  if (phase === 'quiz' || phase === 'summary') {
    const totalCorrect = score;
    const percentage = Math.round((totalCorrect / totalQuestions) * 100);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-xl max-h-[90vh] flex flex-col animate-fade-in">
          <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="relative px-8 pt-8 pb-6 text-center bg-gradient-to-b from-emerald-600/20 to-transparent">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                <Trophy className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-black text-[var(--text-primary)] mb-1">
                {t('dsgvoGame.summaryTitle', 'Zusammenfassung')}
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                {t('dsgvoGame.summarySubtitle', 'Sie haben alle 5 Stationen durchlaufen!')}
              </p>
            </div>

            {/* Score */}
            <div className="px-8 pb-4">
              <div className="flex items-center justify-center gap-6 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)]">
                <div className="text-center">
                  <div className="text-3xl font-black text-emerald-400">{totalCorrect}/{totalQuestions}</div>
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('dsgvoGame.correct', 'Richtig')}</div>
                </div>
                <div className="w-px h-12 bg-[var(--border-primary)]" />
                <div className="text-center">
                  <div className="text-3xl font-black text-blue-400">{percentage}%</div>
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('dsgvoGame.score', 'Score')}</div>
                </div>
                <div className="w-px h-12 bg-[var(--border-primary)]" />
                <div className="text-center">
                  <div className="text-3xl font-black text-amber-400">
                    {percentage >= 80 ? '🏆' : percentage >= 60 ? '⭐' : '📚'}
                  </div>
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('dsgvoGame.badge', 'Badge')}</div>
                </div>
              </div>
            </div>

            {/* Consent checklist */}
            <div className="flex-1 overflow-y-auto px-8 pb-4 space-y-2">
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                {t('dsgvoGame.confirmations', 'Ihre Bestätigungen')}
              </p>
              {consentItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="text-xs text-[var(--text-secondary)] font-medium">{item.title}</span>
                </div>
              ))}
            </div>

            {/* Important notice */}
            <div className="px-8 pb-4">
              <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-300/80 leading-relaxed">
                  {t('dsgvoGame.finalNote', 'Sie können die Einwilligung jederzeit widerrufen. Ihre Daten sind durch AES-256-GCM verschlüsselt und werden ausschließlich für Ihre medizinische Versorgung verwendet.')}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-8 pb-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={onDecline}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-sm transition-all"
              >
                <XCircle className="w-4 h-4" />
                {t('Ablehnen')}
              </button>
              <button
                onClick={() => { setPhase('complete'); setTimeout(onAccept, 1500); }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02]"
              >
                <ShieldCheck className="w-4 h-4" />
                {t('dsgvoGame.acceptAll', 'Alles verstanden & einwilligen')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Complete (celebration) ────────────────────────

  if (phase === 'complete') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-md animate-fade-in text-center">
          <div className="rounded-2xl border border-emerald-500/30 bg-[var(--bg-secondary)] shadow-2xl p-10">
            {showConfetti && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full animate-bounce"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'][i % 6],
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${1 + Math.random() * 2}s`,
                    }}
                  />
                ))}
              </div>
            )}
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mb-6">
              <Award className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-black text-emerald-400 mb-2">
              {t('dsgvoGame.complete', 'Geschafft! 🎉')}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {t('dsgvoGame.completeText', 'Ihre Einwilligung wurde gespeichert. Ihre Daten sind sicher.')}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-emerald-400">
                {t('dsgvoGame.earnedBadge', 'Datenschutz-Profi Badge erhalten!')}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
