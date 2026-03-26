# BSI TR-02102-1 / TR-03161 Compliance
## DiggAI Anamnese Platform v3.0.0

**Stand:** März 2026 | **Version:** 3.0-FINAL | **Status:** ✅ ZERTIFIZIERUNGSBEREIT

---

## Compliance-Übersicht

| Anforderung | Status | Implementierung | Nachweis |
|-------------|--------|-----------------|----------|
| TLS 1.2+ | ✅ | Production Setup | `docker/nginx.conf` |
| TLS 1.3 | ✅ | Preferred | `docker/nginx.conf` |
| AES-256 | ✅ | GCM Mode | `server/services/encryption.ts` |
| Schlüssellänge 256-bit | ✅ | 32 Bytes | `server/services/encryption.ts` |
| HSTS | ✅ | 1 Jahr, preload | `docker/nginx.conf` |
| Zufallszahlen | ✅ | `crypto.randomBytes()` | `server/services/encryption.ts` |
| PFS | ✅ | ECDHE | `docker/nginx.conf` |
| Starke Cipher Suites | ✅ | BSI-recommended | `docker/nginx.conf` |

---

## Cipher Suites (nach Priorität)

```nginx
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
```

| Cipher Suite | Schlüsselaustausch | Authentifizierung | Verschlüsselung | Hash |
|--------------|-------------------|-------------------|-----------------|------|
| ECDHE-ECDSA-AES128-GCM-SHA256 | ECDHE | ECDSA | AES-128-GCM | SHA256 |
| ECDHE-RSA-AES128-GCM-SHA256 | ECDHE | RSA | AES-128-GCM | SHA256 |
| ECDHE-ECDSA-AES256-GCM-SHA384 | ECDHE | ECDSA | AES-256-GCM | SHA384 |
| ECDHE-RSA-AES256-GCM-SHA384 | ECDHE | RSA | AES-256-GCM | SHA384 |

---

## BSI TR-03161 - eIDAS-Konformität

| Algorithmus | Verwendung | eIDAS-Level | Status |
|-------------|------------|-------------|--------|
| AES-256-GCM | Datenverschlüsselung | High | ✅ |
| SHA-256 | Hashing, Pseudonymisierung | High | ✅ |
| HMAC-SHA256 | JWT-Signatur | High | ✅ |
| ECDHE | Schlüsselaustausch (TLS) | High | ✅ |
| RSA-2048+ | TLS-Authentifizierung | High | ✅ |
| ECDSA | TLS-Authentifizierung | High | ✅ |

---

## HTTP-Sicherheitsheader (BSI Empfohlen)

| Header | Wert | Zweck | Status |
|--------|------|-------|--------|
| Strict-Transport-Security | `max-age=31536000; includeSubDomains; preload` | HSTS | ✅ |
| X-Frame-Options | `DENY` | Clickjacking-Schutz | ✅ |
| X-Content-Type-Options | `nosniff` | MIME-Type Enforcement | ✅ |
| Referrer-Policy | `strict-origin-when-cross-origin` | Referrer-Kontrolle | ✅ |
| Content-Security-Policy | `default-src 'self'` | XSS-Schutz | ✅ |
| Cross-Origin-Embedder-Policy | `require-corp` | Spectre-Schutz | ✅ |
| Cross-Origin-Opener-Policy | `same-origin` | XS-Leak-Schutz | ✅ |
| Cross-Origin-Resource-Policy | `cross-origin` | Ressourcenkontrolle | ✅ |

---

## IT-Grundschutz-Bausteine

| Baustein | Titel | Umsetzung | Status |
|----------|-------|-----------|--------|
| APP.1.1 | Allgemeine Anwendungen | Webanwendungssicherheit | ✅ |
| APP.3.1 | Webanwendungen | Input-Validierung, Auth | ✅ |
| APP.3.3 | Webserver | Nginx-Härtung | ✅ |
| CON.1 | Kryptokonzept | AES-256-GCM, TLS 1.3 | ✅ |
| IND.2.1 | Sicherheitsgateways | Nginx Reverse Proxy | ✅ |
| NET.1.1 | Netzwerk-Architektur | LAN-Only TI/System Routes | ✅ |
| OPS.1.1.3 | Patchmanagement | Automatisiert | ✅ |
| OPS.1.1.4 | Änderungsmanagement | Git-basiert | ✅ |
| SYS.1.3 | Server unter Linux | Docker-Container | ✅ |

---

## Sign-off

| Rolle | Name | Datum | Unterschrift |
|-------|------|-------|--------------|
| Informationssicherheitsbeauftragter | | | |
| Technische Leitung | | | |
| Datenschutzbeauftragter | | | |

---

**Dokument-Version:** 3.0-FINAL  
**Erstellt:** März 2026  
**Nächste Überprüfung:** März 2027  
**BSI-Compliance Status:** ✅ ZERTIFIZIERUNGSBEREIT
