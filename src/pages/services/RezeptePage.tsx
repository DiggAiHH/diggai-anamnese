import { ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useServiceFlow } from '../../hooks/useServiceFlow';
import { ServicePageLayout } from './ServicePageLayout';

export function RezeptePage() {
  const { t } = useTranslation();
  const flow = useServiceFlow('prescription');

  const steps = [
    { label: t('service.rezepte.step1', 'Gewünschtes Medikament und Dosierung angeben.') },
    { label: t('service.rezepte.step2', 'Angaben zu Ihrem aktuellen Gesundheitszustand machen.') },
    { label: t('service.rezepte.step3', 'Der Arzt prüft und genehmigt Ihr Rezept digital.') },
    { label: t('service.rezepte.step4', 'Rezept liegt in der Praxis bereit oder wird als eRezept übermittelt.') },
  ];

  return (
    <ServicePageLayout
      icon={<ClipboardList className="w-8 h-8" />}
      color="from-emerald-500 to-teal-600"
      title={t('service.rezepte.title', 'Medikamente & Rezepte')}
      subtitle={t('service.rezepte.subtitle', 'Folge-Rezepte für Ihre Dauermedikation einfach online anfragen.')}
      duration={`2 ${t('time.min', 'Min.')}`}
      description={t(
        'service.rezepte.description',
        'Sparen Sie sich den Weg in die Praxis für Ihr Folgerezept. Geben Sie Ihr gewünschtes Medikament an, und Ihr Arzt stellt das Rezept nach einer kurzen digitalen Prüfung bereit. Ideal für Dauermedikation und regelmäßige Verschreibungen.'
      )}
      steps={steps}
      flow={flow}
    />
  );
}
