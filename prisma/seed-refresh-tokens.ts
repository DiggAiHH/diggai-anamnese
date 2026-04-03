/**
 * Seed-Daten für Refresh Token Testing
 * DiggAI Anamnese Platform v3.0.0
 *
 * Verwendung:
 *   npx tsx prisma/seed-refresh-tokens.ts
 *
 * HINWEIS: Nur für Development/Testing verwenden!
 */

import { PrismaClient, UserType } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Erstellt einen SHA-256 Hash eines Strings
 */
function sha256Hash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Generiert einen zufälligen Refresh Token
 */
function generateRandomToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Maskiert einen Token für Logging (nur ersten/letzten Teil anzeigen)
 */
function maskToken(token: string): string {
  if (token.length <= 20) return '***';
  return `${token.slice(0, 8)}...${token.slice(-8)}`;
}

async function seedRefreshTokens() {
  console.log('🔄 Erstelle RefreshToken Test-Daten...\n');

  try {
    // 1. Test-Token für einen Arzt (ARZT UserType)
    const arztToken = generateRandomToken();
    const arztTokenHash = sha256Hash(arztToken);
    const arztTokenFamily = crypto.randomUUID();

    const arztRefreshToken = await prisma.refreshToken.create({
      data: {
        tokenFamily: arztTokenFamily,
        tokenHash: arztTokenHash,
        userId: 'test-arzt-id',
        userType: UserType.ARZT,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Tage
        ipHash: sha256Hash('127.0.0.1').substring(0, 32),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    console.log('✅ Arzt RefreshToken erstellt:');
    console.log(`   ID: ${arztRefreshToken.id}`);
    console.log(`   Token (Original): ${maskToken(arztToken)}`);
    console.log(`   Token Hash: ${arztTokenHash.slice(0, 16)}...`);
    console.log(`   UserType: ${arztRefreshToken.userType}`);
    console.log(`   Expires: ${arztRefreshToken.expiresAt.toISOString()}\n`);

    // 2. Test-Token für einen Patienten (PATIENT UserType)
    const patientToken = generateRandomToken();
    const patientTokenHash = sha256Hash(patientToken);
    const patientTokenFamily = crypto.randomUUID();

    const patientRefreshToken = await prisma.refreshToken.create({
      data: {
        tokenFamily: patientTokenFamily,
        tokenHash: patientTokenHash,
        userId: 'test-patient-id',
        userType: UserType.PATIENT,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Tage
        ipHash: sha256Hash('192.168.1.100').substring(0, 32),
        userAgent: 'DiggAI-Mobile-App/1.0.0 (iPhone; iOS 17.0)',
      },
    });

    console.log('✅ Patient RefreshToken erstellt:');
    console.log(`   ID: ${patientRefreshToken.id}`);
    console.log(`   Token (Original): ${maskToken(patientToken)}`);
    console.log(`   Token Hash: ${patientTokenHash.slice(0, 16)}...`);
    console.log(`   UserType: ${patientRefreshToken.userType}`);
    console.log(`   Expires: ${patientRefreshToken.expiresAt.toISOString()}\n`);

    // 3. Beispiel für ein rotiertes Token (Token Rotation Chain)
    const originalToken = generateRandomToken();
    const originalTokenHash = sha256Hash(originalToken);
    const rotationFamily = crypto.randomUUID();

    const originalRefreshToken = await prisma.refreshToken.create({
      data: {
        tokenFamily: rotationFamily,
        tokenHash: originalTokenHash,
        userId: 'test-rotation-user',
        userType: UserType.ARZT,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'TOKEN_ROTATION',
        rotatedAt: new Date(),
        ipHash: sha256Hash('10.0.0.1').substring(0, 32),
      },
    });

    console.log('✅ Rotiertes (revoked) RefreshToken erstellt:');
    console.log(`   ID: ${originalRefreshToken.id}`);
    console.log(`   Status: Revoked (Rotated)`);
    console.log(`   Token Family: ${rotationFamily.slice(0, 16)}...\n`);

    // 4. Test-Device mit Trusted Status
    const testDevice = await prisma.patientDevice.create({
      data: {
        accountId: 'test-patient-account-id',
        deviceName: 'iPhone 15 Pro',
        deviceType: 'ios',
        fingerprintHash: sha256Hash('device-fingerprint-abc123'),
        isTrusted: true,
        trustedAt: new Date(),
        userAgent: 'DiggAI-Mobile-App/1.0.0 (iPhone; iOS 17.0)',
      },
    });

    console.log('✅ Trusted Device erstellt:');
    console.log(`   ID: ${testDevice.id}`);
    console.log(`   Device: ${testDevice.deviceName}`);
    console.log(`   Trusted: ${testDevice.isTrusted}`);
    console.log(`   TrustedAt: ${testDevice.trustedAt?.toISOString()}\n`);

    // 5. Token mit Device-Verknüpfung
    const deviceToken = generateRandomToken();
    const deviceTokenHash = sha256Hash(deviceToken);

    const linkedToken = await prisma.refreshToken.create({
      data: {
        tokenFamily: crypto.randomUUID(),
        tokenHash: deviceTokenHash,
        userId: 'test-patient-device-user',
        userType: UserType.PATIENT,
        deviceId: testDevice.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipHash: sha256Hash('172.16.0.5').substring(0, 32),
        userAgent: 'DiggAI-Mobile-App/1.0.0 (iPhone; iOS 17.0)',
      },
    });

    console.log('✅ Device-linked RefreshToken erstellt:');
    console.log(`   ID: ${linkedToken.id}`);
    console.log(`   Device ID: ${linkedToken.deviceId}`);
    console.log(`   Token Family: ${linkedToken.tokenFamily.slice(0, 16)}...\n`);

    // Zusammenfassung
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Seed-Daten Zusammenfassung:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const tokenCount = await prisma.refreshToken.count();
    const deviceCount = await prisma.patientDevice.count();
    const revokedCount = await prisma.refreshToken.count({ where: { isRevoked: true } });

    console.log(`   Total RefreshTokens: ${tokenCount}`);
    console.log(`   Revoked Tokens: ${revokedCount}`);
    console.log(`   Patient Devices: ${deviceCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✨ Seed erfolgreich abgeschlossen!');
    console.log('\n⚠️  WICHTIG: Speichere die Original-Token für Testing:');
    console.log(`   Arzt Token: ${arztToken.slice(0, 20)}...`);
    console.log(`   Patient Token: ${patientToken.slice(0, 20)}...`);

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Seed-Daten:', error);
    process.exit(1);
  }
}

// Cleanup Funktion für wiederholtes Ausführen
async function cleanup() {
  console.log('🧹 Bereinige vorherige Test-Daten...\n');

  await prisma.refreshToken.deleteMany({
    where: {
      userId: {
        in: ['test-arzt-id', 'test-patient-id', 'test-rotation-user', 'test-patient-device-user'],
      },
    },
  });

  await prisma.patientDevice.deleteMany({
    where: {
      accountId: 'test-patient-account-id',
    },
  });

  console.log('✅ Cleanup abgeschlossen\n');
}

// Hauptausführung
async function main() {
  await cleanup();
  await seedRefreshTokens();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
