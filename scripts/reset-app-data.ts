import { Prisma, PrismaClient } from '@prisma/client';

const RESET_CONFIRM_VALUE = 'DELETE_APP_DATA';
const BACKUP_ACK_VALUE = 'I_HAVE_A_BACKUP';
const CONSTRAINT_ERROR_CODES = new Set(['P2003', 'P2014']);

type ModelMeta = Prisma.DMMF.Model;

function normalizeName(value: string): string {
    return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function resolveDelegateKey(prisma: PrismaClient, modelName: string): string {
    const target = normalizeName(modelName);
    const candidate = Object.keys(prisma).find((key) => {
        const delegate = (prisma as Record<string, unknown>)[key];
        return typeof delegate === 'object' && delegate !== null && normalizeName(key) === target;
    });

    if (!candidate) {
        throw new Error(`Prisma delegate for model "${modelName}" was not found.`);
    }

    return candidate;
}

function getAppModels(): ModelMeta[] {
    return Prisma.dmmf.datamodel.models.filter((model) => !model.name.startsWith('_'));
}

function buildDeleteOrder(models: ModelMeta[]): string[] {
    const modelMap = new Map(models.map((model) => [model.name, model]));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const sorted: string[] = [];

    const visit = (modelName: string): void => {
        if (visited.has(modelName)) return;
        if (visiting.has(modelName)) return;

        visiting.add(modelName);

        const model = modelMap.get(modelName);
        const dependencies = model?.fields
            .filter((field) => field.kind === 'object' && field.relationFromFields?.length)
            .map((field) => field.type)
            .filter((dependency): dependency is string => typeof dependency === 'string' && modelMap.has(dependency) && dependency !== modelName) ?? [];

        for (const dependency of dependencies) {
            visit(dependency);
        }

        visiting.delete(modelName);
        visited.add(modelName);
        sorted.push(modelName);
    };

    for (const model of models) {
        visit(model.name);
    }

    return [...sorted].reverse();
}

async function deleteModelData(prisma: PrismaClient, modelName: string): Promise<number> {
    const delegateKey = resolveDelegateKey(prisma, modelName);
    const delegate = (prisma as Record<string, { deleteMany: () => Promise<{ count: number }> }>)[delegateKey];
    const result = await delegate.deleteMany();
    return result.count;
}

async function main(): Promise<void> {
    if (process.env.SUPABASE_RESET_CONFIRM !== RESET_CONFIRM_VALUE) {
        throw new Error(
            `Refusing to reset app data. Set SUPABASE_RESET_CONFIRM=${RESET_CONFIRM_VALUE} to continue.`
        );
    }

    if (process.env.SUPABASE_RESET_BACKUP_ACK !== BACKUP_ACK_VALUE) {
        throw new Error(
            `Backup acknowledgement missing. Set SUPABASE_RESET_BACKUP_ACK=${BACKUP_ACK_VALUE} after creating a snapshot.`
        );
    }

    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required.');
    }

    const prisma = new PrismaClient();

    try {
        const models = getAppModels();
        const pending = buildDeleteOrder(models);
        const deletedCounts = new Map<string, number>();

        while (pending.length) {
            const remaining: string[] = [];
            let progress = false;

            for (const modelName of pending) {
                try {
                    const count = await deleteModelData(prisma, modelName);
                    deletedCounts.set(modelName, count);
                    progress = true;
                } catch (error) {
                    if (error instanceof Prisma.PrismaClientKnownRequestError && CONSTRAINT_ERROR_CODES.has(error.code)) {
                        remaining.push(modelName);
                        continue;
                    }

                    throw error;
                }
            }

            if (!progress) {
                throw new Error(
                    `Could not resolve deletion order for models: ${remaining.join(', ')}. Check foreign-key cycles before retrying.`
                );
            }

            pending.splice(0, pending.length, ...remaining);
        }

        console.log('App data reset completed.');
        for (const modelName of buildDeleteOrder(models)) {
            if (!deletedCounts.has(modelName)) continue;
            console.log(`${modelName}: ${deletedCounts.get(modelName)}`);
        }
    } finally {
        await prisma.$disconnect();
    }
}

void main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
