import type { Request, Response, NextFunction } from 'express';
import { analyzeLoginEvent, RISK_THRESHOLDS, hashIp } from '../services/auth/analytics.service';
import * as crypto from 'crypto';

/**
 * Generate device fingerprint from request
 */
function generateFingerprint(req: Request): { hash: string; components: string[] } {
  const components: string[] = [
    String(req.headers['user-agent'] || 'unknown'),
    String(req.headers['accept-language'] || 'unknown'),
    String(req.headers['accept'] || 'unknown'),
    String(req.headers['sec-ch-ua-platform'] || 'unknown'),
    String(req.headers['sec-ch-ua-mobile'] || 'unknown'),
  ];

  const combined = components.join('|');
  const hash = crypto.createHash('sha256').update(combined).digest('hex').substring(0, 32);

  return { hash, components };
}

/**
 * Extended request with risk assessment
 */
interface RiskAssessmentRequest extends Request {
  riskAssessment?: {
    allowed: boolean;
    riskFactors: {
      newDevice: boolean;
      newLocation: boolean;
      impossibleTravel: boolean;
      rapidAttempts: boolean;
      offHours: boolean;
      riskScore: number;
    };
    requires2FA: boolean;
    alertTriggered: boolean;
  };
}

/**
 * Middleware for risk-based authentication
 * Analyzes login attempts and requires additional verification if suspicious
 */
export async function riskBasedAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Only apply to login endpoints
  if (!req.path.includes('/login')) {
    next();
    return;
  }

  // Skip if login hasn't been attempted yet
  if (req.method !== 'POST') {
    next();
    return;
  }

  try {
    const userId = (req.body.username as string) || (req.body.identifier as string) || 'unknown';
    const ipHash = req.ip ? hashIp(req.ip) : 'unknown';

    const fingerprint = generateFingerprint(req);

    const analysis = await analyzeLoginEvent({
      userId,
      userType: 'PATIENT', // Would need to determine from context
      timestamp: new Date(),
      ipHash,
      deviceFingerprint: fingerprint.hash,
      userAgent: req.headers['user-agent'] || 'unknown',
      success: false, // Will be updated after actual auth
    });

    // If impossible travel detected, block immediately
    if (!analysis.allowed) {
      res.status(403).json({
        error: 'Login blocked due to suspicious activity',
        code: 'IMPOSSIBLE_TRAVEL',
        requiresVerification: true,
      });
      return;
    }

    // If high risk, require additional verification
    if (analysis.requires2FA) {
      // Store risk assessment in request for later use
      (req as RiskAssessmentRequest).riskAssessment = analysis;

      // Continue but flag for 2FA requirement
      next();
      return;
    }

    next();
  } catch (error) {
    console.error('[RiskAuth] Error:', error);
    // Fail open - allow login but log error
    next();
  }
}

/**
 * Check if current login requires additional verification
 */
export function requiresAdditionalVerification(req: Request): boolean {
  const riskReq = req as RiskAssessmentRequest;
  return riskReq.riskAssessment?.requires2FA ?? false;
}

/**
 * Get risk score for current login
 */
export function getRiskScore(req: Request): number {
  const riskReq = req as RiskAssessmentRequest;
  return riskReq.riskAssessment?.riskFactors?.riskScore ?? 0;
}

/**
 * Get full risk assessment for current login
 */
export function getRiskAssessment(req: Request): RiskAssessmentRequest['riskAssessment'] | undefined {
  return (req as RiskAssessmentRequest).riskAssessment;
}

export { RISK_THRESHOLDS };
