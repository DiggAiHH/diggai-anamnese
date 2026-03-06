/**
 * Seed: Permissions — 22 predefined permissions + default role assignments
 * Run via: npx tsx prisma/seed-permissions.ts
 * Or imported from prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PermissionDef {
    code: string;
    name: string;
    description: string;
    category: string;
    defaultAdmin: boolean;
    defaultArzt: boolean;
    defaultMfa: boolean;
}

const PERMISSIONS: PermissionDef[] = [
    // patients
    { code: 'patients.view', name: 'Patienten ansehen', description: 'Zugriff auf Patientenliste und Detailansicht', category: 'patients', defaultAdmin: true, defaultArzt: true, defaultMfa: true },
    { code: 'patients.edit', name: 'Patienten bearbeiten', description: 'Patientendaten ändern', category: 'patients', defaultAdmin: true, defaultArzt: true, defaultMfa: false },
    { code: 'patients.delete', name: 'Patienten löschen', description: 'Patienten endgültig entfernen', category: 'patients', defaultAdmin: true, defaultArzt: false, defaultMfa: false },
    // sessions
    { code: 'sessions.view', name: 'Sitzungen ansehen', description: 'Zugriff auf Sitzungsliste', category: 'sessions', defaultAdmin: true, defaultArzt: true, defaultMfa: true },
    { code: 'sessions.manage', name: 'Sitzungen verwalten', description: 'Sitzungen zuweisen und Status ändern', category: 'sessions', defaultAdmin: true, defaultArzt: true, defaultMfa: true },
    // queue
    { code: 'queue.view', name: 'Warteschlange ansehen', description: 'Warteschlange einsehen', category: 'queue', defaultAdmin: true, defaultArzt: true, defaultMfa: true },
    { code: 'queue.manage', name: 'Patienten aufrufen', description: 'Patienten in Warteschlange aufrufen/verwalten', category: 'queue', defaultAdmin: true, defaultArzt: true, defaultMfa: true },
    // triage
    { code: 'triage.view', name: 'Triage-Alerts ansehen', description: 'Anzeige von Triage-Warnungen', category: 'triage', defaultAdmin: true, defaultArzt: true, defaultMfa: true },
    { code: 'triage.acknowledge', name: 'Triage bestätigen', description: 'Triage-Alerts als gelesen markieren', category: 'triage', defaultAdmin: true, defaultArzt: true, defaultMfa: false },
    // chat
    { code: 'chat.patient', name: 'Mit Patienten chatten', description: 'Chat-Nachrichten an Patienten senden', category: 'chat', defaultAdmin: true, defaultArzt: true, defaultMfa: true },
    { code: 'chat.staff', name: 'Team-Chat', description: 'Interner Team-Chat', category: 'chat', defaultAdmin: true, defaultArzt: true, defaultMfa: true },
    // export
    { code: 'export.pdf', name: 'PDF exportieren', description: 'Sitzungen als PDF exportieren', category: 'export', defaultAdmin: true, defaultArzt: true, defaultMfa: true },
    { code: 'export.csv', name: 'CSV exportieren', description: 'Daten als CSV exportieren', category: 'export', defaultAdmin: true, defaultArzt: true, defaultMfa: false },
    { code: 'export.json', name: 'JSON exportieren', description: 'Rohdaten als JSON exportieren', category: 'export', defaultAdmin: true, defaultArzt: false, defaultMfa: false },
    // atoms
    { code: 'atoms.view', name: 'Fragebogen ansehen', description: 'Fragenkatalog einsehen', category: 'atoms', defaultAdmin: true, defaultArzt: true, defaultMfa: false },
    { code: 'atoms.edit', name: 'Fragebogen bearbeiten', description: 'Fragen erstellen/ändern/sortieren', category: 'atoms', defaultAdmin: true, defaultArzt: false, defaultMfa: false },
    // admin
    { code: 'admin.users', name: 'Benutzer verwalten', description: 'Mitarbeiter erstellen und bearbeiten', category: 'admin', defaultAdmin: true, defaultArzt: false, defaultMfa: false },
    { code: 'admin.content', name: 'Inhalte verwalten', description: 'Wartezeit-Content und Praxis-News verwalten', category: 'admin', defaultAdmin: true, defaultArzt: false, defaultMfa: false },
    { code: 'admin.audit', name: 'Audit-Log einsehen', description: 'Audit-Trail aller Aktionen', category: 'admin', defaultAdmin: true, defaultArzt: false, defaultMfa: false },
    { code: 'admin.roi', name: 'ROI-Dashboard', description: 'Wirtschaftlichkeitsanalyse einsehen', category: 'admin', defaultAdmin: true, defaultArzt: false, defaultMfa: false },
    { code: 'admin.wunschbox', name: 'Wunschbox verwalten', description: 'Feature-Requests bearbeiten', category: 'admin', defaultAdmin: true, defaultArzt: false, defaultMfa: false },
    { code: 'admin.settings', name: 'Systemeinstellungen', description: 'Systemkonfiguration ändern', category: 'admin', defaultAdmin: true, defaultArzt: false, defaultMfa: false },
    // nfc
    { code: 'nfc.manage', name: 'NFC verwalten', description: 'NFC-Tags lesen und beschreiben', category: 'nfc', defaultAdmin: true, defaultArzt: false, defaultMfa: true },
    // flow
    { code: 'flow.manage', name: 'Workflow verwalten', description: 'Praxis-Workflows erstellen und ändern', category: 'flow', defaultAdmin: true, defaultArzt: false, defaultMfa: false },
    { code: 'flow.override', name: 'Workflow überschreiben', description: 'Laufende Workflows manuell übersteuern', category: 'flow', defaultAdmin: true, defaultArzt: true, defaultMfa: false },
    // chat (extended)
    { code: 'chat.broadcast', name: 'Broadcast-Nachricht senden', description: 'Nachrichten an alle Wartenden senden', category: 'chat', defaultAdmin: true, defaultArzt: false, defaultMfa: false },
    // feedback
    { code: 'feedback.review', name: 'Feedback einsehen', description: 'Patientenfeedback und Bewertungen ansehen', category: 'feedback', defaultAdmin: true, defaultArzt: true, defaultMfa: false },
    { code: 'feedback.escalate', name: 'Feedback eskalieren', description: 'Kritisches Feedback weiterleiten', category: 'feedback', defaultAdmin: true, defaultArzt: false, defaultMfa: false },
    // payment
    { code: 'payment.manage', name: 'Zahlungen verwalten', description: 'Abrechnungen und Zahlungsvorgänge verwalten', category: 'payment', defaultAdmin: true, defaultArzt: false, defaultMfa: false },
    // avatar
    { code: 'avatar.manage', name: 'Avatar verwalten', description: 'KI-Avatar-Einstellungen konfigurieren', category: 'avatar', defaultAdmin: true, defaultArzt: false, defaultMfa: false },
    // telemedicine
    { code: 'telemedicine.manage', name: 'Telemedizin verwalten', description: 'Videosprechstunden und Telemedizin-Funktionen verwalten', category: 'telemedicine', defaultAdmin: true, defaultArzt: true, defaultMfa: false },
    // forms
    { code: 'forms.ai.generate', name: 'KI-Formulare generieren', description: 'Fragebögen per KI automatisch erstellen', category: 'forms', defaultAdmin: true, defaultArzt: false, defaultMfa: false },
    // epa
    { code: 'private_epa.manage', name: 'Private ePA verwalten', description: 'Zugriff auf private elektronische Patientenakte', category: 'epa', defaultAdmin: true, defaultArzt: true, defaultMfa: false },
    // export (extended)
    { code: 'export.anonymized', name: 'Anonymisiert exportieren', description: 'Patientendaten anonymisiert für Forschung exportieren', category: 'export', defaultAdmin: true, defaultArzt: false, defaultMfa: false },
];

export async function seedPermissions() {
    console.log('[Seed] Seeding Permissions...');

    // Upsert all permissions
    for (const perm of PERMISSIONS) {
        await prisma.permission.upsert({
            where: { code: perm.code },
            create: {
                code: perm.code,
                name: perm.name,
                description: perm.description,
                category: perm.category,
            },
            update: {
                name: perm.name,
                description: perm.description,
                category: perm.category,
            },
        });
    }
    console.log(`[Seed] Upserted ${PERMISSIONS.length} Permissions.`);

    // Assign default role permissions
    const allPermissions = await prisma.permission.findMany();
    const permMap = new Map(allPermissions.map(p => [p.code, p.id]));

    const roleAssignments: { role: string; permissionId: string }[] = [];

    for (const perm of PERMISSIONS) {
        const permId = permMap.get(perm.code);
        if (!permId) continue;

        if (perm.defaultAdmin) roleAssignments.push({ role: 'ADMIN', permissionId: permId });
        if (perm.defaultArzt) roleAssignments.push({ role: 'ARZT', permissionId: permId });
        if (perm.defaultMfa) roleAssignments.push({ role: 'MFA', permissionId: permId });
    }

    // Delete existing role permissions and re-create
    await prisma.rolePermission.deleteMany();
    for (const assignment of roleAssignments) {
        await prisma.rolePermission.create({
            data: {
                role: assignment.role,
                permissionId: assignment.permissionId,
            },
        });
    }

    console.log(`[Seed] Created ${roleAssignments.length} RolePermission assignments.`);
    return roleAssignments.length;
}

// Run standalone
if (require.main === module) {
    seedPermissions()
        .then(() => prisma.$disconnect())
        .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
}
