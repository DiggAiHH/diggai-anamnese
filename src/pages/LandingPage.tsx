import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Shield, 
  Clock, 
  Lock, 
  Sparkles, 
  CheckCircle,
  ArrowRight,
  Users,
  Stethoscope,
  FileCheck,
  Zap,
  ChevronDown,
  Menu,
  X,
  Star,
  Quote
} from 'lucide-react';
import { Button } from '../components/ui/Button';

// ─── Types ─────────────────────────────────────────────

interface TestimonialProps {
  quote: string;
  author: string;
  role: string;
  rating: number;
}

interface FeatureProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

// ─── Trust Badge Component ─────────────────────────────

const TrustBadge = React.memo(function TrustBadge({ 
  icon: Icon, 
  text 
}: { 
  icon: React.ElementType;
  text: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
    >
      <Icon className="w-4 h-4 text-[#81B29A]" />
      <span className="text-sm text-white/80">{text}</span>
    </motion.div>
  );
});

// ─── Feature Card Component ────────────────────────────

const FeatureCard = React.memo(function FeatureCard({ 
  icon: Icon, 
  title, 
  description 
}: FeatureProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#4A90E2]/30 transition-all duration-300"
    >
      <div className="w-12 h-12 rounded-xl bg-[#4A90E2]/20 flex items-center justify-center mb-4 group-hover:bg-[#4A90E2]/30 transition-colors">
        <Icon className="w-6 h-6 text-[#4A90E2]" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-white/60 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
});

// ─── Testimonial Card Component ────────────────────────

const TestimonialCard = React.memo(function TestimonialCard({ 
  quote, 
  author, 
  role, 
  rating 
}: TestimonialProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
    >
      <Quote className="w-8 h-8 text-[#4A90E2]/40 mb-4" />
      <p className="text-white/80 mb-6 leading-relaxed">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star 
            key={i} 
            className={`w-4 h-4 ${i < rating ? 'text-[#F4A261] fill-[#F4A261]' : 'text-white/20'}`} 
          />
        ))}
      </div>
      <div>
        <p className="font-semibold text-white">{author}</p>
        <p className="text-sm text-white/50">{role}</p>
      </div>
    </motion.div>
  );
});

// ─── Navigation Component ──────────────────────────────

const Navigation = React.memo(function Navigation() {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { label: t('landing.nav.features', 'Features'), href: '#features' },
    { label: t('landing.nav.testimonials', 'Erfahrungen'), href: '#testimonials' },
    { label: t('landing.nav.security', 'Sicherheit'), href: '#security' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A90E2] to-[#5E8B9E] flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">DiggAI</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* CTA Button */}
        <div className="hidden md:block">
          <Button
            size="sm"
            className="bg-[#4A90E2] hover:bg-[#5E8B9E] text-white"
          >
            {t('landing.cta.primary', 'Jetzt starten')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 text-white/60 hover:text-white"
          aria-label={isMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={{ height: isMenuOpen ? 'auto' : 0, opacity: isMenuOpen ? 1 : 0 }}
        className="md:hidden overflow-hidden border-t border-white/10"
      >
        <div className="px-6 py-4 space-y-4">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className="block text-white/60 hover:text-white transition-colors"
            >
              {item.label}
            </a>
          ))}
          <Button
            size="sm"
            className="w-full bg-[#4A90E2] hover:bg-[#5E8B9E] text-white"
          >
            {t('landing.cta.primary', 'Jetzt starten')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </nav>
  );
});

// ─── Hero Section ──────────────────────────────────────

const HeroSection = React.memo(function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Soft Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#4A90E2]/10 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-[#81B29A]/5 via-transparent to-transparent" />
      
      {/* Content */}
      <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-3 mb-8"
        >
          <TrustBadge icon={Shield} text={t('landing.trust.dsgvo', 'DSGVO-konform')} />
          <TrustBadge icon={Lock} text={t('landing.trust.encrypted', 'End-to-End verschlüsselt')} />
          <TrustBadge icon={CheckCircle} text={t('landing.trust.certified', 'Gematik-zertifiziert')} />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight"
        >
          {t('landing.hero.title', 'Digitale Anamnese')}
          <span className="block text-[#4A90E2]">{t('landing.hero.subtitle', 'für moderne Praxen')}</span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          {t('landing.hero.description', 'Sparen Sie wertvolle Zeit bei der Patientenaufnahme. Sicher, DSGVO-konform und nahtlos in Ihre Praxis-EDV integriert.')}
        </motion.p>

        {/* Single Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            size="lg"
            className="group px-8 py-4 text-lg rounded-2xl bg-gradient-to-r from-[#4A90E2] to-[#5E8B9E] hover:from-[#5E8B9E] hover:to-[#4A90E2] transition-all duration-300 shadow-lg shadow-[#4A90E2]/25 hover:shadow-xl hover:shadow-[#4A90E2]/30"
          >
            <span>{t('landing.cta.demo', 'Kostenlos testen')}</span>
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <a
            href="#features"
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <span>{t('landing.cta.learnMore', 'Mehr erfahren')}</span>
            <ChevronDown className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto"
        >
          {[
            { value: '50%', label: t('landing.stats.time', 'Zeitersparnis') },
            { value: '10k+', label: t('landing.stats.patients', 'Patienten') },
            { value: '500+', label: t('landing.stats.practices', 'Praxen') },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-white/50">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
});

// ─── Features Section ──────────────────────────────────

const FeaturesSection = React.memo(function FeaturesSection() {
  const { t } = useTranslation();

  const features: FeatureProps[] = [
    {
      icon: Clock,
      title: t('landing.features.time.title', 'Zeitersparnis'),
      description: t('landing.features.time.description', 'Reduzieren Sie den administrativen Aufwand bei der Patientenaufnahme um bis zu 50%.'),
    },
    {
      icon: Shield,
      title: t('landing.features.security.title', 'Höchste Sicherheit'),
      description: t('landing.features.security.description', 'DSGVO-konforme Verschlüsselung und gematik-zertifizierte Infrastruktur.'),
    },
    {
      icon: Sparkles,
      title: t('landing.features.ai.title', 'Strukturierte Aufnahme'),
      description: t('landing.features.ai.description', 'Strukturierte Erfassung und Weiterleitung der Patienteneingaben für mehr Effizienz in der Praxis.'),
    },
    {
      icon: Stethoscope,
      title: t('landing.features.integration.title', 'Nahtlose Integration'),
      description: t('landing.features.integration.description', 'Kompatibel mit allen gängigen Praxis-EDV-Systemen wie CGM, MEDISTAR und TURBOMED.'),
    },
    {
      icon: Users,
      title: t('landing.features.patient.title', 'Patientenfreundlich'),
      description: t('landing.features.patient.description', 'Einfache Bedienung für Patienten aller Altersgruppen, verfügbar in 10 Sprachen.'),
    },
    {
      icon: FileCheck,
      title: t('landing.features.documentation.title', 'Automatisierte Dokumentation'),
      description: t('landing.features.documentation.description', 'Automatische Übertragung in die Patientenakte mit strukturierten Daten.'),
    },
  ];

  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-4 py-1 rounded-full bg-[#4A90E2]/10 text-[#4A90E2] text-sm font-medium mb-4">
              {t('landing.features.badge', 'Funktionen')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t('landing.features.title', 'Alles was Sie brauchen')}
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              {t('landing.features.subtitle', 'Umfassende Funktionen für eine effiziente und sichere digitale Patientenaufnahme.')}
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <FeatureCard {...feature} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});

// ─── Testimonials Section ──────────────────────────────

const TestimonialsSection = React.memo(function TestimonialsSection() {
  const { t } = useTranslation();

  const testimonials: TestimonialProps[] = [
    {
      quote: t('landing.testimonials.1.quote', 'DiggAI hat unsere Patientenaufnahme revolutioniert. Wir sparen täglich wertvolle Zeit und die Datenqualität ist deutlich besser.'),
      author: 'Dr. med. Sarah Schmidt',
      role: t('landing.testimonials.1.role', 'Hausärztin, Berlin'),
      rating: 5,
    },
    {
      quote: t('landing.testimonials.2.quote', 'Die Integration in unsere Praxis-EDV war nahtlos. Nach kurzer Einführung konnten wir sofort loslegen.'),
      author: 'Dr. med. Klaus Weber',
      role: t('landing.testimonials.2.role', 'Internist, München'),
      rating: 5,
    },
    {
      quote: t('landing.testimonials.3.quote', 'Endlich eine digitale Lösung, die auch ältere Patienten problemlos bedienen können. Das Design ist hervorragend.'),
      author: 'Maria Hoffmann',
      role: t('landing.testimonials.3.role', 'Praxismanagerin, Hamburg'),
      rating: 5,
    },
  ];

  return (
    <section id="testimonials" className="py-24 relative bg-white/[0.02]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-4 py-1 rounded-full bg-[#81B29A]/10 text-[#81B29A] text-sm font-medium mb-4">
              {t('landing.testimonials.badge', 'Erfahrungen')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t('landing.testimonials.title', 'Was unsere Kunden sagen')}
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              {t('landing.testimonials.subtitle', 'Über 500 Praxen vertrauen bereits auf DiggAI für ihre digitale Patientenaufnahme.')}
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <TestimonialCard {...testimonial} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});

// ─── Security Section ──────────────────────────────────

const SecuritySection = React.memo(function SecuritySection() {
  const { t } = useTranslation();

  const securityFeatures = [
    { icon: Lock, text: t('landing.security.endToEnd', 'End-to-End Verschlüsselung') },
    { icon: Shield, text: t('landing.security.dsgvo', 'DSGVO-konform') },
    { icon: FileCheck, text: t('landing.security.gematik', 'Gematik-zertifiziert') },
    { icon: Zap, text: t('landing.security.ti', 'TI-kompatibel') },
  ];

  return (
    <section id="security" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-4 py-1 rounded-full bg-[#5E8B9E]/10 text-[#5E8B9E] text-sm font-medium mb-4">
              {t('landing.security.badge', 'Sicherheit')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              {t('landing.security.title', 'Ihre Daten sind bei uns sicher')}
            </h2>
            <p className="text-white/60 mb-8 leading-relaxed">
              {t('landing.security.description', 'Wir setzen auf höchste Sicherheitsstandards. Alle Patientendaten werden Ende-zu-Ende verschlüsselt und DSGVO-konform verarbeitet. Unsere Infrastruktur ist gematik-zertifiziert und für die Telematikinfrastruktur vorbereitet.')}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {securityFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#5E8B9E]/20 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-[#5E8B9E]" />
                  </div>
                  <span className="text-sm text-white/80">{feature.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-[#4A90E2]/20 to-[#81B29A]/20 border border-white/10 p-8 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#4A90E2] to-[#5E8B9E] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#4A90E2]/30">
                  <Shield className="w-12 h-12 text-white" />
                </div>
                <p className="text-white font-semibold mb-2">
                  {t('landing.security.certified', 'Zertifizierte Sicherheit')}
                </p>
                <p className="text-white/60 text-sm">
                  {t('landing.security.iso', 'ISO 27001 & BSI C5')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
});

// ─── CTA Section ───────────────────────────────────────

const CTASection = React.memo(function CTASection() {
  const { t } = useTranslation();

  return (
    <section className="py-24 relative">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center p-12 rounded-3xl bg-gradient-to-br from-[#4A90E2]/20 to-[#5E8B9E]/20 border border-white/10 backdrop-blur-sm"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t('landing.cta.title', 'Bereit für die digitale Patientenaufnahme?')}
          </h2>
          <p className="text-white/70 max-w-xl mx-auto mb-8">
            {t('landing.cta.subtitle', 'Starten Sie noch heute mit DiggAI und erleben Sie die Vorteile einer modernen, effizienten Anamnese.')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="group px-8 py-4 text-lg rounded-2xl bg-gradient-to-r from-[#4A90E2] to-[#5E8B9E] hover:from-[#5E8B9E] hover:to-[#4A90E2] transition-all duration-300 shadow-lg shadow-[#4A90E2]/25 hover:shadow-xl hover:shadow-[#4A90E2]/30"
            >
              <span>{t('landing.cta.start', 'Kostenlos testen')}</span>
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="text-white/80 hover:text-white"
            >
              {t('landing.cta.contact', 'Kontakt aufnehmen')}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

// ─── Footer ────────────────────────────────────────────

const Footer = React.memo(function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-gray-950/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A90E2] to-[#5E8B9E] flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">DiggAI</span>
            </div>
            <p className="text-white/50 text-sm max-w-sm">
              {t('landing.footer.description', 'Die digitale Anamnese-Lösung für moderne Arztpraxen. DSGVO-konform, sicher und effizient.')}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">{t('landing.footer.product', 'Produkt')}</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li><a href="#features" className="hover:text-white transition-colors">{t('landing.footer.features', 'Funktionen')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t('landing.footer.pricing', 'Preise')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t('landing.footer.integrations', 'Integrationen')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">{t('landing.footer.legal', 'Rechtliches')}</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li><a href="#" className="hover:text-white transition-colors">{t('landing.footer.privacy', 'Datenschutz')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t('landing.footer.terms', 'AGB')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t('landing.footer.imprint', 'Impressum')}</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/40">
            &copy; {currentYear} DiggAI. {t('landing.footer.rights', 'Alle Rechte vorbehalten.')}
          </p>
          <div className="flex items-center gap-4">
            <TrustBadge icon={Shield} text="ISO 27001" />
            <TrustBadge icon={CheckCircle} text="DSGVO" />
          </div>
        </div>
      </div>
    </footer>
  );
});

// ─── Main Landing Page Component ───────────────────────

export const LandingPage: React.FC = React.memo(function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <Navigation />
      <main>
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
        <SecuritySection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
});

export default LandingPage;
