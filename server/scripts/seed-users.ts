import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { config } from '../config';

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash(config.arztDefaultPassword, 10);

    // Arzt User
    await prisma.arztUser.upsert({
        where: { username: 'admin' },
        update: { role: 'ARZT', passwordHash },
        create: {
            username: 'admin',
            passwordHash,
            displayName: 'Dr. Schmidt',
            role: 'ARZT',
        },
    });

    // MFA User
    await prisma.arztUser.upsert({
        where: { username: 'mfa' },
        update: { role: 'MFA', passwordHash },
        create: {
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
