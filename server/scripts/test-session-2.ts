import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const sessions = await prisma.patientSession.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    console.log('--- Letzte 5 Sessions in DB ---');
    for (const s of sessions) {
        console.log(`ID: ${s.id} | Status: ${s.status} | Service: ${s.selectedService} | Name: ${s.encryptedName ? 'YES' : 'NO'}`);
    }
}

main().finally(() => prisma.$disconnect());
