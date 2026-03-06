/**
 * Client-side Export Utility for Anamnese Data
 * 
 * Provides PDF and structured JSON export of session answers.
 * In Demo mode, encryption happens client-side using SubtleCrypto (Web Crypto API).
 * In Live mode, the server handles encryption via AES-256-GCM (see server/services/encryption.ts).
 */

// ─── Types ─────────────────────────────────────────────────
export interface ExportableAnswer {
    questionId: string;
    questionText: string;
    section: string;
    value: string;
    answeredAt: string;
}

export interface ExportPayload {
    sessionId: string;
    exportedAt: string;
    patientName?: string;
    answers: ExportableAnswer[];
    triageLevel?: string;
    metadata: {
        version: string;
        format: 'json' | 'pdf';
        encrypted: boolean;
    };
}

// ─── Client-side AES-256-GCM Encryption (Web Crypto API) ──
async function generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true, // extractable for export
        ['encrypt', 'decrypt']
    );
}

async function encryptPayload(data: string, key: CryptoKey): Promise<{ iv: string; ciphertext: string; keyHex: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
    );

    // Export key for potential later decryption
    const rawKey = await crypto.subtle.exportKey('raw', key);

    return {
        iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
        ciphertext: Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join(''),
        keyHex: Array.from(new Uint8Array(rawKey)).map(b => b.toString(16).padStart(2, '0')).join(''),
    };
}

// ─── Export Functions ──────────────────────────────────────

/**
 * Export session data as encrypted JSON file
 */
export async function exportAsEncryptedJSON(payload: ExportPayload): Promise<{ blob: Blob; keyHex: string }> {
    const jsonString = JSON.stringify(payload, null, 2);
    const key = await generateKey();
    const { iv, ciphertext, keyHex } = await encryptPayload(jsonString, key);

    const encryptedPayload = {
        format: 'anamnese-encrypted-v1',
        algorithm: 'AES-256-GCM',
        iv,
        data: ciphertext,
        exportedAt: payload.exportedAt,
        sessionId: payload.sessionId,
    };

    const blob = new Blob([JSON.stringify(encryptedPayload, null, 2)], { type: 'application/json' });
    return { blob, keyHex };
}

/**
 * Export session data as plain JSON (unencrypted)
 */
export function exportAsJSON(payload: ExportPayload): Blob {
    return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

/**
 * Export session data as a printable HTML document (pseudo-PDF)
 * Uses window.print() for actual PDF generation via browser
 */
export function exportAsPrintableHTML(payload: ExportPayload): string {
    const rows = payload.answers.map(a => `
        <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;color:#666">${escapeHtml(a.section)}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px">${escapeHtml(a.questionText)}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;font-weight:600">${escapeHtml(a.value)}</td>
        </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Anamnese-Export – ${payload.sessionId}</title>
    <style>
        @media print { body { -webkit-print-color-adjust: exact; } }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; }
        h1 { font-size: 22px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
        .meta { display: flex; gap: 32px; margin: 16px 0 24px; font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 10px 8px; background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; }
        .triage { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .triage-green { background: #d1fae5; color: #065f46; }
        .triage-yellow { background: #fef3c7; color: #92400e; }
        .triage-red { background: #fee2e2; color: #991b1b; }
    </style>
</head>
<body>
    <h1>Anamnese-Bericht</h1>
    <div class="meta">
        <span><strong>Session:</strong> ${escapeHtml(payload.sessionId.slice(0, 8))}…</span>
        <span><strong>Datum:</strong> ${new Date(payload.exportedAt).toLocaleDateString('de-DE')}</span>
        ${payload.patientName ? `<span><strong>Patient:</strong> ${escapeHtml(payload.patientName)}</span>` : ''}
        ${payload.triageLevel ? `<span class="triage triage-${payload.triageLevel}">${payload.triageLevel.toUpperCase()}</span>` : ''}
    </div>
    <table>
        <thead><tr><th>Bereich</th><th>Frage</th><th>Antwort</th></tr></thead>
        <tbody>${rows}</tbody>
    </table>
    <div class="footer">
        <p>Automatisch generiert am ${new Date().toLocaleString(typeof document !== 'undefined' ? document.documentElement.lang || 'de' : 'de')} · Verschlüsselt gespeichert (AES-256-GCM) · DSGVO-konform</p>
        <p>Anamnese-App v${payload.metadata.version}</p>
    </div>
</body>
</html>`;
}

/**
 * Trigger browser download of a Blob
 */
export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }, 100);
}

/**
 * Open printable HTML in a new window for PDF export via browser print dialog
 */
export function openPrintableExport(payload: ExportPayload) {
    const html = exportAsPrintableHTML(payload);
    const win = window.open('', '_blank');
    if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 500);
    }
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
