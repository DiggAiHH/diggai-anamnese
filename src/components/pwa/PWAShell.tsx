import { useState, useEffect } from 'react';
import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Pill, MessageSquare, Settings, Wifi, WifiOff } from 'lucide-react';
import { usePwaUnreadCount } from '../../hooks/useApi';
import { usePwaStore } from '../../stores/pwaStore';

const NAV_ITEMS = [
    { to: '/pwa/dashboard', icon: LayoutDashboard, label: 'Home' },
    { to: '/pwa/diary', icon: BookOpen, label: 'Tagebuch' },
    { to: '/pwa/measures', icon: Pill, label: 'Medikamente' },
    { to: '/pwa/messages', icon: MessageSquare, label: 'Nachrichten' },
    { to: '/pwa/settings', icon: Settings, label: 'Einstellungen' },
];

export function PWAShell() {
    const isAuthenticated = usePwaStore(s => s.isAuthenticated);
    const { data: unread } = usePwaUnreadCount();
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const on = () => setIsOnline(true);
        const off = () => setIsOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }, []);

    if (!isAuthenticated) return <Navigate to="/pwa/login" replace />;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">DiggAI</span>
                    <span className="text-xs text-gray-400">Patienten-Portal</span>
                </div>
                <div className="flex items-center gap-2">
                    {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 pb-20 px-4 py-4 max-w-lg mx-auto w-full">
                <Outlet />
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 safe-area-bottom">
                <div className="flex items-center justify-around max-w-lg mx-auto">
                    {NAV_ITEMS.map(item => (
                        <NavLink key={item.to} to={item.to}
                            className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 px-3 text-xs transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}>
                            {({ isActive }) => (
                                <>
                                    <div className="relative">
                                        <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                                        {item.to === '/pwa/messages' && (unread?.count || 0) > 0 && (
                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                                                {unread.count > 9 ? '9+' : unread.count}
                                            </span>
                                        )}
                                    </div>
                                    <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    );
}
