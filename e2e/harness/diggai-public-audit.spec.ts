/**
 * Browser Harness — Public-Site-Audit
 *
 * Jeder Audit-Finding (F-XX) aus memory/audits/diggai-de-2026-05-04.md
 * wird hier zu einem Test. Pass = behoben, Fail = noch offen.
 *
 * Run:
 *   PLAYWRIGHT_BASE_URL=https://diggai.de npx playwright test e2e/harness/diggai-public-audit.spec.ts
 *
 * Tags:
 *   @dsgvo  → DSGVO/Privacy-relevante Tests
 *   @seo    → SEO-relevante Tests
 *   @pwa    → PWA/Manifest-Tests
 */

import { test, expect, request } from '@playwright/test';

const TARGET = process.env.PLAYWRIGHT_BASE_URL || 'https://diggai.de';

test.describe('DiggAi Public-Site Harness', () => {
    test('F-01 @dsgvo — API subdomain Cert ist gültig', async () => {
        // Indirekt prüfbar: Frontend macht preconnect → Browser stuft als kritisch ein
        const html = await (await request.newContext()).get(TARGET);
        const body = await html.text();
        // Heuristik: index.html darf NICHT api-takios.diggai.de mehr enthalten
        // (das war die kaputte Subdomain)
        expect(body, 'index.html sollte NICHT mehr auf api-takios.diggai.de preconnecten').not.toContain('api-takios.diggai.de');
    });

    test('F-02 @dsgvo — Keine Google-Fonts mehr', async ({ page }) => {
        const requests: string[] = [];
        page.on('request', req => requests.push(req.url()));
        await page.goto(TARGET, { waitUntil: 'networkidle' });

        const googleFontReqs = requests.filter(u =>
            u.includes('fonts.googleapis.com') || u.includes('fonts.gstatic.com')
        );
        expect(googleFontReqs, `Es gab ${googleFontReqs.length} Google-Fonts-Requests: ${googleFontReqs.join(', ')}`).toHaveLength(0);
    });

    test('F-03 @seo — og:url zeigt auf diggai.de', async ({ page }) => {
        await page.goto(TARGET);
        const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
        expect(ogUrl).toBe('https://diggai.de');
    });

    test('F-04 @seo — favicon ist nicht der Vite-Default', async ({ page }) => {
        await page.goto(TARGET);
        const iconHref = await page.locator('link[rel="icon"]').first().getAttribute('href');
        expect(iconHref, 'favicon sollte NICHT /vite.svg sein').not.toBe('/vite.svg');
    });

    test('F-05 @seo — <title> ist nicht generisch', async ({ page }) => {
        await page.goto(TARGET);
        const title = await page.title();
        expect(title).not.toBe('Anamnese-Fragebogen');
        expect(title).toMatch(/DiggAi/i);
    });

    test('F-06 @seo — robots.txt hat Content-Type text/plain', async () => {
        const ctx = await request.newContext();
        const res = await ctx.get(`${TARGET}/robots.txt`);
        expect(res.status()).toBe(200);
        const ct = res.headers()['content-type'] || '';
        expect(ct, `robots.txt liefert Content-Type "${ct}" — sollte text/plain sein`).toMatch(/text\/plain/);
        const body = await res.text();
        expect(body).toContain('Sitemap:');
    });

    test('F-06 @seo — sitemap.xml hat Content-Type application/xml', async () => {
        const ctx = await request.newContext();
        const res = await ctx.get(`${TARGET}/sitemap.xml`);
        expect(res.status()).toBe(200);
        const ct = res.headers()['content-type'] || '';
        expect(ct).toMatch(/xml/);
        const body = await res.text();
        expect(body).toContain('<urlset');
    });

    test('F-07 @seo — og:image existiert', async ({ page }) => {
        await page.goto(TARGET);
        const ogImg = await page.locator('meta[property="og:image"]').getAttribute('content');
        expect(ogImg).toMatch(/^https:\/\//);
    });

    test('F-08 @pwa — theme-color ist nicht Tailwind-Default', async ({ page }) => {
        await page.goto(TARGET);
        const tc = await page.locator('meta[name="theme-color"]').getAttribute('content');
        expect(tc?.toLowerCase(), `theme-color "${tc}" ist Tailwind blue-500 (#3b82f6) — sollte Brand-Hex sein`).not.toBe('#3b82f6');
    });

    test('F-09 @pwa — manifest.orientation ist not portrait-primary', async () => {
        const ctx = await request.newContext();
        const res = await ctx.get(`${TARGET}/manifest.json`);
        expect(res.status()).toBe(200);
        const manifest = await res.json();
        expect(manifest.orientation, 'orientation portrait-primary erzwingt Mobile-Drehung — sollte "any" sein').not.toBe('portrait-primary');
    });

    test('SEC — Wichtige Security-Header gesetzt', async () => {
        const ctx = await request.newContext();
        const res = await ctx.get(TARGET);
        const h = res.headers();
        expect(h['strict-transport-security']).toBeTruthy();
        expect(h['x-frame-options']?.toUpperCase()).toBe('DENY');
        expect(h['x-content-type-options']).toBe('nosniff');
        expect(h['content-security-policy']).toBeTruthy();
        expect(h['content-security-policy'], 'CSP sollte fonts.googleapis.com NICHT mehr enthalten').not.toContain('fonts.googleapis.com');
    });
});
