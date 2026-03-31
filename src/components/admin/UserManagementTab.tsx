import { useState } from 'react';
import { Users, Plus, Trash2, Shield, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminUsers, useAdminCreateUser, useAdminUpdateUser, useAdminDeleteUser } from '../../hooks/useOpsApi';
import type { ArztUser } from '../../types/admin';

interface UserForm {
    username: string;
    password: string;
    displayName: string;
    role: string;
}

export function UserManagementTab() {
    const { t } = useTranslation();
    const { data: users, isLoading } = useAdminUsers();
    const createUser = useAdminCreateUser();
    const updateUser = useAdminUpdateUser();
    const deleteUser = useAdminDeleteUser();

    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState<UserForm>({ username: '', password: '', displayName: '', role: 'MFA' });

    const handleCreate = () => {
        createUser.mutate(form, {
            onSuccess: () => { setShowCreate(false); setForm({ username: '', password: '', displayName: '', role: 'MFA' }); },
        });
    };

    const handleToggleActive = (id: string, isActive: boolean) => {
        updateUser.mutate({ id, isActive: !isActive });
    };

    if (isLoading) return <div className="animate-pulse p-8">{t('app.dashboard_loading')}</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5" /> {t('admin.users_title')}</h2>
                <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4" /> {t('admin.users_create')}
                </button>
            </div>

            {showCreate && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                    <h3 className="font-semibold">{t('admin.users_create')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <input placeholder={t('admin.users_username')} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input placeholder={t('admin.users_password')} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <input placeholder={t('admin.users_displayname')} value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} aria-label={t('admin.users_role')} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="MFA">MFA</option>
                            <option value="ARZT">Arzt</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleCreate} disabled={createUser.isPending} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">{t('admin.users_create')}</button>
                        <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg">{t('admin.users_cancel')}</button>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{t('admin.users_username')}</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{t('admin.users_role')}</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Sessions</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {(users || []).map((user: ArztUser) => (
                            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-4 py-3">
                                    <div className="font-medium">{user.displayName}</div>
                                    <div className="text-sm text-gray-500">@{user.username}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : user.role === 'ARZT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                                        <Shield className="w-3 h-3" /> {user.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {user.isActive ? (
                                        <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /> {t('admin.content_active')}</span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-red-500"><XCircle className="w-4 h-4" /> {t('admin.content_inactive')}</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">{user._count?.assignedSessions || 0}</td>
                                <td className="px-4 py-3 text-right space-x-2">
                                    <button onClick={() => handleToggleActive(user.id, user.isActive)} className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-yellow-600 rounded" title={user.isActive ? t('admin.users_deactivate') : t('admin.users_activate')}>
                                        {user.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => deleteUser.mutate(user.id)} className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 rounded" title={t('admin.users_deactivate')}>
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
