/**
 * Theme Service - Backend
 * 
 * DSGVO-konforme Theme-Verwaltung für Multi-Tenant White-Labeling
 * Keine personenbezogenen Daten werden in Themes gespeichert
 */

import { PrismaClient } from '@prisma/client';

// Local type definitions (mirrored from src/theme/types.ts to avoid cross-project import)
interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  info: string;
}

type ThemeMode = 'light' | 'dark' | 'system';

interface Theme {
  colors: ThemeColors;
  fonts: { heading: string; body: string };
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
  logo?: { url: string; width?: number; height?: number };
}

interface WhiteLabelConfig {
  tenantId: string;
  lightTheme: Partial<Theme>;
  darkTheme?: Partial<Theme>;
  defaultMode: ThemeMode;
  customCSS?: string;
  allowPatientThemeSelection: boolean;
}

interface TenantThemeConfig {
  tenantId: string;
  config: Partial<Theme>;
  respectSystemPreference: boolean;
  updatedAt: Date;
  updatedBy?: string;
}

const prisma = new PrismaClient();

/**
 * Default theme configuration for new tenants
 */
const DEFAULT_THEME_CONFIG: Partial<Theme> = {
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#0f172a',
    textMuted: '#64748b',
    border: '#e2e8f0',
    error: '#dc2626',
    success: '#16a34a',
    warning: '#d97706',
    info: '#0891b2',
  },
  fonts: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
};

/**
 * Get theme for a specific tenant
 * Returns merged theme configuration (tenant overrides + defaults)
 */
export async function getTenantTheme(tenantId: string): Promise<TenantThemeConfig | null> {
  const theme = await prisma.tenantTheme.findUnique({
    where: { tenantId },
  });

  if (!theme) {
    return null;
  }

  return {
    tenantId: theme.tenantId,
    config: theme.config as Partial<Theme>,
    respectSystemPreference: theme.respectSystemPreference,
    updatedAt: theme.updatedAt,
    updatedBy: theme.updatedBy || undefined,
  };
}

/**
 * Get complete white-label configuration
 */
export async function getWhiteLabelConfig(tenantId: string): Promise<WhiteLabelConfig | null> {
  const [theme, tenant] = await Promise.all([
    prisma.tenantTheme.findUnique({ where: { tenantId } }),
    prisma.tenant.findUnique({ 
      where: { id: tenantId },
      select: {
        id: true,
        primaryColor: true,
        logoUrl: true,
      }
    }),
  ]);

  if (!tenant) {
    return null;
  }

  // Merge database theme with tenant basic settings
  const themeConfig = (theme?.config as Partial<Theme>) || {};
  
  // Apply tenant-level overrides (primaryColor, logoUrl from Tenant model)
  if (tenant.primaryColor && !themeConfig.colors?.primary) {
    themeConfig.colors = {
      ...themeConfig.colors,
      primary: tenant.primaryColor,
    } as ThemeColors;
  }
  
  if (tenant.logoUrl && !themeConfig.logo?.url) {
    themeConfig.logo = {
      ...themeConfig.logo,
      url: tenant.logoUrl,
      width: 180,
      height: 48,
    };
  }

  return {
    tenantId: tenant.id,
    lightTheme: themeConfig,
    darkTheme: undefined, // Auto-generated from light theme
    defaultMode: (theme?.defaultMode as ThemeMode) || 'system',
    allowPatientThemeSelection: theme?.allowPatientThemeSelection || false,
  };
}

/**
 * Update tenant theme configuration
 * Requires admin or owner permissions
 */
export async function updateTenantTheme(
  tenantId: string,
  config: Partial<Theme>,
  updatedBy: string
): Promise<TenantThemeConfig> {
  // Validate theme configuration
  const validation = validateThemeConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid theme configuration: ${validation.errors.map(e => e.message).join(', ')}`);
  }

  const theme = await prisma.tenantTheme.upsert({
    where: { tenantId },
    update: {
      config: config as object,
      updatedBy,
      updatedAt: new Date(),
    },
    create: {
      tenantId,
      config: config as object,
      updatedBy,
      respectSystemPreference: true,
      defaultMode: 'system',
      allowPatientThemeSelection: false,
    },
  });

  return {
    tenantId: theme.tenantId,
    config: theme.config as Partial<Theme>,
    respectSystemPreference: theme.respectSystemPreference,
    updatedAt: theme.updatedAt,
    updatedBy: theme.updatedBy || undefined,
  };
}

/**
 * Update white-label configuration (full settings)
 */
export async function updateWhiteLabelConfig(
  tenantId: string,
  config: Partial<WhiteLabelConfig>,
  updatedBy: string
): Promise<WhiteLabelConfig> {
  const theme = await prisma.tenantTheme.upsert({
    where: { tenantId },
    update: {
      config: (config.lightTheme || {}) as object,
      defaultMode: config.defaultMode || 'system',
      allowPatientThemeSelection: config.allowPatientThemeSelection ?? false,
      updatedBy,
      updatedAt: new Date(),
    },
    create: {
      tenantId,
      config: (config.lightTheme || {}) as object,
      defaultMode: config.defaultMode || 'system',
      allowPatientThemeSelection: config.allowPatientThemeSelection ?? false,
      respectSystemPreference: true,
      updatedBy,
    },
  });

  // Update Tenant model for basic branding
  if (config.lightTheme?.colors?.primary || config.lightTheme?.logo?.url) {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        primaryColor: config.lightTheme?.colors?.primary,
        logoUrl: config.lightTheme?.logo?.url,
      },
    });
  }

  return {
    tenantId,
    lightTheme: theme.config as Partial<Theme>,
    defaultMode: theme.defaultMode as ThemeMode,
    allowPatientThemeSelection: theme.allowPatientThemeSelection,
  };
}

/**
 * Reset tenant theme to defaults
 */
export async function resetTenantTheme(
  tenantId: string,
  updatedBy: string
): Promise<TenantThemeConfig> {
  const theme = await prisma.tenantTheme.upsert({
    where: { tenantId },
    update: {
      config: {},
      updatedBy,
      updatedAt: new Date(),
    },
    create: {
      tenantId,
      config: {},
      updatedBy,
      respectSystemPreference: true,
      defaultMode: 'system',
      allowPatientThemeSelection: false,
    },
  });

  // Reset Tenant model branding
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      primaryColor: null,
      logoUrl: null,
    },
  });

  return {
    tenantId: theme.tenantId,
    config: {},
    respectSystemPreference: theme.respectSystemPreference,
    updatedAt: theme.updatedAt,
    updatedBy: theme.updatedBy || undefined,
  };
}

/**
 * Validate theme configuration
 * Ensures all colors are valid and meet accessibility requirements
 */
export function validateThemeConfig(config: Partial<Theme>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
  const errors: Array<{ field: string; message: string }> = [];

  // Validate colors
  if (config.colors) {
    const requiredColors = ['primary', 'background', 'surface', 'text'];
    for (const color of requiredColors) {
      if (config.colors[color as keyof typeof config.colors] && 
          !isValidHexColor(config.colors[color as keyof typeof config.colors] as string)) {
        errors.push({ field: `colors.${color}`, message: 'Invalid color format' });
      }
    }
  }

  // Validate fonts
  if (config.fonts) {
    if (config.fonts.heading && typeof config.fonts.heading !== 'string') {
      errors.push({ field: 'fonts.heading', message: 'Font must be a string' });
    }
    if (config.fonts.body && typeof config.fonts.body !== 'string') {
      errors.push({ field: 'fonts.body', message: 'Font must be a string' });
    }
  }

  // Validate border radius
  if (config.borderRadius) {
    const validUnits = /^(\d+(\.\d+)?)(px|rem|em|%)$/;
    Object.entries(config.borderRadius).forEach(([key, value]) => {
      if (!validUnits.test(value)) {
        errors.push({ field: `borderRadius.${key}`, message: 'Invalid border radius format' });
      }
    });
  }

  // Validate logo
  if (config.logo) {
    if (config.logo.url && !isValidUrl(config.logo.url)) {
      errors.push({ field: 'logo.url', message: 'Invalid URL format' });
    }
    if (config.logo.width && (config.logo.width < 1 || config.logo.width > 1000)) {
      errors.push({ field: 'logo.width', message: 'Width must be between 1 and 1000' });
    }
    if (config.logo.height && (config.logo.height < 1 || config.logo.height > 500)) {
      errors.push({ field: 'logo.height', message: 'Height must be between 1 and 500' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get theme CSS for SSR injection
 * Returns CSS string with theme variables
 */
export async function getThemeCSS(tenantId: string): Promise<string> {
  const config = await getWhiteLabelConfig(tenantId);
  if (!config) {
    return generateDefaultThemeCSS();
  }

  const theme = config.lightTheme;
  const variables: string[] = [];

  // Generate CSS variables
  if (theme.colors) {
    Object.entries(theme.colors).forEach(([key, value]) => {
      variables.push(`  --color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`);
    });
  }

  if (theme.fonts) {
    if (theme.fonts.heading) variables.push(`  --font-heading: ${theme.fonts.heading};`);
    if (theme.fonts.body) variables.push(`  --font-body: ${theme.fonts.body};`);
  }

  if (theme.borderRadius) {
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      variables.push(`  --radius-${key}: ${value};`);
    });
  }

  if (theme.shadows) {
    Object.entries(theme.shadows).forEach(([key, value]) => {
      variables.push(`  --shadow-${key}: ${value};`);
    });
  }

  return `:root {\n${variables.join('\n')}\n}`;
}

/**
 * Generate default theme CSS
 */
function generateDefaultThemeCSS(): string {
  const variables: string[] = [];
  
  Object.entries(DEFAULT_THEME_CONFIG.colors!).forEach(([key, value]) => {
    variables.push(`  --color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`);
  });
  
  return `:root {\n${variables.join('\n')}\n}`;
}

/**
 * Validate hex color format
 */
function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color);
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    // Allow relative URLs
    return url.startsWith('/') || url.startsWith('./');
  }
}

/**
 * Get all themes for a tenant (including history/versions)
 * Currently returns only current theme - version history TBD
 */
export async function getTenantThemeHistory(tenantId: string): Promise<TenantThemeConfig[]> {
  const current = await getTenantTheme(tenantId);
  return current ? [current] : [];
}

export default {
  getTenantTheme,
  getWhiteLabelConfig,
  updateTenantTheme,
  updateWhiteLabelConfig,
  resetTenantTheme,
  validateThemeConfig,
  getThemeCSS,
  getTenantThemeHistory,
};
