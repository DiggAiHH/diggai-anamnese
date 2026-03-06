import { useTranslation } from 'react-i18next';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Entwurf', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
    ACTIVE: { label: 'Aktiv', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    PAUSED: { label: 'Pausiert', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
    COMPLETED: { label: 'Abgeschlossen', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    CANCELLED: { label: 'Abgebrochen', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
};

export function TherapyStatusBadge({ status, size = 'sm' }: { status: string; size?: 'xs' | 'sm' | 'md' }) {
    const { t } = useTranslation();
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
    const sizeClasses = {
        xs: 'text-[10px] px-1.5 py-0.5',
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-1',
    };

    return (
        <span className={`inline-flex items-center rounded-full font-medium ${config.className} ${sizeClasses[size]}`}>
            {t(`therapy.status.${status}`, config.label)}
        </span>
    );
}
