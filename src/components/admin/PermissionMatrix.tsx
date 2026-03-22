import { useState, useMemo } from 'react';
import { Lock, Check, X } from 'lucide-react';
import { useAdminPermissions, useAdminRolePermissions, useAdminSetRolePermissions } from '../../hooks/useOpsApi';
import type { Permission } from '../../types/admin';

const ROLES = ['ADMIN', 'ARZT', 'MFA'];

export function PermissionMatrix() {
    const { data: allPermissions, isLoading: loadingPerms } = useAdminPermissions();
    const [selectedRole, setSelectedRole] = useState('ARZT');

    const { data: rolePerms } = useAdminRolePermissions(selectedRole);
    const setRolePerms = useAdminSetRolePermissions();

    const rolePermIds = useMemo(() => new Set((rolePerms || []).map((p: Permission) => p.id)), [rolePerms]);

    const categories = useMemo(() => {
        if (!allPermissions) return {};
        const cats: Record<string, Permission[]> = {};
        for (const p of allPermissions as Permission[]) {
            if (!cats[p.category]) cats[p.category] = [];
            cats[p.category].push(p);
        }
        return cats;
    }, [allPermissions]);

    const handleToggle = (permId: string) => {
        const currentIds = Array.from(rolePermIds);
        const newIds = rolePermIds.has(permId)
            ? currentIds.filter(id => id !== permId)
            : [...currentIds, permId];
        setRolePerms.mutate({ role: selectedRole, permissionIds: newIds as string[] });
    };

    if (loadingPerms) return <div className="animate-pulse p-8">Lade Berechtigungen...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2"><Lock className="w-5 h-5" /> Rechte-Matrix</h2>
                <div className="flex gap-2">
                    {ROLES.map(role => (
                        <button key={role} onClick={() => setSelectedRole(role)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedRole === role ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}>
                            {role}
                        </button>
                    ))}
                </div>
            </div>

            {Object.entries(categories).map(([category, perms]) => (
                <div key={category} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 font-semibold text-sm uppercase tracking-wider text-gray-500">
                        {category}
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {perms.map((perm: Permission) => (
                            <div key={perm.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <div>
                                    <div className="font-medium text-sm">{perm.name}</div>
                                    <div className="text-xs text-gray-500">{perm.code}</div>
                                </div>
                                <button onClick={() => handleToggle(perm.id)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${rolePermIds.has(perm.id)
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                        : 'bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}>
                                    {rolePermIds.has(perm.id) ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
