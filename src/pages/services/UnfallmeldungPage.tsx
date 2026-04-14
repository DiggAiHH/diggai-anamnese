import { HardHat } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useServiceFlow } from '../../hooks/useServiceFlow';
import { ServicePageLayout } from './ServicePageLayout';

export function UnfallmeldungPage() {
  const { t } = useTranslation();
  const flow = useServiceFlow('unfall');

  const steps = [
    { label: t('service.unfall.step1', 'Art des Unfalls angeben (Arbeitsunfall, Wegeunfall, Schulunfall).') },
    { label: t('service.unfall.step2', 'Unfallhergang, Zeitpunkt und Ort dokumentieren.') },
    { label: t('service.unfall.step3', 'Verletzungen und Erstversorgung beschreiben.') },
    { label: t('service.unfall.step4', 'Angaben zum Arbeitgeber und zur Berufsgenossenschaft.') },
    { label: t('service.unfall.step5', 'Unterlagen werden für den BG-Bericht vorbereitet.') },
  ];

  return (
    <ServicePageLayout
      icon={<HardHat className="w-8 h-8" />}
      color="from-orange-500 to-amber-600"
      title={t('service.unfall.title', 'Unfallmeldung (BG)')}
      subtitle={t('service.unfall.subtitle', 'Arbeitsunfall, Wegeunfall oder Schulunfall dokumentieren.')}
      duration={`5 ${t('time.min', 'Min.')}`}
      description={t(
        'service.unfall.description',
        'Dokumentieren Sie Ihren Arbeits-, Wege- oder Schulunfall vollständig und digital. Die erfassten Daten werden für den D-Arzt-Bericht und die Meldung an Ihre Berufsgenossenschaft vorbereitet — lückenlos und rechtssicher.'
      )}
      steps={steps}
      flow={flow}
    />
  );
}
