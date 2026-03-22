/**
 * Template Gallery Component
 * 
 * Display and select from predefined theme templates
 */


import { useTranslation } from 'react-i18next';
import type { ThemeTemplate, Theme } from '../../../theme/types';
import { defaultLightTheme } from '../../../theme/defaultThemes';

interface TemplateGalleryProps {
  templates: ThemeTemplate[];
  onSelect: (template: ThemeTemplate) => void;
  currentTheme?: Partial<Theme>;
}

export function TemplateGallery({
  templates,
  onSelect,
  currentTheme,
}: TemplateGalleryProps) {
  const { t } = useTranslation();

  // Check if a template matches the current theme
  const isTemplateActive = (template: ThemeTemplate): boolean => {
    if (!currentTheme?.colors?.primary) return false;
    return template.theme.colors.primary === currentTheme.colors.primary;
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      medical: t('admin.theme.categories.medical', 'Medizinisch'),
      modern: t('admin.theme.categories.modern', 'Modern'),
      classic: t('admin.theme.categories.classic', 'Klassisch'),
      minimal: t('admin.theme.categories.minimal', 'Minimal'),
    };
    return labels[category] || category;
  };

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, ThemeTemplate[]>);

  return (
    <div className="template-gallery space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
          {t('admin.theme.templates.title', 'Wählen Sie eine Vorlage')}
        </h3>
        <p className="text-[var(--color-text-muted)]">
          {t('admin.theme.templates.subtitle', 'Starten Sie mit einer unserer vorgefertigten Designs und passen Sie sie nach Belieben an')}
        </p>
      </div>

      {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
        <div key={category} className="space-y-4">
          <h4 className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
            {getCategoryLabel(category)}
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryTemplates.map((template) => {
              const isActive = isTemplateActive(template);
              
              return (
                <button
                  key={template.id}
                  onClick={() => onSelect(template)}
                  className={`
                    group relative text-left rounded-xl border-2 p-4 transition-all
                    ${isActive 
                      ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20' 
                      : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                    }
                    hover:shadow-lg
                  `}
                >
                  {/* Preview Gradient */}
                  <div 
                    className="h-24 rounded-lg mb-4"
                    style={{ background: template.preview }}
                  />
                  
                  {/* Template Info */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h5 className="font-semibold text-[var(--color-text)]">
                        {template.name}
                      </h5>
                      {isActive && (
                        <span className="text-xs px-2 py-0.5 bg-[var(--color-primary)] text-white rounded-full">
                          {t('admin.theme.templates.active', 'Aktiv')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)] line-clamp-2">
                      {template.description}
                    </p>
                  </div>

                  {/* Color Dots */}
                  <div className="flex items-center gap-1 mt-3">
                    <div 
                      className="w-4 h-4 rounded-full border border-black/10"
                      style={{ backgroundColor: template.theme.colors.primary }}
                      title={t('admin.theme.templates.primary', 'Primär')}
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-black/10"
                      style={{ backgroundColor: template.theme.colors.secondary }}
                      title={t('admin.theme.templates.secondary', 'Sekundär')}
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-black/10"
                      style={{ backgroundColor: template.theme.colors.background }}
                      title={t('admin.theme.templates.background', 'Hintergrund')}
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-black/10"
                      style={{ backgroundColor: template.theme.colors.surface }}
                      title={t('admin.theme.templates.surface', 'Oberfläche')}
                    />
                  </div>

                  {/* Hover Overlay */}
                  <div className={`
                    absolute inset-0 bg-[var(--color-primary)]/5 rounded-xl
                    flex items-center justify-center
                    opacity-0 group-hover:opacity-100 transition-opacity
                    ${isActive ? 'hidden' : ''}
                  `}>
                    <span className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg">
                      {t('admin.theme.templates.select', 'Auswählen')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Custom Option */}
      <div className="pt-6 border-t border-[var(--color-border)]">
        <button
          onClick={() => onSelect({
            id: 'custom',
            name: t('admin.theme.templates.custom', 'Benutzerdefiniert'),
            description: t('admin.theme.templates.customDesc', 'Starten Sie von Grund auf neu'),
            theme: defaultLightTheme,
            preview: 'linear-gradient(135deg, #e2e8f0 0%, #f8fafc 100%)',
            category: 'minimal',
          })}
          className="w-full py-4 border-2 border-dashed border-[var(--color-border)] rounded-xl text-center hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5 transition-colors"
        >
          <span className="text-2xl mb-2 block">✨</span>
          <span className="font-medium text-[var(--color-text)]">
            {t('admin.theme.templates.startFromScratch', 'Von Grund auf neu erstellen')}
          </span>
        </button>
      </div>
    </div>
  );
}

export default TemplateGallery;
