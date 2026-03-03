import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSelector } from '../components/LanguageSelector';
import {
  ArrowLeft, ChevronDown,
  Smartphone, QrCode, Stethoscope, ClipboardList, FileText,
  ShieldCheck, Lock, Users, Eye,
  Settings, Zap
} from 'lucide-react';

type GuideSection = {
  id: string;
  titleKey: string;
  icon: React.ReactNode;
  color: string;
  steps: {
    titleKey: string;
    descKey: string;
    tipKey?: string;
  }[];
};

export function HandbuchPage() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<string | null>('patient-start');

  const sections: GuideSection[] = [
    {
      id: 'patient-start',
      titleKey: 'handbuch.sec.start.title',
      icon: <QrCode className="w-5 h-5" />,
      color: 'from-blue-500 to-indigo-600',
      steps: [
        { titleKey: 'handbuch.sec.start.s1.title', descKey: 'handbuch.sec.start.s1.desc', tipKey: 'handbuch.sec.start.s1.tip' },
        { titleKey: 'handbuch.sec.start.s2.title', descKey: 'handbuch.sec.start.s2.desc' },
        { titleKey: 'handbuch.sec.start.s3.title', descKey: 'handbuch.sec.start.s3.desc', tipKey: 'handbuch.sec.start.s3.tip' },
      ],
    },
    {
      id: 'services',
      titleKey: 'handbuch.sec.services.title',
      icon: <Stethoscope className="w-5 h-5" />,
      color: 'from-emerald-500 to-teal-600',
      steps: [
        { titleKey: 'handbuch.sec.services.s1.title', descKey: 'handbuch.sec.services.s1.desc' },
        { titleKey: 'handbuch.sec.services.s2.title', descKey: 'handbuch.sec.services.s2.desc' },
        { titleKey: 'handbuch.sec.services.s3.title', descKey: 'handbuch.sec.services.s3.desc' },
        { titleKey: 'handbuch.sec.services.s4.title', descKey: 'handbuch.sec.services.s4.desc' },
        { titleKey: 'handbuch.sec.services.s5.title', descKey: 'handbuch.sec.services.s5.desc' },
      ],
    },
    {
      id: 'questionnaire',
      titleKey: 'handbuch.sec.questionnaire.title',
      icon: <ClipboardList className="w-5 h-5" />,
      color: 'from-purple-500 to-violet-600',
      steps: [
        { titleKey: 'handbuch.sec.questionnaire.s1.title', descKey: 'handbuch.sec.questionnaire.s1.desc' },
        { titleKey: 'handbuch.sec.questionnaire.s2.title', descKey: 'handbuch.sec.questionnaire.s2.desc', tipKey: 'handbuch.sec.questionnaire.s2.tip' },
        { titleKey: 'handbuch.sec.questionnaire.s3.title', descKey: 'handbuch.sec.questionnaire.s3.desc' },
        { titleKey: 'handbuch.sec.questionnaire.s4.title', descKey: 'handbuch.sec.questionnaire.s4.desc' },
      ],
    },
    {
      id: 'mfa',
      titleKey: 'handbuch.sec.mfa.title',
      icon: <Users className="w-5 h-5" />,
      color: 'from-pink-500 to-rose-600',
      steps: [
        { titleKey: 'handbuch.sec.mfa.s1.title', descKey: 'handbuch.sec.mfa.s1.desc' },
        { titleKey: 'handbuch.sec.mfa.s2.title', descKey: 'handbuch.sec.mfa.s2.desc', tipKey: 'handbuch.sec.mfa.s2.tip' },
        { titleKey: 'handbuch.sec.mfa.s3.title', descKey: 'handbuch.sec.mfa.s3.desc' },
        { titleKey: 'handbuch.sec.mfa.s4.title', descKey: 'handbuch.sec.mfa.s4.desc' },
      ],
    },
    {
      id: 'arzt',
      titleKey: 'handbuch.sec.arzt.title',
      icon: <Stethoscope className="w-5 h-5" />,
      color: 'from-blue-500 to-cyan-600',
      steps: [
        { titleKey: 'handbuch.sec.arzt.s1.title', descKey: 'handbuch.sec.arzt.s1.desc' },
        { titleKey: 'handbuch.sec.arzt.s2.title', descKey: 'handbuch.sec.arzt.s2.desc', tipKey: 'handbuch.sec.arzt.s2.tip' },
        { titleKey: 'handbuch.sec.arzt.s3.title', descKey: 'handbuch.sec.arzt.s3.desc' },
        { titleKey: 'handbuch.sec.arzt.s4.title', descKey: 'handbuch.sec.arzt.s4.desc' },
        { titleKey: 'handbuch.sec.arzt.s5.title', descKey: 'handbuch.sec.arzt.s5.desc' },
      ],
    },
    {
      id: 'admin',
      titleKey: 'handbuch.sec.admin.title',
      icon: <Settings className="w-5 h-5" />,
      color: 'from-cyan-500 to-teal-600',
      steps: [
        { titleKey: 'handbuch.sec.admin.s1.title', descKey: 'handbuch.sec.admin.s1.desc' },
        { titleKey: 'handbuch.sec.admin.s2.title', descKey: 'handbuch.sec.admin.s2.desc' },
        { titleKey: 'handbuch.sec.admin.s3.title', descKey: 'handbuch.sec.admin.s3.desc' },
      ],
    },
    {
      id: 'accessibility',
      titleKey: 'handbuch.sec.a11y.title',
      icon: <Eye className="w-5 h-5" />,
      color: 'from-amber-500 to-orange-600',
      steps: [
        { titleKey: 'handbuch.sec.a11y.s1.title', descKey: 'handbuch.sec.a11y.s1.desc' },
        { titleKey: 'handbuch.sec.a11y.s2.title', descKey: 'handbuch.sec.a11y.s2.desc' },
        { titleKey: 'handbuch.sec.a11y.s3.title', descKey: 'handbuch.sec.a11y.s3.desc' },
        { titleKey: 'handbuch.sec.a11y.s4.title', descKey: 'handbuch.sec.a11y.s4.desc' },
      ],
    },
    {
      id: 'security',
      titleKey: 'handbuch.sec.security.title',
      icon: <Lock className="w-5 h-5" />,
      color: 'from-red-500 to-rose-600',
      steps: [
        { titleKey: 'handbuch.sec.security.s1.title', descKey: 'handbuch.sec.security.s1.desc' },
        { titleKey: 'handbuch.sec.security.s2.title', descKey: 'handbuch.sec.security.s2.desc' },
        { titleKey: 'handbuch.sec.security.s3.title', descKey: 'handbuch.sec.security.s3.desc' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] backdrop-blur-xl text-sm font-bold text-[var(--text-secondary)] hover:text-blue-400 hover:border-blue-500/30 transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('docs.back', 'Zurück zur Startseite')}
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] backdrop-blur-xl text-sm font-bold text-[var(--text-secondary)] hover:text-blue-400 hover:border-blue-500/30 transition-all duration-300"
            >
              <FileText className="w-4 h-4" />
              {t('handbuch.to_docs', 'Dokumentation')}
            </Link>
          </div>
          <div className="flex gap-3">
            <ThemeToggle />
            <LanguageSelector />
          </div>
        </div>

        {/* Hero */}
        <header className="max-w-4xl mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-bold tracking-wide uppercase mb-8 shadow-lg shadow-purple-500/5">
            <Eye className="w-4 h-4" />
            {t('handbuch.badge', 'Bedienungsanleitung')}
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tight mb-8 leading-[1.1]">
            {t('handbuch.title', 'Handbuch')}
          </h1>
          <p className="text-xl text-[var(--text-secondary)] leading-relaxed font-medium max-w-2xl">
            {t('handbuch.subtitle', 'Schritt-für-Schritt-Anleitung für alle Nutzerrollen: Patient, MFA, Arzt und Administrator. Mit Tipps und Best Practices.')}
          </p>
        </header>

        {/* Quick-Nav */}
        <nav className="mb-16">
          <div className="flex flex-wrap gap-3">
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => {
                  setActiveSection(activeSection === sec.id ? null : sec.id);
                  document.getElementById(`section-${sec.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-bold transition-all duration-300 backdrop-blur-xl ${
                  activeSection === sec.id
                    ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                    : 'bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-blue-500/20 hover:text-blue-400'
                }`}
              >
                {sec.icon}
                {t(sec.titleKey)}
              </button>
            ))}
          </div>
        </nav>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <section
              key={section.id}
              id={`section-${section.id}`}
              className="rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border-primary)] backdrop-blur-xl overflow-hidden transition-all duration-500"
            >
              {/* Section Header */}
              <button
                onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                className="w-full flex items-center justify-between p-8 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] bg-gradient-to-br ${section.color}`}>
                    {section.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">{t(section.titleKey)}</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      {section.steps.length} {t('handbuch.steps', 'Schritte')}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-6 h-6 text-[var(--text-secondary)] transition-transform duration-300 ${activeSection === section.id ? 'rotate-180' : ''}`} />
              </button>

              {/* Steps */}
              {activeSection === section.id && (
                <div className="px-8 pb-8 space-y-6 border-t border-[var(--border-primary)] pt-6">
                  {section.steps.map((step, i) => (
                    <div key={i} className="flex gap-6">
                      {/* Step Number */}
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm bg-gradient-to-br ${section.color}`}>
                          {i + 1}
                        </div>
                        {i < section.steps.length - 1 && (
                          <div className="w-px flex-1 mt-2 bg-[var(--border-primary)]" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-6">
                        <h3 className="text-base font-bold mb-2">{t(step.titleKey)}</h3>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{t(step.descKey)}</p>
                        {step.tipKey && (
                          <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                            <Zap className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-blue-300 font-medium">{t(step.tipKey)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Bottom CTA */}
        <section className="mt-16 flex flex-col sm:flex-row gap-4">
          <Link
            to="/docs"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-violet-600 text-white font-bold text-base shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-[1.02]"
          >
            <FileText className="w-5 h-5" />
            {t('handbuch.cta.docs', 'Dokumentation lesen')}
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-primary)] font-bold text-base backdrop-blur-xl hover:border-blue-500/30 transition-all duration-300"
          >
            <Smartphone className="w-5 h-5" />
            {t('docs.cta.demo', 'Demo starten')}
          </Link>
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-12 border-t border-[var(--border-primary)] flex flex-col lg:flex-row items-center justify-between gap-8 py-8">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">{t('System Online')}</span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">{t('DSGVO Konform')}</span>
            </div>
          </div>
          <div className="text-sm text-[var(--text-secondary)] font-medium">
            © {new Date().getFullYear()} DiggAI — {t('docs.footer', 'Digitale Patientenaufnahme. Made in Germany.')}
          </div>
        </footer>
      </div>
    </div>
  );
}
