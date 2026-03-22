import { useState, useEffect } from 'react';
import { Shield, X, Check } from 'lucide-react';
import { useAdminPermissions, useAdminSetUserPermissions } from '../../hooks/useOpsApi';
import type { ArztUser, Permission } from '../../types/admin';

interface Props {
  user: ArztUser;
  currentPermissions: string[];
  onClose: () => void;
}

export function UserPermissionDialog({ user, currentPermissions, onClose }: Props) {
  const { data: permissionsData } = useAdminPermissions();
  const setPerms = useAdminSetUserPermissions();
  const [selected, setSelected] = useState<Set<string>>(new Set(currentPermissions));

  const permissions = (permissionsData || []) as Permission[];
  const categories = [...new Set(permissions.map(p => p.category))];

  useEffect(() => {
    setSelected(new Set(currentPermissions));
  }, [currentPermissions]);

  const toggle = (code: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleSave = () => {
    setPerms.mutate(
      { userId: user.id, permissionCodes: [...selected] },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Extra-Berechtigungen: {user.displayName}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" aria-label="Schließen">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto max-h-[50vh] space-y-4">
          <p className="text-sm text-gray-500">
            Zusätzliche Berechtigungen über die Rolle <strong>{user.role}</strong> hinaus.
          </p>

          {categories.map(cat => (
            <div key={cat}>
              <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2">{cat}</h4>
              <div className="space-y-1">
                {permissions.filter(p => p.category === cat).map(p => (
                  <label key={p.code} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(p.code)}
                      onChange={() => toggle(p.code)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{p.name}</div>
                      {p.description && <div className="text-xs text-gray-500 truncate">{p.description}</div>}
                    </div>
                    <span className="text-xs font-mono text-gray-400">{p.code}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
            Abbrechen
          </button>
          <button onClick={handleSave} disabled={setPerms.isPending}
            className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Check className="w-4 h-4" />
            {setPerms.isPending ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}
