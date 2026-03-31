import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import {
    APP_LANGUAGES,
    getAppLanguage,
    normalizeAppLanguageCode,
} from '../lib/i18n/languages';

export const LanguageSelector: React.FC = () => {
    const { i18n, t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLanguage = getAppLanguage(i18n.resolvedLanguage || i18n.language);
    const selectedLanguageCode = currentLanguage.code;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const language = getAppLanguage(i18n.resolvedLanguage || i18n.language);
        document.documentElement.dir = language.dir;
        document.documentElement.lang = language.code;
    }, [i18n.language, i18n.resolvedLanguage]);

    const handleLanguageChange = (code: string) => {
        i18n.changeLanguage(normalizeAppLanguageCode(code));
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-label={t('languageSelect', 'Sprache wählen')}
                data-testid="language-selector"
                className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-primary)] rounded-xl transition-all text-[var(--text-primary)] text-sm font-medium backdrop-blur-md"
            >
                <Globe className="w-4 h-4 text-blue-400" />
                <span className="uppercase">{currentLanguage.code}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 space-y-1">
                        {APP_LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => handleLanguageChange(lang.code)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${selectedLanguageCode === lang.code
                                        ? 'bg-blue-500/10 text-blue-400'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">{lang.flag}</span>
                                    <span className="text-sm font-medium">{lang.name}</span>
                                </div>
                                {selectedLanguageCode === lang.code && (
                                    <Check className="w-4 h-4" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
