import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Inbox,
  Mail,
  Printer,
  RefreshCw,
  Send,
  UserRound,
  Workflow,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useMfaReceptionConfirm,
  useMfaReceptionDetail,
  useMfaReceptionInbox,
  useMfaReceptionMarkCompleted,
  useMfaReceptionMarkProcessed,
  useMfaReceptionMarkRead,
  useMfaReceptionPracticeCopy,
  useMfaReceptionRespond,
  useMfaReceptionStats,
} from '../../hooks/useStaffApi';

type ReceptionStatusState = {
  code: string;
  label: string;
  at: string | null;
  channel: string | null;
  templateKey?: string | null;
};

type ReceptionInboxItem = {
  sessionId: string;
  referenceId: string;
  patientName: string;
  service: string;
  sessionStatus: string;
  patientEmailAvailable: boolean;
  unresolvedCritical: number;
  triageLevel: 'EMERGENCY' | 'HIGH' | 'NORMAL';
  createdAt: string;
  completedAt: string | null;
  expiresAt: string;
  assignedArztName: string | null;
  trackingStatus: string;
  trackingStatusLabel: string;
  practiceCopyStatus: ReceptionStatusState;
  responseStatus: ReceptionStatusState;
  syncStatus: ReceptionStatusState;
  lastActivityAt: string;
  requiresManualFollowUp: boolean;
};

type ReceptionInboxStats = {
  openCount: number;
  responsePendingCount: number;
  missingEmailCount: number;
  practiceCopyPendingCount: number;
  syncedCount: number;
  averageResponseMinutes: number;
};

type ReceptionTemplatePreview = {
  key: 'received' | 'in_review' | 'completed' | 'callback';
  label: string;
  subject: string;
  body: string;
  recommended: boolean;
};

type ManualCompose = {
  to: string | null;
  subject: string;
  body: string;
};

type DispatchResult = {
  sent: boolean;
  mode: 'smtp' | 'manual' | 'unavailable';
  mailtoUrl: string | null;
  manualCompose: ManualCompose;
  recipientAvailable: boolean;
};

type ReceptionInboxDetail = {
  item: ReceptionInboxItem;
  patientEmail: string | null;
  patientBirthDate: string | null;
  insuranceType: string | null;
  triageEvents: Array<{
    level: string;
    message: string;
    atomId: string;
    createdAt: string;
  }>;
  answerSections: Array<{
    key: string;
    label: string;
    answers: Array<{
      atomId: string;
      questionText: string;
      value: string;
    }>;
  }>;
  practiceCopyPreview: {
    to: string | null;
    subject: string;
    body: string;
    mailtoUrl: string | null;
    directSendAvailable: boolean;
  };
  responseTemplates: ReceptionTemplatePreview[];
};

const TEMPLATE_ORDER: Array<ReceptionTemplatePreview['key']> = [
  'received',
  'in_review',
  'completed',
  'callback',
];

function formatDate(value: string | null): string {
  if (!value) {
    return '–';
  }

  return new Date(value).toLocaleString('de-DE');
}

function statusClasses(code: string): string {
  switch (code) {
    case 'SYNCED':
    case 'SENT':
    case 'CONFIRMED':
    case 'ABGESCHLOSSEN':
    case 'COMPLETED':
      return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';
    case 'READY':
    case 'GELESEN':
    case 'IN_PROGRESS':
    case 'PROCESSED':
      return 'border-blue-400/30 bg-blue-500/10 text-blue-200';
    case 'NO_EMAIL':
    case 'FAILED':
      return 'border-rose-400/30 bg-rose-500/10 text-rose-200';
    case 'PENDING':
    default:
      return 'border-amber-400/30 bg-amber-500/10 text-amber-100';
  }
}

function triageClasses(level: ReceptionInboxItem['triageLevel']): string {
  switch (level) {
    case 'EMERGENCY':
      return 'border-rose-400/40 bg-rose-500/20 text-rose-100';
    case 'HIGH':
      return 'border-amber-400/40 bg-amber-500/20 text-amber-100';
    default:
      return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100';
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function copyToClipboard(value: string) {
  if (!navigator.clipboard) {
    return;
  }

  await navigator.clipboard.writeText(value);
}

function openPrintPreview(title: string, body: string) {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=880,height=900');
  if (!popup) {
    return;
  }

  popup.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; line-height: 1.5; white-space: pre-wrap; }
          h1 { font-size: 20px; margin-bottom: 24px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <pre>${escapeHtml(body)}</pre>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-3 text-white/50 text-xs uppercase tracking-[0.2em]">
        <div className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-200">
          {icon}
        </div>
        <span>{label}</span>
      </div>
      <div className="mt-4 text-3xl font-black text-white">{value}</div>
    </div>
  );
}

export function MfaReceptionInboxPanel() {
  const { t } = useTranslation();
  const { data: inboxData, isLoading, refetch, isFetching } = useMfaReceptionInbox();
  const { data: statsData } = useMfaReceptionStats();
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<ReceptionTemplatePreview['key']>('received');
  const [customNote, setCustomNote] = useState('');
  const [practiceDispatch, setPracticeDispatch] = useState<DispatchResult | null>(null);
  const [responseDispatch, setResponseDispatch] = useState<DispatchResult | null>(null);
  const readSessionsRef = useRef<Set<string>>(new Set());

  const items = useMemo<ReceptionInboxItem[]>(() => {
    return ((inboxData as { items?: ReceptionInboxItem[] } | undefined)?.items ?? []);
  }, [inboxData]);

  const stats = (statsData as ReceptionInboxStats | undefined) || (inboxData as { stats?: ReceptionInboxStats } | undefined)?.stats;
  const detailQuery = useMfaReceptionDetail(selectedSessionId);
  const detail = detailQuery.data as ReceptionInboxDetail | undefined;

  const markReadMutation = useMfaReceptionMarkRead();
  const markProcessedMutation = useMfaReceptionMarkProcessed();
  const markCompletedMutation = useMfaReceptionMarkCompleted();
  const practiceCopyMutation = useMfaReceptionPracticeCopy();
  const responseMutation = useMfaReceptionRespond();
  const confirmMutation = useMfaReceptionConfirm();

  useEffect(() => {
    if (!selectedSessionId && items.length > 0) {
      setSelectedSessionId(items[0].sessionId);
    }

    if (selectedSessionId && items.every((item) => item.sessionId !== selectedSessionId)) {
      setSelectedSessionId(items[0]?.sessionId || '');
    }
  }, [items, selectedSessionId]);

  useEffect(() => {
    if (!detail) {
      return;
    }

    const preferredTemplate = detail.responseTemplates.find((template) => template.recommended)
      || detail.responseTemplates.find((template) => TEMPLATE_ORDER.includes(template.key))
      || detail.responseTemplates[0];

    if (preferredTemplate) {
      setSelectedTemplateKey(preferredTemplate.key);
    }
  }, [detail]);

  useEffect(() => {
    if (!selectedSessionId || readSessionsRef.current.has(selectedSessionId)) {
      return;
    }

    readSessionsRef.current.add(selectedSessionId);
    markReadMutation.mutate(selectedSessionId);
  }, [markReadMutation, selectedSessionId]);

  const selectedTemplate = useMemo(() => {
    return detail?.responseTemplates.find((template) => template.key === selectedTemplateKey) || null;
  }, [detail, selectedTemplateKey]);

  const responsePreviewBody = useMemo(() => {
    if (!selectedTemplate) {
      return '';
    }

    return customNote.trim()
      ? `${selectedTemplate.body}\n\nZusätzliche Information:\n${customNote.trim()}`
      : selectedTemplate.body;
  }, [customNote, selectedTemplate]);

  async function handlePracticeCopy() {
    if (!selectedSessionId) {
      return;
    }

    const result = await practiceCopyMutation.mutateAsync(selectedSessionId);
    const dispatch = result as DispatchResult;
    setPracticeDispatch(dispatch);

    if (dispatch.mailtoUrl) {
      window.location.href = dispatch.mailtoUrl;
    }
  }

  async function handleResponse(mode: 'smtp' | 'manual') {
    if (!selectedSessionId || !selectedTemplate) {
      return;
    }

    const result = await responseMutation.mutateAsync({
      sessionId: selectedSessionId,
      templateKey: selectedTemplate.key,
      customNote,
      mode,
    });

    const dispatch = result as DispatchResult;
    setResponseDispatch(dispatch);
  }

  async function handleConfirm(kind: 'practice-copy' | 'response') {
    if (!selectedSessionId) {
      return;
    }

    await confirmMutation.mutateAsync({ sessionId: selectedSessionId, kind });
    if (kind === 'practice-copy') {
      setPracticeDispatch(null);
      return;
    }
    setResponseDispatch(null);
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white/60">
        {t('mfa.loadingData', 'Lade medizinische Daten...')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Inbox className="w-6 h-6 text-purple-300" />
            {t('mfa.receptionInbox', 'Rezeptions-Inbox')}
          </h2>
          <p className="text-sm text-white/45 mt-2">
            {t('mfa.receptionInboxDesc', 'Online-Anliegen, Praxis-Mailbox, Tomedo-Abgleich und Antwortvorlagen in einem Arbeitsbereich.')}
          </p>
        </div>

        <button
          onClick={() => void refetch()}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          {t('mfa.receptionRefresh', 'Aktualisieren')}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label={t('mfa.receptionOpen', 'Offen')} value={stats?.openCount ?? 0} icon={<Inbox className="w-4 h-4" />} />
        <StatCard label={t('mfa.receptionPracticeMailbox', 'Praxis-Mail ausstehend')} value={stats?.practiceCopyPendingCount ?? 0} icon={<Mail className="w-4 h-4" />} />
        <StatCard label={t('mfa.receptionResponses', 'Antwort offen')} value={stats?.responsePendingCount ?? 0} icon={<Send className="w-4 h-4" />} />
        <StatCard label={t('mfa.receptionMissingEmail', 'Ohne E-Mail')} value={stats?.missingEmailCount ?? 0} icon={<AlertTriangle className="w-4 h-4" />} />
        <StatCard label={t('mfa.receptionSync', 'Synchronisiert')} value={stats?.syncedCount ?? 0} icon={<Workflow className="w-4 h-4" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4 flex items-center justify-between">
            <div className="text-sm font-bold text-white/80">{t('mfa.receptionList', 'Eingegangene Anliegen')}</div>
            <div className="text-xs text-white/35">{items.length}</div>
          </div>

          <div className="divide-y divide-white/5 max-h-[780px] overflow-y-auto">
            {items.length === 0 && (
              <div className="p-8 text-center text-white/40 text-sm">
                {t('mfa.receptionNoItems', 'Aktuell liegen keine bearbeitungsfähigen Anliegen vor.')}
              </div>
            )}

            {items.map((item) => {
              const active = item.sessionId === selectedSessionId;

              return (
                <button
                  key={item.sessionId}
                  onClick={() => {
                    setSelectedSessionId(item.sessionId);
                    setPracticeDispatch(null);
                    setResponseDispatch(null);
                    setCustomNote('');
                  }}
                  className={`w-full text-left px-5 py-4 transition-colors ${active ? 'bg-purple-500/10' : 'hover:bg-white/[0.03]'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold">{item.patientName}</span>
                        <span className={`px-2 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.16em] ${triageClasses(item.triageLevel)}`}>
                          {item.triageLevel}
                        </span>
                        {item.requiresManualFollowUp && (
                          <span className="px-2 py-1 rounded-full border border-rose-400/30 bg-rose-500/10 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-100">
                            {t('mfa.receptionNeedsEmail', 'Kein E-Mail-Kanal')}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-white/60">{item.service}</div>
                      <div className="mt-2 text-xs text-white/35 flex flex-wrap gap-3">
                        <span>{item.referenceId}</span>
                        <span>{formatDate(item.completedAt || item.createdAt)}</span>
                        <span>{item.assignedArztName || t('mfa.notAssigned', 'Nicht zugewiesen')}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end text-right">
                      <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.14em] ${statusClasses(item.practiceCopyStatus.code)}`}>
                        {item.practiceCopyStatus.label}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.14em] ${statusClasses(item.responseStatus.code)}`}>
                        {item.responseStatus.label}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-6 min-h-[780px]">
          {!detail && (
            <div className="h-full flex items-center justify-center text-center text-white/40 text-sm">
              {t('mfa.receptionNoSelection', 'Wählen Sie links ein Anliegen aus, um Details, Praxis-Mail und Antwortvorlagen zu sehen.')}
            </div>
          )}

          {detail && (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <UserRound className="w-5 h-5 text-purple-300" />
                    {detail.item.patientName}
                  </h3>
                  <p className="text-sm text-white/50 mt-2">{detail.item.service}</p>
                </div>
                <span className={`px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-[0.16em] ${statusClasses(detail.item.syncStatus.code)}`}>
                  {detail.item.syncStatus.label}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70 space-y-2">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">{t('mfa.receptionReference', 'Referenz')}</div>
                  <div className="font-mono text-white">{detail.item.referenceId}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/35 pt-2">{t('mfa.receptionPatientEmail', 'Patienten-E-Mail')}</div>
                  <div>{detail.patientEmail || t('mfa.receptionPatientEmailNotProvided', 'Nicht hinterlegt')}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70 space-y-2">
                  <div className="flex justify-between gap-3"><span>{t('mfa.receptionBirthDate', 'Geburtsdatum')}</span><span className="text-white">{formatDate(detail.patientBirthDate)}</span></div>
                  <div className="flex justify-between gap-3"><span>{t('mfa.receptionInsurance', 'Versicherung')}</span><span className="text-white">{detail.insuranceType || '–'}</span></div>
                  <div className="flex justify-between gap-3"><span>{t('mfa.receptionExpires', 'Löschung')}</span><span className="text-white">{formatDate(detail.item.expiresAt)}</span></div>
                  <div className="flex justify-between gap-3"><span>{t('mfa.receptionLastActivity', 'Letzte Aktivität')}</span><span className="text-white">{formatDate(detail.item.lastActivityAt)}</span></div>
                </div>
              </div>

              {detail.triageEvents.length > 0 && (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 space-y-2">
                  <div className="text-sm font-bold text-rose-100">{t('mfa.receptionTriage', 'Triage-Hinweise')}</div>
                  <div className="space-y-2">
                    {detail.triageEvents.map((event) => (
                      <div key={`${event.atomId}-${event.createdAt}`} className="text-sm text-rose-50/90">
                        [{event.level}] {event.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-white">{t('mfa.receptionPracticeCopy', 'Praxis-Mail / Tomedo-Kopie')}</div>
                    <div className="text-xs text-white/45 mt-1">{detail.practiceCopyPreview.subject}</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.14em] ${statusClasses(detail.item.practiceCopyStatus.code)}`}>
                    {detail.item.practiceCopyStatus.label}
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/70 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {detail.practiceCopyPreview.body}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => void handlePracticeCopy()}
                    disabled={practiceCopyMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
                  >
                    <Mail className="w-4 h-4" />
                    {practiceCopyMutation.isPending ? t('mfa.sending', 'Sende...') : t('mfa.receptionPreparePracticeMail', 'Praxis-Mail vorbereiten')}
                  </button>
                  <button
                    onClick={() => void copyToClipboard(detail.practiceCopyPreview.body)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    {t('mfa.receptionCopyBody', 'Text kopieren')}
                  </button>
                </div>

                {practiceDispatch && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3 text-sm text-white/75">
                    <div className="font-semibold text-white">{t('mfa.receptionManualCompose', 'Manueller Versand')}</div>
                    <div>{practiceDispatch.manualCompose.to || '–'}</div>
                    <div className="font-mono text-xs text-white/50">{practiceDispatch.manualCompose.subject}</div>
                    <div className="flex flex-wrap gap-3">
                      {practiceDispatch.mailtoUrl && (
                        <a href={practiceDispatch.mailtoUrl} className="inline-flex items-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 font-bold text-blue-100">
                          <Mail className="w-4 h-4" />
                          {t('mfa.receptionOpenAppleMail', 'Apple Mail öffnen')}
                        </a>
                      )}
                      <button
                        onClick={() => void handleConfirm('practice-copy')}
                        disabled={confirmMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 font-bold text-emerald-100 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {t('mfa.receptionConfirmSent', 'Als versendet markieren')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-white">{t('mfa.receptionResponseTemplates', 'Antwortvorlagen')}</div>
                    <div className="text-xs text-white/45 mt-1">{t('mfa.receptionResponseDesc', 'Vorstrukturierte Antworten aus der Praxis-E-Mail mit Human-in-the-Loop-Freigabe.')}</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.14em] ${statusClasses(detail.item.responseStatus.code)}`}>
                    {detail.item.responseStatus.label}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {detail.responseTemplates.map((template) => (
                    <button
                      key={template.key}
                      onClick={() => setSelectedTemplateKey(template.key)}
                      className={`rounded-2xl px-3 py-2 text-sm font-bold transition-colors ${selectedTemplateKey === template.key ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                    >
                      {template.label}
                    </button>
                  ))}
                </div>

                {selectedTemplate && (
                  <>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-2 text-sm text-white/75">
                      <div className="font-mono text-xs text-white/50">{selectedTemplate.subject}</div>
                      <div className="whitespace-pre-wrap max-h-48 overflow-y-auto">{responsePreviewBody}</div>
                    </div>

                    <label className="block">
                      <span className="block text-xs uppercase tracking-[0.18em] text-white/35 mb-2">
                        {t('mfa.receptionCustomNote', 'Zusätzliche Praxisnotiz')}
                      </span>
                      <textarea
                        value={customNote}
                        onChange={(event) => setCustomNote(event.target.value)}
                        rows={4}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-2 ring-purple-500/40"
                        placeholder={t('mfa.receptionCustomNotePlaceholder', 'Optionaler Zusatz für diese Rückmeldung')}
                      />
                    </label>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => void handleResponse('smtp')}
                        disabled={responseMutation.isPending || !detail.patientEmail}
                        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        {t('mfa.receptionDirectSend', 'Direkt senden')}
                      </button>

                      <button
                        onClick={() => void handleResponse('manual')}
                        disabled={responseMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                      >
                        <Mail className="w-4 h-4" />
                        {t('mfa.receptionPrepareManual', 'Manuell vorbereiten')}
                      </button>

                      <button
                        onClick={() => openPrintPreview(selectedTemplate.subject, responsePreviewBody)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                        {t('mfa.receptionPrintPreview', 'Druckansicht')}
                      </button>
                    </div>

                    {!detail.patientEmail && (
                      <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                        {t('mfa.receptionPatientEmailMissing', 'Für dieses Anliegen ist keine Patienten-E-Mail hinterlegt. Bitte telefonisch oder vor Ort rückmelden.')}
                      </div>
                    )}

                    {responseDispatch && (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3 text-sm text-white/75">
                        <div className="font-semibold text-white">{t('mfa.receptionManualCompose', 'Manueller Versand')}</div>
                        <div>{responseDispatch.manualCompose.to || t('mfa.receptionManualRecipient', 'Empfänger manuell eintragen')}</div>
                        <div className="font-mono text-xs text-white/50">{responseDispatch.manualCompose.subject}</div>
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => void copyToClipboard(responseDispatch.manualCompose.to || '')}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white"
                          >
                            <Copy className="w-4 h-4" />
                            {t('mfa.receptionCopyRecipient', 'Empfänger kopieren')}
                          </button>
                          <button
                            onClick={() => void copyToClipboard(responseDispatch.manualCompose.body)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white"
                          >
                            <Copy className="w-4 h-4" />
                            {t('mfa.receptionCopyBody', 'Text kopieren')}
                          </button>
                          <button
                            onClick={() => void handleConfirm('response')}
                            disabled={confirmMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 font-bold text-emerald-100 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {t('mfa.receptionConfirmSent', 'Als versendet markieren')}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-4">
                <div className="text-sm font-bold text-white">{t('mfa.receptionSummary', 'Zusammenfassung')}</div>
                <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                  {detail.answerSections.map((section) => (
                    <div key={section.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">{section.label}</div>
                      {section.answers.slice(0, 8).map((answer) => (
                        <div key={`${section.key}-${answer.atomId}`} className="text-sm text-white/75">
                          <span className="text-white/45">{answer.questionText}:</span> {answer.value || '–'}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => void markProcessedMutation.mutateAsync(detail.item.sessionId)}
                  disabled={markProcessedMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm font-bold text-blue-100 disabled:opacity-50"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  {t('mfa.receptionMarkProcessed', 'Als verarbeitet markieren')}
                </button>
                <button
                  onClick={() => void markCompletedMutation.mutateAsync(detail.item.sessionId)}
                  disabled={markCompletedMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {t('mfa.receptionMarkCompleted', 'Als abgeschlossen markieren')}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default MfaReceptionInboxPanel;