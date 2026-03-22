import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starte Seeding von Beispieldaten...');

    // Ensure default tenant exists
    const tenant = await prisma.tenant.upsert({
        where: { subdomain: 'default' },
        update: {},
        create: { subdomain: 'default', name: 'Default Praxis' },
    });

    // 1. Suche Ärzte (sollten durch seed-users.ts schon da sein)
    const admin = await prisma.arztUser.findFirst({ where: { username: 'admin', tenantId: tenant.id } });

    if (!admin) {
        console.error('Fehler: Admin-User nicht gefunden. Bitte zuerst seed-users.ts ausführen.');
        return;
    }

    // 2. Erstelle eine Beispiel-Patientin
    const patient = await prisma.patient.upsert({
        where: { tenantId_hashedEmail: { tenantId: tenant.id, hashedEmail: 'patient-1-hash' } },
        update: {},
        create: {
            tenantId: tenant.id,
            hashedEmail: 'patient-1-hash',
        }
    });

    // 3. Erstelle eine abgeschlossene Session
    const session1 = await prisma.patientSession.create({
        data: {
            tenantId: tenant.id,
            patientId: patient.id,
            status: 'COMPLETED',
            selectedService: 'TERMIN',
            gender: 'W',
            birthDate: new Date('1990-05-15'),
            insuranceType: 'GKV',
            isNewPatient: false,
            completedAt: new Date(),
            assignedArztId: admin.id,
        }
    });

    // 4. Erstelle eine aktive Session mit Red Flag
    const session2 = await prisma.patientSession.create({
        data: {
            tenantId: tenant.id,
            patientId: patient.id,
            status: 'ACTIVE',
            selectedService: 'NOTFALL',
            gender: 'M',
            birthDate: new Date('1985-10-20'),
            insuranceType: 'PKV',
            isNewPatient: true,
        }
    });

    await prisma.triageEvent.create({
        data: {
            sessionId: session2.id,
            level: 'CRITICAL',
            atomId: 'RES-100',
            triggerValues: JSON.stringify(['Atemnot']),
            message: 'Patient berichtet über akute Atemnot seit 2 Stunden.',
        }
    });

    // 5. Erstelle Chat-Historie für Session 2
    await prisma.chatMessage.createMany({
        data: [
            {
                sessionId: session2.id,
                senderType: 'PATIENT',
                fromName: 'Patient',
                text: 'Hallo, ich habe starke Schmerzen in der Brust.',
            },
            {
                sessionId: session2.id,
                senderType: 'ARZT',
                senderId: admin.id,
                fromName: 'Praxis-Team (Dr. Schmidt)',
                text: 'Guten Tag. Bitte atmen Sie ruhig. Wir sehen uns Ihre Angaben sofort an.',
            },
            {
                sessionId: session2.id,
                senderType: 'PATIENT',
                fromName: 'Patient',
                text: 'Vielen Dank, es wird schlimmer.',
            }
        ]
    });

    console.log('Seeding erfolgreich abgeschlossen.');
    console.log(`- 1 Abgeschlossene Session (${session1.id})`);
    console.log(`- 1 Aktive Session mit Red Flag (${session2.id})`);
    console.log('- Chat-Historie importiert');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
