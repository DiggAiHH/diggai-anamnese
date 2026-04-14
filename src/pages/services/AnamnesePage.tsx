import { Stethoscope } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useServiceFlow } from '../../hooks/useServiceFlow';
import { ServicePageLayout } from './ServicePageLayout';

export function AnamnesePage() {
  const { t } = useTranslation();
  const flow = useServiceFlow('anamnese');

  const steps = [
    { label: t('service.anamnese.step1', 'Persönliche Angaben erfassen (Name, Geburtsdatum, Versicherung).') },
    { label: t('service.anamnese.step2', 'Aktuelle Beschwerden und Symptome beschreiben.') },
    { label: t('service.anamnese.step3', 'Vorerkrankungen und Medikamente angeben.') },
    { label: t('service.anamnese.step4', 'Unser Triage-System priorisiert Ihr Anliegen automatisch.') },
    { label: t('service.anamnese.step5', 'Zusammenfassung wird direkt an Ihren Arzt übermittelt.') },
  ];

  return (
    <ServicePageLayout
      icon={<Stethoscope className="w-8 h-8" />}
      color="from-blue-500 to-indigo-600"
      title={t('service.anamnese.title', 'Termin & Anamnese')}
      subtitle={t('service.anamnese.subtitle', 'Intelligente Vorbereitung für Ihren nächsten Behandlungstermin.')}
      duration={`5-8 ${t('time.min', 'Min.')}`}
      description={t(
        'service.anamnese.description',
        'Bereiten Sie Ihren Arztbesuch optimal vor: Unser digitaler Anamnesebogen erfasst alle relevanten Informationen zu Ihren Beschwerden, Vorerkrankungen und Medikamenten. So kann Ihr Arzt direkt mit der Behandlung beginnen — ohne lange Wartezeit im Sprechzimmer.'
      )}
      steps={steps}
      flow={flow}
    />
  );
}
