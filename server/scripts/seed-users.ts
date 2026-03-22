import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { config } from '../config';

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash(config.arztDefaultPassword, 10);

    // Ensure default tenant exists
    const tenant = await prisma.tenant.upsert({
        where: { subdomain: 'default' },
        update: {},
        create: { subdomain: 'default', name: 'Default Praxis' },
    });

    // Arzt User
    await prisma.arztUser.upsert({
        where: { tenantId_username: { tenantId: tenant.id, username: 'admin' } },
        update: { role: 'ARZT', passwordHash },
        create: {
            tenantId: tenant.id,
            username: 'admin',
            passwordHash,
            displayName: 'Dr. Schmidt',
            role: 'ARZT',
        },
    });

    // MFA User
    await prisma.arztUser.upsert({
        where: { tenantId_username: { tenantId: tenant.id, username: 'mfa' } },
        update: { role: 'MFA', passwordHash },
        create: {
            tenantId: tenant.id,
            username: 'mfa',
            passwordHash,
            displayName: 'MFA Team',
            role: 'MFA',
        },
    });

    console.log('Seed abgeschlossen: User "admin" (Arzt) und "mfa" (MFA) erstellt.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
