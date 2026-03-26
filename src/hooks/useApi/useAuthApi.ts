/**
 * Auth API Hooks
 * 
 * Hooks für Authentifizierungs-bezogene Operationen:
 * - QR-Token Generierung
 * - Arzt-Login
 */

import { useMutation } from '@tanstack/react-query';
import { api } from '../../api/client';
import { setStoredStaffUser, setStoredStaffToken } from '../../lib/staffSession';

/**
 * Hook zum Generieren eines QR-Tokens
 * 
 * Für die Patienten-Check-in via QR-Code
 * 
 * @example
 * ```ts
 * const generateQr = useGenerateQrToken();
 * generateQr.mutate('Allgemeinmedizin');
 * ```
 */
export function useGenerateQrToken() {
    return useMutation({
        mutationFn: (service?: string) => api.generateQrToken(service)
    });
}

/**
 * Hook für den Arzt-Login
 * 
 * @example
 * ```ts
 * const login = useArztLogin();
 * login.mutate({ username: 'dr.mustermann', password: '***' });
 * ```
 */
export function useArztLogin() {
    return useMutation({
        mutationFn: ({ username, password }: { username: string; password: string }) =>
            api.arztLogin(username, password),
        onSuccess: (response) => {
            setStoredStaffUser(response.user ?? null);
            if (response.token) {
                setStoredStaffToken(response.token);
            }
        },
    });
}
