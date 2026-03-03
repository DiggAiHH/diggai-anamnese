import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSelector } from '../components/LanguageSelector';
import {
  ShieldCheck, Lock, Globe2, Stethoscope, Activity,
  FileText, Smartphone, Brain, BarChart3, MessageSquare,
  ArrowLeft, ChevronRight, Zap, Eye, Server, HeartPulse
} from 'lucide-react';

interface FeatureSection {
  id: string;
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
  highlights: string[];
  color: string;
}

export function DokumentationPage() {
  const { t } = useTranslation();

  const features: FeatureSection[] = [
    {
      id: 'anamnese',
      icon: <Stethoscope className="w-6 h-6" />,
      titleKey: 'docs.feature.anamnese.title',
      descKey: 'docs.feature.anamnese.desc',
      highlights: [
        'docs.feature.anamnese.h1',
        'docs.feature.anamnese.h2',
        'docs.feature.anamnese.h3',
      ],
      color: 'from-blue-500 to-indigo-600',
    },
    {
      id: 'triage',
      icon: <HeartPulse className="w-6 h-6" />,
      titleKey: 'docs.feature.triage.title',
      descKey: 'docs.feature.triage.desc',
      highlights: [
        'docs.feature.triage.h1',
        'docs.feature.triage.h2',
        'docs.feature.triage.h3',
      ],
      color: 'from-red-500 to-rose-600',
    },
    {
      id: 'multilang',
      icon: <Globe2 className="w-6 h-6" />,
      titleKey: 'docs.feature.multilang.title',
      descKey: 'docs.feature.multilang.desc',
      highlights: [
        'docs.feature.multilang.h1',
        'docs.feature.multilang.h2',
        'docs.feature.multilang.h3',
      ],
      color: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'security',
      icon: <Lock className="w-6 h-6" />,
      titleKey: 'docs.feature.security.title',
      descKey: 'docs.feature.security.desc',
      highlights: [
        'docs.feature.security.h1',
        'docs.feature.security.h2',
        'docs.feature.security.h3',
      ],
      color: 'from-amber-500 to-orange-600',
    },
    {
      id: 'dashboards',
      icon: <BarChart3 className="w-6 h-6" />,
      titleKey: 'docs.feature.dashboards.title',
      descKey: 'docs.feature.dashboards.desc',
      highlights: [
        'docs.feature.dashboards.h1',
        'docs.feature.dashboards.h2',
        'docs.feature.dashboards.h3',
      ],
      color: 'from-purple-500 to-violet-600',
    },
    {
      id: 'chat',
      icon: <MessageSquare className="w-6 h-6" />,
      titleKey: 'docs.feature.chat.title',
      descKey: 'docs.feature.chat.desc',
      highlights: [
        'docs.feature.chat.h1',
        'docs.feature.chat.h2',
        'docs.feature.chat.h3',
      ],
      color: 'from-cyan-500 to-sky-600',
    },
  ];

  const stats = [
    { value: '270+', labelKey: 'docs.stat.questions', icon: <FileText className="w-5 h-5" /> },
    { value: '13', labelKey: 'docs.stat.specialties', icon: <Brain className="w-5 h-5" /> },
    { value: '10', labelKey: 'docs.stat.languages', icon: <Globe2 className="w-5 h-5" /> },
    { value: '<2s', labelKey: 'docs.stat.triage', icon: <Zap className="w-5 h-5" /> },
    { value: '10', labelKey: 'docs.stat.services', icon: <Activity className="w-5 h-5" /> },
    { value: 'AES-256', labelKey: 'docs.stat.encryption', icon: <Lock className="w-5 h-5" /> },
  ];

  const faqItems = [
    { q: 'docs.faq.dsgvo.q', a: 'docs.faq.dsgvo.a' },
    { q: 'docs.faq.smartphone.q', a: 'docs.faq.smartphone.a' },
    { q: 'docs.faq.pvs.q', a: 'docs.faq.pvs.a' },
    { q: 'docs.faq.emergency.q', a: 'docs.faq.emergency.a' },
    { q: 'docs.faq.start.q', a: 'docs.faq.start.a' },
  ];

  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] backdrop-blur-xl text-sm font-bold text-[var(--text-secondary)] hover:text-blue-400 hover:border-blue-500/30 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('docs.back', 'Zurück zur Startseite')}
          </Link>
          <div className="flex gap-3">
            <ThemeToggle />
            <LanguageSelector />
          </div>
        </div>

        {/* Hero Section */}
        <header className="max-w-4xl mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold tracking-wide uppercase mb-8 shadow-lg shadow-blue-500/5">
            <FileText className="w-4 h-4" />
            {t('docs.badge', 'Dokumentation')}
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tight mb-8 leading-[1.1]">
            {t('docs.title', 'DiggAI Anamnese')}
          </h1>
          <p className="text-xl text-[var(--text-secondary)] leading-relaxed font-medium max-w-2xl">
            {t('docs.subtitle', 'Digitale Patientenaufnahme für Arztpraxen – mehrsprachig, KI-gestützt, DSGVO-konform. Alles, was Sie über DiggAI wissen müssen.')}
          </p>
        </header>

        {/* Stats Bar */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-20">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="group flex flex-col items-center gap-3 p-6 rounded-[2rem] bg-[var(--bg-card)] border border-[var(--border-primary)] backdrop-blur-xl hover:border-blue-500/30 transition-all duration-500"
            >
              <div className="text-blue-400 group-hover:scale-110 transition-transform duration-300">
                {stat.icon}
              </div>
              <span className="text-2xl font-black tracking-tight">{stat.value}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] text-center">
                {t(stat.labelKey)}
              </span>
            </div>
          ))}
        </section>

        {/* Features Grid */}
        <section className="mb-20">
          <h2 className="text-3xl font-black tracking-tight mb-12">
            {t('docs.features.title', 'Funktionen im Überblick')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <article
                key={feature.id}
                className="group relative flex flex-col p-8 rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border-primary)] hover:border-[var(--border-hover)] transition-all duration-500 overflow-hidden backdrop-blur-xl"
              >
                {/* Glow */}
                <div className={`absolute top-0 right-0 w-40 h-40 -mr-12 -mt-12 rounded-full opacity-[0.05] blur-3xl transition-all duration-700 group-hover:scale-150 group-hover:opacity-20 bg-gradient-to-br ${feature.color}`} />

                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] mb-6 bg-gradient-to-br ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-3">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                  {t(feature.descKey)}
                </p>
                <ul className="mt-auto space-y-2">
                  {feature.highlights.map((hKey, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span>{t(hKey)}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* Architecture Overview */}
        <section className="mb-20 p-10 rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border-primary)] backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
              <Server className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              {t('docs.arch.title', 'Technologie & Architektur')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Frontend', items: ['React 19', 'TypeScript 5.9', 'Tailwind CSS 4', 'Vite 8'] },
              { label: 'Backend', items: ['Express 5', 'Prisma 6 ORM', 'Socket.io', 'JWT Auth'] },
              { label: t('docs.arch.security', 'Sicherheit'), items: ['AES-256-GCM', 'PBKDF2', 'Helmet.js', 'CORS/CSP'] },
              { label: t('docs.arch.infra', 'Infrastruktur'), items: ['PWA', 'Netlify CDN', 'SQLite/PostgreSQL', 'Auto-Cleanup'] },
            ].map((col, i) => (
              <div key={i}>
                <h3 className="text-sm font-black uppercase tracking-widest text-blue-400 mb-4">{col.label}</h3>
                <ul className="space-y-2">
                  {col.items.map((item, j) => (
                    <li key={j} className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-black tracking-tight mb-12">
            {t('docs.faq.title', 'Häufig gestellte Fragen')}
          </h2>
          <div className="space-y-4 max-w-3xl">
            {faqItems.map((item, i) => (
              <div
                key={i}
                className="rounded-[2rem] bg-[var(--bg-card)] border border-[var(--border-primary)] backdrop-blur-xl overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="text-base font-bold pr-4">{t(item.q)}</span>
                  <ChevronRight className={`w-5 h-5 text-blue-400 flex-shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-90' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-primary)] pt-4">
                    {t(item.a)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA + Links */}
        <section className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link
            to="/handbuch"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-base shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:scale-[1.02]"
          >
            <Eye className="w-5 h-5" />
            {t('docs.cta.handbuch', 'Bedienungsanleitung öffnen')}
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
        <footer className="pt-12 border-t border-[var(--border-primary)] flex flex-col lg:flex-row items-center justify-between gap-8 py-8">
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
