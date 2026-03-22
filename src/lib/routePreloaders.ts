type PreloadTask = () => Promise<unknown>;

function preloadOnce(task: PreloadTask): PreloadTask {
    let promise: Promise<unknown> | null = null;
    return () => {
        if (!promise) {
            promise = task();
        }
        return promise;
    };
}

export const preloadPatientFlow = preloadOnce(() =>
    Promise.all([
        import('../components/LandingPage'),
        import('../components/Questionnaire'),
        import('../components/SessionRecoveryDialog'),
    ])
);

export const preloadPwaPortal = preloadOnce(() =>
    Promise.all([
        import('../pages/pwa/PwaLogin'),
        import('../components/pwa/PWAShell'),
        import('../pages/pwa/PwaDashboard'),
    ])
);

export const preloadTelemedizin = preloadOnce(() =>
    Promise.all([
        import('../pages/telemedizin/TelemedizinScheduler'),
        import('../pages/telemedizin/VideoRoom'),
    ])
);

export const preloadConsentExperience = preloadOnce(() =>
    Promise.all([
        import('../components/DatenschutzGame'),
        import('../components/SignaturePad'),
    ])
);

export const preloadLandingEnhancements = preloadOnce(() =>
    Promise.all([
        import('../components/ChatBubble'),
        import('../components/QRCodeDisplay'),
    ])
);