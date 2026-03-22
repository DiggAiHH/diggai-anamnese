/**
 * Optimistic Updates Hook
 *
 * Eine erweiterte Version von useMutation, die sofortige UI-Updates mit
 * automatischem Rollback bei Fehlern ermöglicht.
 *
 * WICHTIG: Nur für nicht-kritische Operationen verwenden (keine Triage!)
 * Bei kritischen medizinischen Operationen: Normale useMutation verwenden
 *
 * @example
 * ```ts
 * const submitAnswer = useSubmitAnswer();
 * submitAnswer.mutate({ atomId: 'Q001', value: 'ja' });
 * // UI zeigt sofort Erfolg, Server-Request läuft im Hintergrund
 * // Bei Fehler: Automatischer Rollback + Error Message
 * ```
 */

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';

/**
 * Kontext für Rollback bei Fehlern
 */
interface OptimisticContext<TData> {
    /** Vorheriger Datenstand für Rollback */
    previousData: TData | undefined;
}

/**
 * Optionen für Optimistic Mutation
 */
interface OptimisticMutationOptions<TData, TVariables, TError = Error>
    extends Omit<UseMutationOptions<TData, TError, TVariables, OptimisticContext<TData>>, 'mutationFn' | 'onMutate' | 'onError' | 'onSettled'> {
    /** Die Mutations-Funktion, die den Server-Request ausführt */
    mutationFn: (variables: TVariables) => Promise<TData>;

    /** Query-Key für die zu aktualisierende Daten */
    queryKey: string[];

    /** Funktion für die optimistische Aktualisierung */
    optimisticUpdate: (oldData: TData | undefined, variables: TVariables) => TData;

    /** Bei Fehler automatisch Rollback durchführen (default: true) */
    rollbackOnError?: boolean;

    /** Nach erfolgreichem Request den Cache invalidieren (default: true) */
    invalidateOnSuccess?: boolean;

    /** Callback bei erfolgreicher Mutation */
    onSuccess?: (data: TData, variables: TVariables, context: OptimisticContext<TData> | undefined) => void;

    /** Callback bei Fehler (wird nach Rollback aufgerufen) */
    onError?: (error: TError, variables: TVariables, context: OptimisticContext<TData> | undefined) => void;
}

/**
 * Hook für Optimistic Updates mit automatischem Rollback
 *
 * Funktionsweise:
 * 1. onMutate: Cancel pending refetches, Snapshot der alten Daten, Optimistische Update
 * 2. onError: Rollback zu vorherigem Zustand
 * 3. onSettled: Cache invalidieren für frische Daten vom Server
 *
 * @param options - Konfiguration für die optimistic Mutation
 * @returns Mutation-Objekt mit zusätzlichem `isRollback` Flag
 */
export function useOptimisticMutation<TData, TVariables, TError = Error>(
    options: OptimisticMutationOptions<TData, TVariables, TError>
) {
    const queryClient = useQueryClient();

    const {
        mutationFn,
        queryKey,
        optimisticUpdate,
        rollbackOnError = true,
        invalidateOnSuccess = true,
        onSuccess,
        onError,
        ...restOptions
    } = options;

    return useMutation({
        mutationFn,

        /**
         * Wird aufgerufen BEVOR die Mutation ausgeführt wird
         * - Bricht ausstehende Refetches ab
         * - Speichert Snapshot der aktuellen Daten
         * - Führt optimistisches Update durch
         */
        onMutate: async (variables: TVariables): Promise<OptimisticContext<TData>> => {
            // 1. Ausstehende Refetches für diesen Query-Key abbrechen
            // Das verhindert Race Conditions zwischen Optimistic Update und Server-Response
            await queryClient.cancelQueries({ queryKey });

            // 2. Snapshot der aktuellen Daten für mögliches Rollback
            const previousData = queryClient.getQueryData<TData>(queryKey);

            // 3. Optimistisches Update durchführen
            // UI zeigt sofort den neuen Zustand an
            queryClient.setQueryData<TData>(queryKey, (old) =>
                optimisticUpdate(old, variables)
            );

            // 4. Snapshot zurückgeben für onError/onSettled
            return { previousData };
        },

        /**
         * Wird bei Fehler aufgerufen
         * - Rollback zu vorherigem Zustand (wenn rollbackOnError !== false)
         * - Ruft optionalen onError Callback auf
         */
        onError: (error: TError, variables: TVariables, context: OptimisticContext<TData> | undefined) => {
            // Rollback: Wiederherstellen des vorherigen Datenstands
            if (rollbackOnError !== false && context?.previousData !== undefined) {
                queryClient.setQueryData(queryKey, context.previousData);
            }

            // Optionalen Error-Handler aufrufen
            if (onError) {
                onError(error, variables, context);
            }
        },

        /**
         * Wird nach Erfolg ODER Fehler aufgerufen
         * - Invalidiert den Query-Cache für frische Daten vom Server
         * - Ruft optionalen onSuccess Callback auf
         */
        onSettled: (data: TData | undefined, _error: TError | null, variables: TVariables, context: OptimisticContext<TData> | undefined) => {
            // Immer den Cache invalidieren, um sicherzustellen, dass
            // Client und Server konsistent sind
            if (invalidateOnSuccess) {
                queryClient.invalidateQueries({ queryKey });
            }

            // Optionalen Success-Handler aufrufen
            if (onSuccess && data !== undefined) {
                onSuccess(data, variables, context);
            }
        },

        ...restOptions,
    });
}

/**
 * Hilfsfunktion für Array-Updates (häufiges Pattern)
 *
 * @example
 * ```ts
 * optimisticUpdate: createArrayOptimisticUpdate(
 *   'answers',
 *   (payload) => ({ id: payload.atomId, value: payload.value })
 * )
 * ```
 */
export function createArrayOptimisticUpdate<TItem, TVariables>(
    arrayKey: string,
    createItem: (variables: TVariables) => TItem
) {
    return (oldData: Record<string, TItem[]> | undefined, variables: TVariables) => {
        const newItem = createItem(variables);
        return {
            ...oldData,
            [arrayKey]: [...(oldData?.[arrayKey] || []), newItem],
        } as Record<string, TItem[]>;
    };
}

/**
 * Hilfsfunktion für Objekt-Updates (häufiges Pattern)
 *
 * @example
 * ```ts
 * optimisticUpdate: createObjectOptimisticUpdate(
 *   'settings',
 *   (payload) => payload.settings
 * )
 * ```
 */
export function createObjectOptimisticUpdate<TValue, TVariables>(
    objectKey: string,
    getValue: (variables: TVariables) => TValue
) {
    return (oldData: Record<string, TValue> | undefined, variables: TVariables) => {
        const value = getValue(variables);
        return {
            ...oldData,
            [objectKey]: value,
        } as Record<string, TValue>;
    };
}

/**
 * Hilfsfunktion für verschachtelte Updates
 *
 * @example
 * ```ts
 * optimisticUpdate: createNestedOptimisticUpdate(
 *   'session',
 *   'answers',
 *   (payload) => ({ [payload.atomId]: payload.value })
 * )
 * ```
 */
export function createNestedOptimisticUpdate<TValue, TVariables>(
    parentKey: string,
    childKey: string,
    getChildUpdate: (variables: TVariables) => Record<string, TValue>
) {
    return (oldData: Record<string, Record<string, Record<string, TValue>>> | undefined, variables: TVariables) => {
        const childUpdate = getChildUpdate(variables);
        return {
            ...oldData,
            [parentKey]: {
                ...(oldData?.[parentKey] || {}),
                [childKey]: {
                    ...(oldData?.[parentKey]?.[childKey] || {}),
                    ...childUpdate,
                },
            },
        };
    };
}
