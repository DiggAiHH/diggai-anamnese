import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useServiceFlow } from '../../hooks/useServiceFlow';
import { ServicePageLayout } from './ServicePageLayout';

export function KrankschreibungPage() {
  const { t } = useTranslation();
  const flow = useServiceFlow('au');

  const steps = [
    { label: t('service.au.step1', 'Kurze Angabe Ihrer Beschwerden und des Erkrankungsbeginns.') },
    { label: t('service.au.step2', 'Ggf. Angaben zu Ihrem Arbeitgeber für die Bescheinigung.') },
    { label: t('service.au.step3', 'Der Arzt prüft Ihre Angaben und stellt die AU aus.') },
    { label: t('service.au.step4', 'Die eAU wird digital an Ihre Krankenkasse übermittelt.') },
  ];

  return (
    <ServicePageLayout
      icon={<FileText className="w-8 h-8" />}
      color="from-rose-500 to-pink-600"
      title={t('service.au.title', 'Krankschreibung (AU)')}
      subtitle={t('service.au.subtitle', 'Anfrage einer Arbeitsunfähigkeits-Bescheinigung bei Erkrankung.')}
      duration={`3 ${t('time.min', 'Min.')}`}
      description={t(
        'service.au.description',
        'Wenn Sie krank sind, müssen Sie nicht zwingend persönlich in die Praxis kommen. Beschreiben Sie Ihre Symptome digital, und Ihr Arzt kann Ihnen eine Arbeitsunfähigkeitsbescheinigung ausstellen. Die eAU wird automatisch an Ihre Krankenkasse übermittelt.'
      )}
      steps={steps}
      flow={flow}
    />
  );
}
