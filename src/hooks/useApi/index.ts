/**
 * useApi Barrel Export
 * 
 * Diese Datei exportiert alle API-Hooks für die Abwärtskompatibilität.
 * 
 * Verwendung:
 * ```ts
 * import { useCreateSession, useArztSessions } from './hooks/useApi';
 * // oder
 * import * as api from './hooks/useApi';
 * ```
 * 
 * Für bessere Tree-Shaking können auch direkt die einzelnen Module importiert werden:
 * ```ts
 * import { useCreateSession } from './hooks/useApi/usePatientApi';
 * import { useArztSessions } from './hooks/useApi/useStaffApi';
 * ```
 */

// ─── Gemeinsame Utilities ───────────────────────────────────
export { getErrorMessage, createQueryKey, STALE_TIME, REFETCH_INTERVAL } from './utils';
export { useAbortableRequest, isAbortError, withAbortHandling } from './useAbortableRequest';
export type { AbortableRequestResult } from './useAbortableRequest';
export type {
    CreateSessionPayload,
    SubmitAnswerPayload,
    PaginationParams,
    ApiErrorResponse,
    SessionResponse,
    TriageAlert,
    SubmitAnswerResponse,
    User,
    QueueEntry,
    PvsConnection,
    TherapyPlan,
} from './types';

// ─── Optimistic Updates ─────────────────────────────────────
export { useOptimisticMutation } from './useOptimisticMutation';

// ─── Patient API ────────────────────────────────────────────
export {
    useCreateSession,
    useSessionState,
    useSubmitAnswer,
    useSubmitAccidentDetails,
    useMedications,
    useSubmitMedications,
    useSurgeries,
    useSubmitSurgeries,
    useSubmitSession,
    useAtoms,
} from './usePatientApi';

// ─── Auth API ───────────────────────────────────────────────
export {
    useGenerateQrToken,
    useArztLogin,
} from './useAuthApi';

// ─── Staff API ──────────────────────────────────────────────
export {
    // Arzt Dashboard
    useArztSessions,
    useArztSessionDetail,
    useAckTriage,
    useArztSessionSummary,
    // MFA Dashboard
    useMfaSessions,
    useMfaDoctors,
    useMfaAssignDoctor,
    // Chat
    useChatMessages,
    useSendChatMessage,
    // Queue
    useQueue,
    useQueuePosition,
    useQueueJoin,
    useQueueCall,
    useQueueTreat,
    useQueueDone,
    useQueueRemove,
    useQueueFeedback,
    useQueueFlowConfig,
    // Waiting Content
    useWaitingContent,
    useContentAnalytics,
    useTrackContentView,
    useLikeContent,
    useTrackQuizAnswer,
} from './useStaffApi';

// ─── Admin API ──────────────────────────────────────────────
export {
    // Dashboard
    useAdminStats,
    useAdminTimeline,
    useAdminServiceAnalytics,
    useAdminTriageAnalytics,
    useAdminAuditLog,
    // Users
    useAdminUsers,
    useAdminCreateUser,
    useAdminUpdateUser,
    useAdminDeleteUser,
    // Permissions
    useAdminPermissions,
    useAdminRolePermissions,
    useAdminSetRolePermissions,
    useAdminSetUserPermissions,
    // ROI
    useROIToday,
    useROIHistory,
    useROIConfig,
    useROIUpdateConfig,
    useROIProjection,
    // Wunschbox
    useWunschboxSubmit,
    useWunschboxList,
    useWunschboxMy,
    useWunschboxProcess,
    useWunschboxReview,
    useWunschboxExport,
    // Content
    useAdminContentList,
    useAdminContentCreate,
    useAdminContentUpdate,
    useAdminContentDelete,
    // Atoms Builder
    useAtomSingle,
    useAtomsReorder,
    useAtomToggle,
    useAtomDraftCreate,
    useAtomDraftsList,
    useAtomDraftPublish,
    useAtomDraftDelete,
} from './useAdminApi';

// ─── PVS API ────────────────────────────────────────────────
export {
    usePvsConnections,
    usePvsCapabilities,
    usePvsCreateConnection,
    usePvsUpdateConnection,
    usePvsTestConnection,
    usePvsDeleteConnection,
    usePvsExportSession,
    usePvsExportBatch,
    usePvsImportPatient,
    usePvsPatientLinks,
    usePvsCreatePatientLink,
    usePvsDeletePatientLink,
    usePvsTransfers,
    usePvsTransferDetail,
    usePvsRetryTransfer,
    usePvsTransferStats,
    usePvsMappings,
    usePvsSaveMappings,
    usePvsResetMappings,
    usePvsMappingPreview,
    // Compatibility Aliases
    usePvsFieldMappings,
    usePvsUpdateFieldMapping,
    usePvsLinkPatient,
    usePvsUnlinkPatient,
    usePvsSearchPatient,
} from './usePVSApi';

// ─── Therapy API ────────────────────────────────────────────
export {
    // Plans
    useTherapyPlansBySession,
    useTherapyPlansByPatient,
    useTherapyPlan,
    useTherapyCreatePlan,
    useTherapyUpdatePlan,
    useTherapyDeletePlan,
    useTherapyUpdateStatus,
    // Measures
    useTherapyAddMeasure,
    useTherapyUpdateMeasure,
    useTherapyDeleteMeasure,
    useTherapyUpdateMeasureStatus,
    useTherapyReorderMeasures,
    // Templates
    useTherapyTemplates,
    useTherapyApplyTemplate,
    // Alerts
    useTherapyAlerts,
    useTherapyAlertsByPatient,
    useTherapyAlertRead,
    useTherapyAlertDismiss,
    useTherapyAlertAction,
    useTherapyEvaluateAlerts,
    // Analytics
    useTherapyAnalytics,
    useTherapyAnon,
    useTherapyExportPvs,
    // AI
    useAiStatus,
    useAiSuggestTherapy,
    useAiSummarizeSession,
    useAiIcdSuggest,
} from './useTherapyApi';

// ─── PWA API ────────────────────────────────────────────────
export {
    // Dashboard
    usePwaDashboard,
    // Diary
    usePwaDiaryList,
    usePwaDiaryGet,
    usePwaDiaryCreate,
    usePwaDiaryUpdate,
    usePwaDiaryDelete,
    usePwaDiaryTrends,
    // Measures
    usePwaMeasures,
    usePwaMeasureTrackings,
    usePwaMeasureComplete,
    usePwaMeasureSkip,
    // Messages
    usePwaMessages,
    usePwaUnreadCount,
    usePwaMessageSend,
    // Consents
    usePwaConsents,
    usePwaUpdateConsents,
    // Devices
    usePwaDevices,
    usePwaRegisterDevice,
    // Settings
    usePwaSettings,
    usePwaUpdateSettings,
    usePwaChangePassword,
    usePwaSetPin,
    // Sync
    usePwaSync,
    // Profile
    usePwaProfile,
    // Auth
    usePwaLogin,
    usePwaLogout,
    usePwaRegister,
    usePwaVerifyEmail,
    // Appointments
    usePwaAppointments,
    usePwaAppointmentSlots,
    usePwaAppointmentCreate,
    usePwaAppointmentCancel,
    // Reminders
    usePwaReminders,
    usePwaReminderAdherence,
    usePwaReminderCreate,
    usePwaReminderToggle,
    usePwaReminderDelete,
} from './usePwaApi';

// ─── System API ─────────────────────────────────────────────
export {
    // System Management
    useSystemDeployment,
    useSystemFeatures,
    useSystemConfigs,
    useSystemUpdateConfig,
    useSystemBackups,
    useSystemCreateBackup,
    useSystemRestoreBackup,
    useSystemDeleteBackup,
    useSystemBackupSchedule,
    useSystemNetwork,
    useSystemLogs,
    useSystemInfo,
    // TI
    useTIStatus,
    useTIPing,
    useTIRefresh,
    useTICards,
    useTIReadEGK,
    useTIConfig,
    useTIEpaStatus,
    useTIKimStatus,
    // NFC
    useNfcScan,
    useNfcCheckpoints,
    useNfcCreateCheckpoint,
    useNfcUpdateCheckpoint,
    useNfcDeleteCheckpoint,
    useNfcCheckpointScans,
    // Flow
    useFlowList,
    useFlowGet,
    useFlowCreate,
    useFlowUpdate,
    useFlowProgress,
    useFlowStart,
    useFlowAdvance,
    useFlowDelay,
    // Feedback
    useFeedbackSubmit,
    useFeedbackList,
    useFeedbackStats,
    useFeedbackEscalate,
    useCheckoutSession,
    // Payment
    usePaymentCreateIntent,
    usePaymentNfcCharge,
    usePaymentReceipt,
    usePaymentStats,
    usePaymentRefund,
    usePaymentSessionList,
    // Praxis Chat
    usePraxisChatMessages,
    usePraxisChatSend,
    usePraxisChatBroadcast,
    usePraxisChatMarkRead,
    usePraxisChatUnread,
    usePraxisChatTemplates,
    usePraxisChatStats,
    usePraxisChatDelete,
    // Avatar
    useAvatarGet,
    useAvatarUpdate,
    useAvatarList,
    useAvatarSpeak,
    useAvatarConsent,
    useAvatarRevokeConsent,
    useAvatarCloneStart,
    useAvatarCloneStatus,
    useAvatarDelete,
    useAvatarLanguages,
    // Telemedizin
    useTelemedizinList,
    useTelemedizinGet,
    useTelemedizinStats,
    useTelemedizinCreate,
    useTelemedizinJoin,
    useTelemedizinEnd,
    useTelemedizinCancel,
    useTelemedizinNoShow,
    useTelemedizinPrescription,
    useTelemedizinFollowUp,
    // Gamification
    useGamificationStaffAchievements,
    useGamificationLeaderboard,
    useGamificationStaffPoints,
    useGamificationStats,
    useGamificationAward,
    useGamificationRecalculate,
    // Forms
    useFormGet,
    useFormList,
    useFormStats,
    useFormCreate,
    useFormUpdate,
    useFormDelete,
    useFormAiGenerate,
    useFormPublish,
    useFormUsage,
    useFormSubmit,
    // ePA
    useEpaGet,
    useEpaDocuments,
    useEpaShares,
    useEpaAccessByToken,
    useEpaExport,
    useEpaAddDocument,
    useEpaDeleteDocument,
    useEpaCreateShare,
    useEpaRevokeShare,
    useEpaCreateExport,
    // Agents
    useAgentStatus,
    useAgentTasks,
    useAgentTaskDetail,
    useCreateAgentTask,
    useAgentMetrics,
} from './useSystemApi';
