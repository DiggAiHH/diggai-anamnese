/**
 * Theme API Hook
 * 
 * React Query hooks for theme API integration
 * Handles fetching and updating tenant themes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Theme, ThemeMode, WhiteLabelConfig } from '../theme/types';

const THEME_API_BASE = '/api';

// Query keys
export const themeKeys = {
  all: ['theme'] as const,
  tenant: (tenantId: string) => [...themeKeys.all, 'tenant', tenantId] as const,
  admin: (tenantId: string) => [...themeKeys.all, 'admin', tenantId] as const,
  css: (tenantId: string) => [...themeKeys.all, 'css', tenantId] as const,
};

interface TenantThemeResponse {
  theme: Partial<Theme>;
  mode: ThemeMode;
  allowSelection: boolean;
}

interface SaveThemeParams {
  tenantId: string;
  theme: Partial<Theme>;
  mode: ThemeMode;
  allowPatientSelection: boolean;
}

/**
 * Fetch public theme for a tenant
 * No authentication required
 */
export function useTenantTheme(tenantId: string) {
  return useQuery({
    queryKey: themeKeys.tenant(tenantId),
    queryFn: async (): Promise<TenantThemeResponse> => {
      const response = await fetch(`${THEME_API_BASE}/tenant/${tenantId}/theme`);
      if (!response.ok) {
        throw new Error('Failed to fetch theme');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Fetch admin theme configuration
 * Requires authentication
 */
export function useAdminTheme(tenantId: string) {
  return useQuery({
    queryKey: themeKeys.admin(tenantId),
    queryFn: async (): Promise<WhiteLabelConfig> => {
      const response = await fetch(`${THEME_API_BASE}/admin/theme`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch admin theme');
      }
      return response.json();
    },
    enabled: !!tenantId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Save theme configuration
 * Admin only
 */
export function useSaveTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveThemeParams): Promise<WhiteLabelConfig> => {
      const response = await fetch(`${THEME_API_BASE}/admin/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          lightTheme: params.theme,
          defaultMode: params.mode,
          allowPatientThemeSelection: params.allowPatientSelection,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to save theme');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: themeKeys.admin(variables.tenantId) });
      queryClient.invalidateQueries({ queryKey: themeKeys.tenant(variables.tenantId) });
    },
  });
}

/**
 * Reset theme to defaults
 * Admin only
 */
export function useResetTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_tenantId: string): Promise<WhiteLabelConfig> => {
      const response = await fetch(`${THEME_API_BASE}/admin/theme/reset`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to reset theme');
      }

      return response.json();
    },
    onSuccess: (_, tenantId) => {
      queryClient.invalidateQueries({ queryKey: themeKeys.admin(tenantId) });
      queryClient.invalidateQueries({ queryKey: themeKeys.tenant(tenantId) });
    },
  });
}

/**
 * Apply a theme template
 * Admin only
 */
export function useApplyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId: _tenantId, templateId }: { tenantId: string; templateId: string }): Promise<WhiteLabelConfig> => {
      // _tenantId used in URL path for multi-tenant support
      const response = await fetch(`${THEME_API_BASE}/admin/theme/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ templateId }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply template');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: themeKeys.admin(variables.tenantId) });
    },
  });
}

/**
 * Validate theme configuration
 * Admin only
 */
export function useValidateTheme() {
  return useMutation({
    mutationFn: async (theme: Partial<Theme>): Promise<{ valid: boolean; errors: Array<{ field: string; message: string }> }> => {
      const response = await fetch(`${THEME_API_BASE}/admin/theme/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ theme }),
      });

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      return response.json();
    },
  });
}

/**
 * Fetch available theme templates
 */
export function useThemeTemplates() {
  return useQuery({
    queryKey: [...themeKeys.all, 'templates'],
    queryFn: async () => {
      const response = await fetch(`${THEME_API_BASE}/admin/theme/templates`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      return response.json();
    },
  });
}

/**
 * Get theme CSS for SSR
 */
export function useThemeCSS(tenantId: string) {
  return useQuery({
    queryKey: themeKeys.css(tenantId),
    queryFn: async (): Promise<string> => {
      const response = await fetch(`${THEME_API_BASE}/tenant/${tenantId}/theme/css`);
      if (!response.ok) {
        throw new Error('Failed to fetch theme CSS');
      }
      return response.text();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export default {
  useTenantTheme,
  useAdminTheme,
  useSaveTheme,
  useResetTheme,
  useApplyTemplate,
  useValidateTheme,
  useThemeTemplates,
  useThemeCSS,
  themeKeys,
};
