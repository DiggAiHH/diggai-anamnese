import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Activity, ShieldCheck, Clock, MessageSquare, Phone, AlertCircle, Calendar, HardHat, FileText, FilePlus, ClipboardList, Stethoscope, ChevronRight, BookOpen, Eye, Users, Settings } from 'lucide-react';
import { useCreateSession } from '../hooks/usePatientApi';
import { useSessionStore } from '../store/sessionStore';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';
import { ModeToggle } from './ModeToggle';
import { KioskToggle } from './KioskToggle';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { preloadConsentExperience, preloadLandingEnhancements } from '../lib/routePreloaders';
import { api } from '../api/client';
import {
    getPatientAppBasePath,
    getPatientQuestionnairePath,
    getPatientServiceById,
    getPatientServiceEntryPath,
    translateStableText,
    type PatientServiceId,
} from '../lib/patientFlow';

const DatenschutzGame = lazy(() => import('./DatenschutzGame').then(m => ({ default: m.DatenschutzGame })));
const SignaturePad = lazy(() => import('./SignaturePad').then(m => ({ default: m.SignaturePad })));
const QRCodeDisplay = lazy(() => import('./QRCodeDisplay').then(m => ({ default: m.QRCodeDisplay })));
const ChatBubble = lazy(() => import('./ChatBubble').then(m => ({ default: m.ChatBubble })));

interface ServiceCard {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    flow: 'questionnaire' | 'emergency';
    duration?: string;
    badge?: string;
}

interface LandingPageProps {
    forceClassic?: boolean;
}

const CLASSIC_SERVICE_IDS: ReadonlySet<PatientServiceId> = new Set([
    'anamnese',
    'prescription',
    'au',
    'unfall',
]);

export function LandingPage({ forceClassic = false }: LandingPageProps) {
    const { t } = useTranslation();
    const { mutate: createSession, status: createStatus } = useCreateSession();
    const navigate = useNavigate();
    const { bsnr } = useParams<{ bsnr?: string }>();
    const [searchParams] = useSearchParams();
    const sessionId = useSessionStore(state => state.sessionId);
    const setPatientData = useSessionStore(state => state.setPatientData);
    const [showDSGVO, setShowDSGVO] = useState(false);
    const [showSignature, setShowSignature] = useState(false);
    const [selectedService, setSelectedService] = useState<ServiceCard | null>(null);
    const [showDeferredUi, setShowDeferredUi] = useState(false);
    const classicLayoutFromQuery = searchParams.get('layout');
    const showClassicLayout =
        forceClassic || classicLayoutFromQuery === 'classic' || classicLayoutFromQuery === 'classic4';

    useEffect(() => {
        const enableDeferredUi = () => {
            setShowDeferredUi(true);
            void preloadLandingEnhancements();
        };

        const timer = globalThis.setTimeout(enableDeferredUi, 800);
        return () => globalThis.clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (createStatus !== 'success' || !sessionId || !selectedService) {
            return;
        }

        navigate(getPatientQuestionnairePath(selectedService.id as PatientServiceId, bsnr), { replace: true });
    }, [bsnr, createStatus, navigate, selectedService, sessionId]);

    const services: ServiceCard[] = useMemo(() => [
        {
            id: 'anamnese',
            title: t('Termin / Anamnese'),
            description: t('Intelligente Vorbereitung für Ihren nächsten Behandlungstermin.'),
            icon: <Stethoscope className="w-8 h-8" />,
            color: 'from-blue-500 to-indigo-600',
            flow: 'questionnaire',
            duration: `5-8 ${t('time.min', 'Min.')}`
        },
        {
            id: 'prescription',
            title: t('Medikamente / Rezepte'),
            description: t('Folge-Rezepte für Ihre Dauermedikation einfach online anfragen.'),
            icon: <ClipboardList className="w-8 h-8" />,
            color: 'from-emerald-500 to-teal-600',
            flow: 'questionnaire',
            duration: `2 ${t('time.min', 'Min.')}`
        },
        {
            id: 'au',
            title: t('AU (Krankschreibung)'),
            description: t('Anfrage einer Arbeitsunfähigkeits-Bescheinigung bei Erkrankung.'),
            icon: <FileText className="w-8 h-8" />,
            color: 'from-rose-500 to-pink-600',
            flow: 'questionnaire',
            duration: `3 ${t('time.min', 'Min.')}`
        },
        {
            id: 'unfall',
            title: t('Unfallmeldung (BG)'),
            description: t('Arbeitsunfall, Wegeunfall oder Schulunfall dokumentieren.'),
            icon: <HardHat className="w-8 h-8" />,
            color: 'from-orange-500 to-amber-600',
            flow: 'questionnaire',
            duration: `5 ${t('time.min', 'Min.')}`,
            badge: t('badge.new', 'NEU')
        },
        {
            id: 'referral',
            title: t('Überweisung'),
            description: t('Fachspezifische Überweisungen für weiterführende Behandlungen.'),
            icon: <Calendar className="w-8 h-8" />,
            color: 'from-indigo-500 to-blue-600',
            flow: 'questionnaire',
            duration: `2 ${t('time.min', 'Min.')}`
        },
        {
            id: 'appointment-cancel',
            title: t('Terminabsage'),
            description: t('Einfach und schnell einen bestehenden Termin absagen.'),
            icon: <AlertCircle className="w-8 h-8" />,
            color: 'from-orange-500 to-red-600',
            flow: 'questionnaire',
            duration: `1 ${t('time.min', 'Min.')}`
        },
        {
            id: 'docs-upload',
            title: t('Dateien / Befunde'),
            description: t('Externe Befunde, Laborwerte oder Dokumente übermitteln.'),
            icon: <FilePlus className="w-8 h-8" />,
            color: 'from-amber-500 to-yellow-600',
            flow: 'questionnaire',
            duration: `2 ${t('time.min', 'Min.')}`
        },
        {
            id: 'callback',
            title: t('Telefonanfrage'),
            description: t('Wir rufen Sie zurück. Hinterlassen Sie Ihre Nummer.'),
            icon: <Phone className="w-8 h-8" />,
            color: 'from-cyan-500 to-teal-600',
            flow: 'questionnaire',
            duration: `2 ${t('time.min', 'Min.')}`
        },
        {
            id: 'docs-request',
            title: t('Dokumente anfordern'),
            description: t('Kopien von Befunden oder Berichten anfordern.'),
            icon: <ClipboardList className="w-8 h-8" />,
            color: 'from-purple-500 to-violet-600',
            flow: 'questionnaire',
            duration: `2 ${t('time.min', 'Min.')}`
        },
        {
            id: 'message',
            title: t('Nachricht schreiben'),
            description: t('Allgemeine Mitteilung an das Praxis-Team.'),
            icon: <MessageSquare className="w-8 h-8" />,
            color: 'from-slate-600 to-slate-800',
            flow: 'questionnaire',
            duration: `3 ${t('time.min', 'Min.')}`
        }
    ], [t]);

    const displayedServices = useMemo(() => {
        if (!showClassicLayout) {
            return services;
        }

        return services.filter((service) => CLASSIC_SERVICE_IDS.has(service.id as PatientServiceId));
    }, [services, showClassicLayout]);

    const servicesGridClassName = showClassicLayout
        ? 'grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl'
        : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6';

    const patientBasePath = getPatientAppBasePath(bsnr);

    const handleSelect = (service: ServiceCard) => {
        // Erst DSGVO-Consent prüfen
        const consentGiven = localStorage.getItem('dsgvo_consent');
        if (!consentGiven) {
            void preloadConsentExperience();
            setSelectedService(service);
            setShowDSGVO(true);
            return;
        }
        startFlow(service);
    };

    const startFlow = (service: ServiceCard) => {
        const serviceDefinition = getPatientServiceById(service.id);
        const flowValue = serviceDefinition?.flowValue ?? service.title;

        setPatientData({ selectedService: flowValue });
        createSession({
            // We pass dummy strings initially
            // because actual ones are gathered in steps 0000, 0001, etc.
            email: '',
            isNewPatient: true,
            gender: '',
            birthDate: '',
            selectedService: flowValue
        });
    };

    const handleConsentAccept = () => {
        setShowDSGVO(false);
        setShowSignature(true);
    };

    const handleSignatureComplete = (signatureData: string, documentHash: string) => {
        // Store locally for offline fallback
        localStorage.setItem('dsgvo_consent', new Date().toISOString());
        localStorage.setItem('dsgvo_signature_hash', documentHash);
        localStorage.setItem('dsgvo_signature_data', signatureData);

        // Persist DSGVO signature to backend (fire-and-forget with error logging)
        api.submitDsgvoSignature({
            signatureData,
            documentHash,
            formType: 'DSGVO',
            documentVersion: '1.0',
        }).catch((err: unknown) => {
            console.warn('[DSGVO] Signature backend persist failed (stored locally):', err);
        });

        setShowSignature(false);
        if (selectedService) {
            startFlow(selectedService);
        }
    };

    const handleSignatureDecline = () => {
        setShowSignature(false);
        setSelectedService(null);
    };

    const handleConsentDecline = () => {
        setShowDSGVO(false);
        setSelectedService(null);
    };

    return (
        <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] selection:bg-blue-500/30 font-sans">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 lg:py-24">
                {/* Header Toggle */}
                <div className="flex justify-end mb-8 gap-3">
                    <ModeToggle />
                    <ThemeToggle />
                    <LanguageSelector />
                    <KioskToggle />
                </div>

                {/* Header */}
                <div className="max-w-3xl mb-16 lg:mb-24">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold tracking-wide uppercase mb-8 shadow-lg shadow-blue-500/5">
                        <Activity className="w-4 h-4" />
                        {showClassicLayout
                            ? translateStableText(t, 'landing.classicHub', 'Patienten-Service Klassik')
                            : t('landing.serviceHub', 'Patienten-Service Hub')}
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-[var(--text-primary)] mb-8 leading-[1.1]">
                        {showClassicLayout
                            ? translateStableText(t, 'ui.landing.classicTitle', 'Schnellauswahl in 4 Feldern')
                            : translateStableText(t, 'ui.landing.title', 'Anliegen wählen')}
                    </h1>
                    <p className="text-xl text-[var(--text-secondary)] leading-relaxed font-medium">
                        {showClassicLayout
                            ? translateStableText(
                                t,
                                'ui.landing.classicDescription',
                                'Die klassische 4-Felder-Ansicht für den schnellsten Einstieg in die häufigsten Anliegen.',
                            )
                            : t('landingDescription', 'Wählen Sie Ihr Anliegen aus. Unser intelligenter Assistent leitet Sie Schritt für Schritt durch den Prozess – schnell, sicher und diskret.')}
                    </p>
                    <div className="mt-6">
                        {showClassicLayout ? (
                            <Link
                                to={patientBasePath}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] text-sm font-semibold text-[var(--text-secondary)] hover:text-blue-400 hover:border-blue-500/30 transition-all"
                            >
                                {translateStableText(t, 'ui.landing.switchFull', 'Vollständige Service-Ansicht öffnen')}
                            </Link>
                        ) : (
                            <Link
                                to={`${patientBasePath}?layout=classic`}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] text-sm font-semibold text-[var(--text-secondary)] hover:text-blue-400 hover:border-blue-500/30 transition-all"
                            >
                                {translateStableText(t, 'ui.landing.switchClassic', '4-Felder-Ansicht öffnen')}
                            </Link>
                        )}
                    </div>
                </div>

                {/* Services Grid */}
                <div className={servicesGridClassName}>
                    {displayedServices.map((service) => {
                        const serviceDefinition = getPatientServiceById(service.id);
                        const route = serviceDefinition?.routeSegment
                            ? getPatientServiceEntryPath(service.id as PatientServiceId, bsnr)
                            : null;
                        const tileClassName = "group relative flex flex-col p-8 rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)] transition-all duration-500 text-left overflow-hidden shadow-2xl backdrop-blur-xl";

                        const tileContent = (
                            <>
                                {/* Badge */}
                                {service.badge && (
                                    <div className="absolute top-4 right-4 px-2.5 py-1 bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-lg shadow-orange-500/30 animate-pulse">
                                        {t(service.badge)}
                                    </div>
                                )}

                                {/* Glow */}
                                <div className={`absolute top-0 right-0 w-40 h-40 -mr-12 -mt-12 rounded-full opacity-[0.05] blur-3xl transition-all duration-700 group-hover:scale-150 group-hover:opacity-20 bg-gradient-to-br ${service.color}`} />

                                {/* Icon + Duration */}
                                <div className="flex items-center justify-between mb-8">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 bg-gradient-to-br ${service.color}`}>
                                        {React.cloneElement(service.icon as React.ReactElement<any>, { className: "w-7 h-7" })}
                                    </div>
                                    {service.duration && (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-card)] rounded-full border border-[var(--border-primary)] backdrop-blur-md">
                                            <Clock className="w-3.5 h-3.5 text-gray-500" />
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{service.duration}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto space-y-3">
                                    <h3 className="text-xl font-bold text-[var(--text-primary)] group-hover:text-blue-400 transition-colors tracking-tight">
                                        {translateStableText(t, serviceDefinition?.titleKey || service.title, service.title)}
                                    </h3>
                                    <p className="text-sm text-gray-500 leading-relaxed font-medium">
                                        {translateStableText(t, serviceDefinition?.descriptionKey || service.description, service.description)}
                                    </p>
                                    <div className="pt-4 flex items-center gap-2 text-blue-400 text-sm font-bold opacity-0 -translate-x-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0">
                                        {!route && createStatus === 'pending' && selectedService?.id === service.id ? (
                                            <span>{translateStableText(t, 'ui.landing.initializingConnection', 'Initialisiere sichere Verbindung...')}</span>
                                        ) : (
                                            <>
                                                <span>{route ? t('landing.details', 'Mehr erfahren') : t('Jetzt starten')}</span>
                                                <ChevronRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </>
                        );

                        // Routed tiles → <Link>, remaining tiles → <button>
                        if (route) {
                            return (
                                <Link
                                    key={service.id}
                                    to={route}
                                    className={tileClassName}
                                >
                                    {tileContent}
                                </Link>
                            );
                        }

                        return (
                            <button
                                key={service.id}
                                onClick={() => handleSelect(service)}
                                onMouseEnter={() => void preloadConsentExperience()}
                                onFocus={() => void preloadConsentExperience()}
                                className={tileClassName}
                            >
                                {tileContent}
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="mt-24 pt-12 border-t border-[var(--border-primary)] flex flex-col lg:flex-row items-center justify-between gap-8 py-8">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">{translateStableText(t, 'ui.landing.systemOnline', 'System Online')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 text-gray-600" />
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">{translateStableText(t, 'ui.landing.dsgvo', 'DSGVO Konform')}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap justify-center">
                        <Link to={bsnr ? `/${bsnr}/datenschutz` : '/datenschutz'} className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] backdrop-blur-md text-sm font-bold text-[var(--text-secondary)] hover:text-blue-400 hover:border-blue-500/30 transition-all duration-300">
                            <ShieldCheck className="w-4 h-4" />
                            {t('landing.datenschutz', 'Datenschutz')}
                        </Link>
                        <Link to={bsnr ? `/${bsnr}/impressum` : '/impressum'} className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] backdrop-blur-md text-sm font-bold text-[var(--text-secondary)] hover:text-blue-400 hover:border-blue-500/30 transition-all duration-300">
                            <FileText className="w-4 h-4" />
                            {t('landing.impressum', 'Impressum')}
                        </Link>
                        <span className="hidden lg:block w-px h-6 bg-[var(--border-primary)]" />
                        <Link to="/verwaltung/docs" className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] backdrop-blur-md text-sm font-bold text-[var(--text-secondary)] hover:text-blue-400 hover:border-blue-500/30 transition-all duration-300">
                            <BookOpen className="w-4 h-4" />
                            {t('landing.docs', 'Dokumentation')}
                        </Link>
                        <Link to="/verwaltung/handbuch" className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] backdrop-blur-md text-sm font-bold text-[var(--text-secondary)] hover:text-blue-400 hover:border-blue-500/30 transition-all duration-300">
                            <Eye className="w-4 h-4" />
                            {t('landing.handbuch', 'Handbuch')}
                        </Link>
                        <span className="hidden lg:block w-px h-6 bg-[var(--border-primary)]" />
                        <Link to="/verwaltung/arzt" className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] backdrop-blur-md text-sm font-bold text-[var(--text-secondary)] hover:text-emerald-400 hover:border-emerald-500/30 transition-all duration-300">
                            <Stethoscope className="w-4 h-4" />
                            {t('landing.arzt', 'Arzt')}
                        </Link>
                        <Link to="/verwaltung/mfa" className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] backdrop-blur-md text-sm font-bold text-[var(--text-secondary)] hover:text-amber-400 hover:border-amber-500/30 transition-all duration-300">
                            <Users className="w-4 h-4" />
                            {t('landing.mfa', 'MFA')}
                        </Link>
                        <Link to="/verwaltung/admin" className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] backdrop-blur-md text-sm font-bold text-[var(--text-secondary)] hover:text-rose-400 hover:border-rose-500/30 transition-all duration-300">
                            <Settings className="w-4 h-4" />
                            {t('landing.admin', 'Admin')}
                        </Link>
                    </div>

                    <div className="flex items-center gap-6 px-6 py-4 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-primary)] backdrop-blur-md">
                        <p className="text-sm text-[var(--text-secondary)] font-medium">
                            {t('aesFooter', 'Ihre Daten werden AES-256 verschlüsselt übertragen und gespeichert.')}
                        </p>
                    </div>
                </div>

                {/* QR Code for tablet/kiosk self-service */}
                {showDeferredUi && (
                    <Suspense fallback={<div className="mt-12 h-[304px]" />}>
                        <div className="mt-12 flex justify-center">
                            <QRCodeDisplay />
                        </div>
                    </Suspense>
                )}
            </div>

            {/* Gamified DSGVO Consent */}
            {showDSGVO && (
                <Suspense fallback={<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />}>
                    <DatenschutzGame
                        onAccept={handleConsentAccept}
                        onDecline={handleConsentDecline}
                        praxisName="DiggAI Praxis"
                    />
                </Suspense>
            )}

            {/* DSGVO Digital Signature */}
            {showSignature && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-lg rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl p-6 space-y-4 animate-fade-in">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] text-center">
                            {t('signature.dsgvo_title', 'Einwilligung unterschreiben')}
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)] text-center">
                            {t('signature.dsgvo_desc', 'Bitte unterschreiben Sie zur Bestätigung Ihrer Einwilligung.')}
                        </p>
                        <Suspense fallback={<div className="h-64 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] animate-pulse" />}>
                            <SignaturePad
                                documentText={t('dsgvoGame.consent1Title', 'Einwilligung in die Datenverarbeitung') + ' — DiggAI Praxis — ' + new Date().toISOString()}
                                onComplete={handleSignatureComplete}
                            />
                        </Suspense>
                        <button
                            onClick={handleSignatureDecline}
                            className="w-full py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                        >
                            {t('signature.decline', 'Abbrechen')}
                        </button>
                    </div>
                </div>
            )}

            {/* Chat Bot (bot-only on landing, no sessionId) */}
            {showDeferredUi && (
                <Suspense fallback={null}>
                    <ChatBubble />
                </Suspense>
            )}
        </main>
    );
}
