/**
 * Tenant Seeder
 * Creates default tenant and migrates existing data
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding tenants...');

    // Check if default tenant exists
    const existingTenant = await prisma.tenant.findFirst({
        where: { subdomain: 'default' }
    });

    let defaultTenantId: string;

    if (!existingTenant) {
        console.log('Creating default tenant...');
        const defaultTenant = await prisma.tenant.create({
            data: {
                subdomain: 'default',
                name: 'Dr. Klapproth Praxis',
                legalName: 'Dr. med. Martin Klapproth',
                plan: 'ENTERPRISE',
                status: 'ACTIVE',
                visibility: 'PUBLIC',
                primaryColor: '#3b82f6',
                welcomeMessage: 'Willkommen in unserer Praxis',
                dsgvoAgreementSigned: true,
                dsgvoAgreementSignedAt: new Date(),
                maxUsers: 50,
                maxPatientsPerMonth: 10000,
                settings: {
                    features: {
                        nfc: true,
                        telemedicine: true,
                        pvs: true,
                        gamification: true,
                        showWaitingRoom: false,
                    },
                    defaults: {
                        language: 'de',
                        timezone: 'Europe/Berlin',
                    }
                }
            }
        });
        defaultTenantId = defaultTenant.id;
        console.log(`✅ Default tenant created: ${defaultTenantId}`);
    } else {
        defaultTenantId = existingTenant.id;
        console.log(`✅ Default tenant exists: ${defaultTenantId}`);
    }

    // Check if data needs migration
    const patientCount = await prisma.patient.count({
        where: { tenantId: { equals: '' } }
    });

    if (patientCount > 0) {
        console.log(`Migrating ${patientCount} patients to default tenant...`);
        
        await prisma.$transaction([
            prisma.patient.updateMany({
                where: { tenantId: { equals: '' } },
                data: { tenantId: defaultTenantId }
            }),
            prisma.patientSession.updateMany({
                where: { tenantId: { equals: '' } },
                data: { tenantId: defaultTenantId }
            }),
            prisma.arztUser.updateMany({
                where: { tenantId: { equals: '' } },
                data: { tenantId: defaultTenantId }
            }),
            prisma.auditLog.updateMany({
                where: { tenantId: { equals: '' } },
                data: { tenantId: defaultTenantId }
            }),
        ]);

        console.log('✅ Migration complete');
    } else {
        console.log('✅ No migration needed');
    }

    // Create demo tenants for testing
    const demoTenants = [
        { subdomain: 'demo-arzt', name: 'Demo Praxis Dr. Müller', plan: 'STARTER' },
        { subdomain: 'demo-klinik', name: 'Demo MVZ Berlin', plan: 'PROFESSIONAL' },
    ];

    for (const demo of demoTenants) {
        const exists = await prisma.tenant.findUnique({
            where: { subdomain: demo.subdomain }
        });

        if (!exists) {
            await prisma.tenant.create({
                data: {
                    subdomain: demo.subdomain,
                    name: demo.name,
                    plan: demo.plan as any,
                    status: 'ACTIVE',
                    visibility: 'DEMO',
                    dsgvoAgreementSigned: true,
                    dsgvoAgreementSignedAt: new Date(),
                }
            });
            console.log(`✅ Demo tenant created: ${demo.subdomain}`);
        }
    }

    // 2026-05-08 — Klaproth-Root-Tenant: Frontend hardcodet x-tenant-id: klaproth + bsnr=999999999.
    // Ohne diesen Tenant antwortet die Production-API auf alle Calls von diggai.de mit 404.
    const klaprothExisting = await prisma.tenant.findFirst({
        where: { OR: [{ subdomain: 'klaproth' }, { bsnr: '999999999' }] },
    });
    if (!klaprothExisting) {
        const klaproth = await prisma.tenant.create({
            data: {
                subdomain: 'klaproth',
                bsnr: '999999999',
                name: 'Praxis Dr. Klaproth',
                legalName: 'Dr. med. Martin Klapproth',
                plan: 'ENTERPRISE',
                status: 'ACTIVE',
                visibility: 'PUBLIC',
                primaryColor: '#3b82f6',
                welcomeMessage: 'Willkommen in unserer Praxis',
                dsgvoAgreementSigned: true,
                dsgvoAgreementSignedAt: new Date(),
                maxUsers: 50,
                maxPatientsPerMonth: 10000,
                settings: {
                    features: {
                        nfc: true,
                        telemedicine: true,
                        pvs: true,
                        gamification: true,
                        showWaitingRoom: false,
                    },
                    defaults: {
                        language: 'de',
                        timezone: 'Europe/Berlin',
                    },
                },
            },
        });
        console.log(`✅ Klaproth-Root-Tenant erstellt: id=${klaproth.id} subdomain=klaproth bsnr=999999999`);
    } else {
        // Idempotent: existing → ensure ACTIVE + PUBLIC + correct BSNR.
        await prisma.tenant.update({
            where: { id: klaprothExisting.id },
            data: { status: 'ACTIVE', visibility: 'PUBLIC', bsnr: '999999999', subdomain: 'klaproth' },
        });
        console.log(`✓ Klaproth-Root-Tenant existiert (id=${klaprothExisting.id}) — Status auf ACTIVE/PUBLIC bestätigt`);
    }

    // 2026-05-08 — ARZT-Default-User für Klaproth-Tenant. Damit kann CK sich einloggen
    // und die Praxis-Prozesse testen. Default-Passwort aus ENV oder Fallback "DiggAi2026!"
    // (sicheres Default; CK kann nach Erst-Login ändern).
    const klaprothTenant = await prisma.tenant.findFirst({ where: { subdomain: 'klaproth' } });
    if (klaprothTenant) {
        const arztUsername = 'admin';
        const arztPassword = process.env.ARZT_PASSWORD || 'DiggAi2026!';
        const passwordHash = bcrypt.hashSync(arztPassword, 10);

        const existingArzt = await prisma.arztUser.findFirst({
            where: { username: arztUsername, tenantId: klaprothTenant.id },
        });
        if (existingArzt) {
            await prisma.arztUser.update({
                where: { id: existingArzt.id },
                data: { passwordHash, isActive: true, role: 'ADMIN', failedLoginAttempts: 0, lockedUntil: null },
            });
            console.log(`✓ ARZT-User "${arztUsername}" existiert — Passwort + Status aktualisiert (Tenant=klaproth)`);
        } else {
            await prisma.arztUser.create({
                data: {
                    tenantId: klaprothTenant.id,
                    username: arztUsername,
                    passwordHash,
                    displayName: 'Dr. med. H. Klaproth',
                    role: 'ADMIN',
                    isActive: true,
                },
            });
            console.log(`✅ ARZT-User "${arztUsername}" erstellt (Tenant=klaproth, Role=ADMIN)`);
        }
        console.log(`   → Login auf https://diggai.de/arzt mit username="${arztUsername}" + Passwort aus env ARZT_PASSWORD (default: "DiggAi2026!")`);
    }

    console.log('🎉 Tenant seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
