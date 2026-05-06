#!/usr/bin/env node
/**
 * generate-vapid-keys.cjs — VAPID-Schlüsselpaar für Push-Notifications generieren
 *
 * Anker: Open-Items-Tracker H2 ("VAPID-Keys für Push-Notifications")
 *
 * Was tut das Skript:
 *   Erzeugt ein neues VAPID-Schlüsselpaar (Voluntary Application Server Identification)
 *   für Web-Push-Notifications gemäß RFC 8292. Die Schlüssel werden NUR auf STDOUT
 *   ausgegeben — niemals in eine Datei geschrieben — damit das Verschlüsselungs-Material
 *   nicht versehentlich committed wird.
 *
 * Verwendung:
 *   node scripts/generate-vapid-keys.cjs
 *
 * Erzeugt:
 *   - VAPID_PUBLIC_KEY  (base64url, ~88 Zeichen) — wird im Frontend exposed
 *   - VAPID_PRIVATE_KEY (base64url, ~44 Zeichen) — bleibt geheim, nur Backend
 *   - VAPID_SUBJECT     (mailto:DiggAIPrakt@gmail.com — Pflicht nach RFC)
 *
 * Folge-Schritte (manuell durch CK):
 *   1) Output dieses Skripts in einen sicheren Vault speichern (1Password, Keepass)
 *   2) Fly-Secrets setzen:
 *        flyctl secrets set --app diggai-api \
 *          VAPID_PUBLIC_KEY=BCxxx... \
 *          VAPID_PRIVATE_KEY=xxx... \
 *          VAPID_SUBJECT=mailto:DiggAIPrakt@gmail.com
 *   3) Frontend-Build mit env.VITE_VAPID_PUBLIC_KEY=... auf Netlify
 *   4) Backend antwortet auf /api/push/subscribe mit gültigem Subscription-Endpoint
 *   5) Service-Worker registriert sich, push-Notifications sind aktiv
 *
 * Sicherheits-Hinweis:
 *   Wenn du den PRIVATE_KEY rotierst, müssen ALLE bestehenden Subscriptions ungültig
 *   gemacht werden (alte Endpoints bekommen 410 Gone). Plane eine Down-Notification
 *   ein, bevor du Schlüssel rotierst.
 */

'use strict';

let webpush;
try {
    webpush = require('web-push');
} catch {
    console.error('FEHLER: web-push-Modul nicht gefunden.');
    console.error('Da es bereits in package.json (dependencies) steht, sollte es installiert sein.');
    console.error('Lösung: npm install');
    process.exit(2);
}

const keys = webpush.generateVAPIDKeys();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  DiggAi VAPID-Schlüsselpaar (RFC 8292)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('  Generiert:    ' + new Date().toISOString());
console.log('  Algorithmus:  ECDSA über P-256 Kurve');
console.log('');
console.log('  ── Werte ──');
console.log('');
console.log(`  VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`  VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`  VAPID_SUBJECT=mailto:DiggAIPrakt@gmail.com`);
console.log('');
console.log('  ── Befehle für Fly-Secret-Setup ──');
console.log('');
console.log('  flyctl secrets set --app diggai-api \\');
console.log(`    VAPID_PUBLIC_KEY=${keys.publicKey} \\`);
console.log(`    VAPID_PRIVATE_KEY=${keys.privateKey} \\`);
console.log(`    VAPID_SUBJECT=mailto:DiggAIPrakt@gmail.com`);
console.log('');
console.log('  ── Befehl für Netlify-Env-Setup ──');
console.log('');
console.log(`  netlify env:set VITE_VAPID_PUBLIC_KEY ${keys.publicKey} --context production`);
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  WICHTIG: Diese Werte NICHT committen.');
console.log('  Sicher in Password-Manager speichern + Fly/Netlify-Secrets setzen.');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
