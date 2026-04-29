/**
 * Tenant Seeder
 * Creates default tenant and migrates existing data
 */

import { PrismaClient } from '@prisma/client';

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
