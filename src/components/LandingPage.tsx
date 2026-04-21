import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Activity, Clock, MessageSquare, Phone, AlertCircle, Calendar, HardHat, FileText, FilePlus, ClipboardList, Stethoscope, ChevronRight } from 'lucide-react';
import { useCreateSession } from '../hooks/usePatientApi';
import { useSessionStore } from '../store/sessionStore';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';
import { ModeToggle } from './ModeToggle';
import { KioskToggle } from './KioskToggle';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { preloadConsentExperience } from '../lib/routePreloaders';
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
    const classicLayoutFromQuery = searchParams.get('layout');
    const showClassicLayout =
        forceClassic || classicLayoutFromQuery === 'classic' || classicLayoutFromQuery === 'classic4';

    useEffect(() => {
        if (createStatus !== 'success' || !sessionId || !selectedService) {
            return;
        }

        navigate(getPatientQuestionnairePath(selectedService.id as PatientServiceId, bsnr), { replace: true });
    }, [bsnr, createStatus, navigate, selectedService, sessionId]);

    const services: ServiceCard[] = useMemo(() => [
        {
            id: 'anamnese',
            title: t('ui.services.anamnese.title'),
            description: t('ui.services.anamnese.description'),
            icon: <Stethoscope className="w-8 h-8" />,
            color: 'from-blue-500 to-indigo-600',
            flow: 'questionnaire',
            duration: `5-8 ${t('time.min')}`
        },
        {
            id: 'prescription',
            title: t('ui.services.prescription.title'),
            description: t('ui.services.prescription.description'),
            icon: <ClipboardList className="w-8 h-8" />,
            color: 'from-emerald-500 to-teal-600',
            flow: 'questionnaire',
            duration: `2 ${t('time.min')}`
        },
        {
            id: 'au',
            title: t('ui.services.au.title'),
            description: t('ui.services.au.description'),
            icon: <FileText className="w-8 h-8" />,
            color: 'from-rose-500 to-pink-600',
            flow: 'questionnaire',
            duration: `3 ${t('time.min')}`
        },
        {
            id: 'unfall',
            title: t('ui.services.unfall.title'),
            description: t('ui.services.unfall.description'),
            icon: <HardHat className="w-8 h-8" />,
            color: 'from-orange-500 to-amber-600',
            flow: 'questionnaire',
            duration: `5 ${t('time.min')}`,
            badge: t('badge.new')
        },
        {
            id: 'referral',
            title: t('ui.services.referral.title'),
            description: t('ui.services.referral.description'),
            icon: <Calendar className="w-8 h-8" />,
            color: 'from-indigo-500 to-blue-600',
            flow: 'questionnaire',
            duration: `2 ${t('time.min')}`
        },
        {
            id: 'appointment-cancel',
            title: t('ui.services.appointmentCancel.title'),
            description: t('ui.services.appointmentCancel.description'),
            icon: <AlertCircle className="w-8 h-8" />,
            color: 'from-orange-500 to-red-600',
            flow: 'questionnaire',
            duration: `1 ${t('time.min')}`
        },
        {
            id: 'docs-upload',
            title: t('ui.services.docsUpload.title'),
            description: t('ui.services.docsUpload.description'),
            icon: <FilePlus className="w-8 h-8" />,
            color: 'from-amber-500 to-yellow-600',
            flow: 'questionnaire',
            duration: `2 ${t('time.min')}`
        },
        {
            id: 'callback',
            title: t('ui.services.callback.title'),
            description: t('ui.services.callback.description'),
            icon: <Phone className="w-8 h-8" />,
            color: 'from-cyan-500 to-teal-600',
            flow: 'questionnaire',
            duration: `2 ${t('time.min')}`
        },
        {
            id: 'docs-request',
            title: t('ui.services.docsRequest.title'),
            description: t('ui.services.docsRequest.description'),
            icon: <ClipboardList className="w-8 h-8" />,
            color: 'from-purple-500 to-violet-600',
            flow: 'questionnaire',
            duration: `2 ${t('time.min')}`
        },
        {
            id: 'message',
            title: t('ui.services.message.title'),
            description: t('ui.services.message.description'),
            icon: <MessageSquare className="w-8 h-8" />,
            color: 'from-slate-600 to-slate-800',
            flow: 'questionnaire',
            duration: `3 ${t('time.min')}`
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
                            : t('landing.serviceHub')}
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
                            : t('landingDescription')}
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


        </main>
    );
}
