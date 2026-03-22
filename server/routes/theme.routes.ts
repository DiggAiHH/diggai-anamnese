/**
 * Theme API Routes
 * 
 * REST API for white-labeling theme management
 * All routes require authentication and appropriate permissions
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import * as themeService from '../services/theme/theme.service';

type ThemeMode = 'light' | 'dark' | 'system';

/** Extract a route param as a guaranteed string (Express 5 compat) */
function param(req: Request, key: string): string {
    const v = req.params[key];
    return Array.isArray(v) ? v[0] : v;
}

const router = Router();

/**
 * GET /api/tenant/:tenantId/theme
 * Get theme configuration for a tenant (public endpoint - no auth required)
 * Only returns non-sensitive styling information
 */
router.get('/tenant/:tenantId/theme', async (req: Request, res: Response) => {
  try {
    const tenantId = param(req, 'tenantId');
    
    const config = await themeService.getWhiteLabelConfig(tenantId);
    
    if (!config) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Return only styling info - no internal IDs or sensitive data
    res.json({
      theme: config.lightTheme,
      mode: config.defaultMode,
      allowSelection: config.allowPatientThemeSelection,
    });
  } catch (error) {
    console.error('Error fetching tenant theme:', error);
    res.status(500).json({ error: 'Failed to fetch theme' });
  }
});

/**
 * GET /api/tenant/:tenantId/theme/css
 * Get theme as CSS for SSR or direct injection (public)
 */
router.get('/tenant/:tenantId/theme/css', async (req: Request, res: Response) => {
  try {
    const tenantId = param(req, 'tenantId');
    
    const css = await themeService.getThemeCSS(tenantId);
    
    res.setHeader('Content-Type', 'text/css');
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.send(css);
  } catch (error) {
    console.error('Error generating theme CSS:', error);
    res.status(500).send('/* Error generating theme CSS */');
  }
});

/**
 * GET /api/admin/theme
 * Get full white-label config for admin (requires admin auth)
 */
router.get('/admin/theme', 
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.auth?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID required' });
      }

      const config = await themeService.getWhiteLabelConfig(tenantId);
      
      if (!config) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      res.json(config);
    } catch (error) {
      console.error('Error fetching admin theme:', error);
      res.status(500).json({ error: 'Failed to fetch theme configuration' });
    }
  }
);

/**
 * PUT /api/admin/theme
 * Update theme configuration (requires admin auth)
 */
router.put('/admin/theme',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.auth?.tenantId;
      const userId = req.auth?.userId;
      
      if (!tenantId || !userId) {
        return res.status(400).json({ error: 'Authentication required' });
      }

      const { lightTheme, darkTheme, defaultMode, allowPatientThemeSelection } = req.body;

      // Validate mode if provided
      if (defaultMode && !['light', 'dark', 'system'].includes(defaultMode)) {
        return res.status(400).json({ error: 'Invalid mode. Must be light, dark, or system' });
      }

      const config = await themeService.updateWhiteLabelConfig(
        tenantId,
        {
          lightTheme,
          darkTheme,
          defaultMode: defaultMode as ThemeMode,
          allowPatientThemeSelection,
        },
        userId
      );

      res.json(config);
    } catch (error) {
      console.error('Error updating theme:', error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update theme' });
      }
    }
  }
);

/**
 * POST /api/admin/theme/validate
 * Validate theme configuration without saving
 */
router.post('/admin/theme/validate',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const { theme } = req.body;
      
      if (!theme) {
        return res.status(400).json({ error: 'Theme configuration required' });
      }

      const validation = themeService.validateThemeConfig(theme);
      
      res.json(validation);
    } catch (error) {
      console.error('Error validating theme:', error);
      res.status(500).json({ error: 'Validation failed' });
    }
  }
);

/**
 * POST /api/admin/theme/reset
 * Reset theme to defaults
 */
router.post('/admin/theme/reset',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.auth?.tenantId;
      const userId = req.auth?.userId;
      
      if (!tenantId || !userId) {
        return res.status(400).json({ error: 'Authentication required' });
      }

      const config = await themeService.resetTenantTheme(tenantId, userId);

      res.json(config);
    } catch (error) {
      console.error('Error resetting theme:', error);
      res.status(500).json({ error: 'Failed to reset theme' });
    }
  }
);

/**
 * GET /api/admin/theme/templates
 * Get available theme templates
 */
router.get('/admin/theme/templates',
  requireAuth,
  requireRole('admin'),
  async (_req: Request, res: Response) => {
    try {
      // Import templates from frontend (shared types)
      const templates = [
        {
          id: 'diggai-light',
          name: 'DiggAI Light',
          description: 'Standard helles Theme mit professioneller Blau-Palette',
          category: 'medical',
        },
        {
          id: 'diggai-dark',
          name: 'DiggAI Dark',
          description: 'Optimiert für dunkle Umgebungen',
          category: 'modern',
        },
        {
          id: 'medical-teal',
          name: 'Medical Professional',
          description: 'Beruhigende Teal-Palette für medizinische Umgebungen',
          category: 'medical',
        },
        {
          id: 'high-contrast',
          name: 'Hoher Kontrast',
          description: 'Maximale Lesbarkeit für Sehbeeinträchtigungen',
          category: 'medical',
        },
        {
          id: 'minimal',
          name: 'Minimal Clean',
          description: 'Ultra-minimales Design',
          category: 'minimal',
        },
      ];

      res.json(templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  }
);

/**
 * POST /api/admin/theme/apply-template
 * Apply a predefined template
 */
router.post('/admin/theme/apply-template',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.auth?.tenantId;
      const userId = req.auth?.userId;
      const { templateId } = req.body;
      
      if (!tenantId || !userId) {
        return res.status(400).json({ error: 'Authentication required' });
      }

      if (!templateId) {
        return res.status(400).json({ error: 'Template ID required' });
      }

      // Import and apply template
      const mod = await import('../../src/theme/defaultThemes') as unknown as { themeTemplates: Array<{ id: string; theme: Record<string, string> }> };
      const { themeTemplates } = mod;
      const template = themeTemplates.find(t => t.id === templateId);
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const config = await themeService.updateWhiteLabelConfig(
        tenantId,
        {
          lightTheme: template.theme,
        },
        userId
      );

      res.json(config);
    } catch (error) {
      console.error('Error applying template:', error);
      res.status(500).json({ error: 'Failed to apply template' });
    }
  }
);

export default router;
