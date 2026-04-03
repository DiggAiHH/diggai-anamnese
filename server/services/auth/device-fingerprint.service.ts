/**
 * Device Fingerprinting Service
 * 
 * Provides device identification and trust scoring for security purposes.
 * All fingerprints are hashed with SHA-256; no PII is stored in plain text.
 * 
 * @module device-fingerprint.service
 */

import * as crypto from 'crypto';
import type { Request } from 'express';
import type {
  DeviceFingerprint,
  DeviceFingerprintComponents,
  DeviceTrustResult,
  DeviceFingerprintConfig,
  LoginAttempt,
  DeviceRiskFactor,
} from '../../types/device-fingerprint';

/** Default configuration */
const DEFAULT_CONFIG: DeviceFingerprintConfig = {
  minTrustScore: 0.7,
  verificationThreshold: 0.5,
  deviceRetentionDays: 90,
  maxDevicesPerUser: 10,
  useAdvancedFingerprinting: false,
  weights: {
    similarity: 0.4,
    knownDevice: 0.3,
    loginHistory: 0.3,
  },
};

/** Current service configuration */
let config: DeviceFingerprintConfig = { ...DEFAULT_CONFIG };

/**
 * Configure the device fingerprinting service
 * @param newConfig - Partial configuration to apply
 */
export function configureFingerprintService(
  newConfig: Partial<DeviceFingerprintConfig>
): void {
  config = { ...config, ...newConfig };
}

/**
 * Get current configuration
 * @returns Current service configuration
 */
export function getFingerprintConfig(): DeviceFingerprintConfig {
  return { ...config };
}

/**
 * Reset configuration to defaults (useful for testing)
 */
export function resetFingerprintConfig(): void {
  config = { ...DEFAULT_CONFIG };
}

/**
 * Extracts device components from an Express request
 * @param req - Express request object
 * @returns Device fingerprint components
 */
export function extractComponentsFromRequest(req: Request): DeviceFingerprintComponents {
  // Get client IP (handles proxies)
  const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 
                   req.socket?.remoteAddress || 
                   '';

  return {
    userAgent: req.headers['user-agent'] || '',
    acceptLanguage: req.headers['accept-language'] || '',
    acceptHeaders: req.headers['accept'] || '',
    // Additional components can be sent from frontend via req.body
    screenResolution: req.body?.screenResolution,
    timezone: req.body?.timezone,
    language: req.body?.language,
    platform: req.body?.platform,
    colorDepth: req.body?.colorDepth,
    touchSupport: req.body?.touchSupport,
    cookiesEnabled: req.body?.cookiesEnabled,
    fonts: req.body?.fonts,
    canvasFingerprint: req.body?.canvasFingerprint,
    webglVendor: req.body?.webglVendor,
    // Never include PII like local IPs without explicit consent
  };
}

/**
 * Generates a deterministic JSON string for hashing
 * @param components - Device components to serialize
 * @returns Canonical JSON string
 */
function serializeComponents(components: DeviceFingerprintComponents): string {
  // Sort keys for deterministic output
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(components).sort()) {
    const value = components[key as keyof DeviceFingerprintComponents];
    // Skip undefined values and empty strings
    if (value !== undefined && value !== '') {
      sorted[key] = value;
    }
  }
  return JSON.stringify(sorted);
}

/**
 * Generates a SHA-256 hash of device components
 * @param components - Device components to hash
 * @returns SHA-256 hex string (64 characters)
 */
export function generateFingerprintHash(components: DeviceFingerprintComponents): string {
  const data = serializeComponents(components);
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generates a complete device fingerprint from an Express request
 * @param req - Express request object
 * @returns Complete device fingerprint with hash
 */
export function generateFingerprint(req: Request): DeviceFingerprint {
  const components = extractComponentsFromRequest(req);
  const hash = generateFingerprintHash(components);

  return {
    hash,
    components,
    trustScore: 0.5, // Initial neutral score
    createdAt: new Date(),
    version: '1.0.0',
  };
}

/**
 * Generates fingerprint from components directly (for testing/external sources)
 * @param components - Device fingerprint components
 * @returns Complete device fingerprint with hash
 */
export function generateFingerprintFromComponents(
  components: DeviceFingerprintComponents
): DeviceFingerprint {
  const hash = generateFingerprintHash(components);

  return {
    hash,
    components,
    trustScore: 0.5,
    createdAt: new Date(),
    version: '1.0.0',
  };
}

/**
 * Component weights for similarity calculation
 * Higher weight = more significant for device identification
 */
const COMPONENT_WEIGHTS: Record<string, number> = {
  userAgent: 3,
  platform: 2,
  screenResolution: 2,
  acceptLanguage: 2,
  timezone: 1,
  colorDepth: 1,
  touchSupport: 1,
  canvasFingerprint: 4,
  webglVendor: 2,
};

/**
 * Compares two fingerprints and returns a similarity score
 * @param fp1 - First fingerprint hash
 * @param fp2 - Second fingerprint hash
 * @param components1 - Optional components for detailed comparison
 * @param components2 - Optional components for detailed comparison
 * @returns Similarity score from 0.0 to 1.0
 */
export function compareFingerprints(
  fp1: string,
  fp2: string,
  components1?: DeviceFingerprintComponents,
  components2?: DeviceFingerprintComponents
): number {
  // Exact hash match
  if (fp1 === fp2) return 1.0;

  // If components available, perform detailed comparison
  if (components1 && components2) {
    let totalWeight = 0;
    let matchedWeight = 0;

    for (const [key, weight] of Object.entries(COMPONENT_WEIGHTS)) {
      const val1 = components1[key as keyof DeviceFingerprintComponents];
      const val2 = components2[key as keyof DeviceFingerprintComponents];

      // Only compare if both values are present
      if (val1 !== undefined && val2 !== undefined) {
        totalWeight += weight;
        if (val1 === val2) {
          matchedWeight += weight;
        }
      }
    }

    // Fallback to basic comparison if no weighted components matched
    if (totalWeight === 0) {
      return 0;
    }

    return matchedWeight / totalWeight;
  }

  // No components available: hash mismatch means 0 similarity
  return 0;
}

/**
 * Detects potential risk factors from device components
 * @param components - Device fingerprint components
 * @returns Array of detected risk factors
 */
export function detectRiskFactors(
  components: DeviceFingerprintComponents
): DeviceRiskFactor[] {
  const risks: DeviceRiskFactor[] = [];

  const ua = components.userAgent?.toLowerCase() || '';

  // Check for automation indicators
  if (
    ua.includes('headless') ||
    ua.includes('phantomjs') ||
    ua.includes('selenium') ||
    ua.includes('webdriver') ||
    ua.includes('puppeteer') ||
    ua.includes('playwright')
  ) {
    risks.push({
      type: 'automation',
      severity: 'high',
      description: 'Automation framework detected in User-Agent',
    });
  }

  // Check for emulator indicators
  if (
    ua.includes('emulator') ||
    ua.includes('sdk built') ||
    (components.platform === 'Linux i686' && ua.includes('android'))
  ) {
    risks.push({
      type: 'emulator',
      severity: 'medium',
      description: 'Possible emulator or simulator detected',
    });
  }

  // Check for missing expected browser features
  if (components.cookiesEnabled === false) {
    risks.push({
      type: 'suspicious',
      severity: 'low',
      description: 'Cookies are disabled',
    });
  }

  // Inconsistent screen resolution (common in VMs)
  if (components.screenResolution) {
    const [width] = components.screenResolution.split('x').map(Number);
    if (width && width < 800) {
      risks.push({
        type: 'suspicious',
        severity: 'low',
        description: 'Unusually small screen resolution',
      });
    }
  }

  return risks;
}

/**
 * Calculates trust score based on multiple factors
 * @param similarityScore - Device similarity to known devices (0-1)
 * @param isKnownDevice - Whether this is a previously seen device
 * @param loginHistory - Recent login attempts
 * @returns Trust score from 0.0 to 1.0
 */
export function calculateTrustScore(
  similarityScore: number,
  isKnownDevice: boolean,
  loginHistory: LoginAttempt[]
): number {
  const { weights } = config;

  let score = 0;

  // Similarity contribution (0 to weights.similarity)
  score += similarityScore * weights.similarity;

  // Known device bonus
  if (isKnownDevice) {
    score += weights.knownDevice;
  }

  // Login history contribution
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentLogins = loginHistory.filter((l) => l.timestamp > thirtyDaysAgo);

  if (recentLogins.length > 0) {
    const successfulLogins = recentLogins.filter((l) => l.success).length;
    const successRate = successfulLogins / recentLogins.length;

    // Penalize recent failures
    const recentFailures = recentLogins
      .filter((l) => !l.success)
      .filter((l) => l.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000));

    let historyScore = successRate * weights.loginHistory;

    // Reduce score for recent failures
    if (recentFailures.length > 0) {
      historyScore *= Math.max(0, 1 - recentFailures.length * 0.2);
    }

    score += historyScore;
  }

  // Clamp between 0 and 1
  return Math.min(1, Math.max(0, score));
}

/**
 * Determines if device verification is required
 * @param trustScore - Calculated trust score
 * @param isNewDevice - Whether device is new
 * @param userMfaEnabled - Whether user has MFA enabled
 * @param riskFactors - Detected risk factors
 * @returns True if verification is required
 */
export function requiresVerification(
  trustScore: number,
  isNewDevice: boolean,
  userMfaEnabled: boolean,
  riskFactors: DeviceRiskFactor[] = []
): boolean {
  // Always require verification for critical risk factors
  const criticalRisks = riskFactors.filter((r) => r.severity === 'critical');
  if (criticalRisks.length > 0) {
    return true;
  }

  // MFA enabled + new device = verification required
  if (userMfaEnabled && isNewDevice) {
    return true;
  }

  // Trust score below threshold
  if (trustScore < config.verificationThreshold) {
    return true;
  }

  // New device without MFA = verification required
  if (isNewDevice && !userMfaEnabled) {
    return true;
  }

  // High risk factors trigger verification even with decent trust score
  const highRisks = riskFactors.filter((r) => r.severity === 'high');
  if (highRisks.length > 0 && trustScore < config.minTrustScore) {
    return true;
  }

  return false;
}

/**
 * Evaluates device trust and returns complete result
 * @param fingerprint - Current device fingerprint
 * @param knownDevices - User's known devices
 * @param loginHistory - User's recent login history
 * @param userMfaEnabled - Whether user has MFA enabled
 * @returns Complete trust evaluation result
 */
export function evaluateDeviceTrust(
  fingerprint: DeviceFingerprint,
  knownDevices: Array<{ fingerprintHash: string; components?: DeviceFingerprintComponents; lastSeenAt: Date }>,
  loginHistory: LoginAttempt[],
  userMfaEnabled: boolean
): DeviceTrustResult {
  // Find best matching known device
  let bestMatch: { similarity: number; device?: typeof knownDevices[0] } = {
    similarity: 0,
  };

  for (const device of knownDevices) {
    const similarity = compareFingerprints(
      fingerprint.hash,
      device.fingerprintHash,
      fingerprint.components,
      device.components
    );

    if (similarity > bestMatch.similarity) {
      bestMatch = { similarity, device };
    }
  }

  // Detect risk factors
  const riskFactors = detectRiskFactors(fingerprint.components);

  // Calculate trust score
  const isKnownDevice = bestMatch.similarity >= 0.8;
  const trustScore = calculateTrustScore(
    bestMatch.similarity,
    isKnownDevice,
    loginHistory
  );

  // Determine if verification is required
  const needsVerification = requiresVerification(
    trustScore,
    !isKnownDevice,
    userMfaEnabled,
    riskFactors
  );

  return {
    deviceId: fingerprint.hash,
    isTrusted: trustScore >= config.minTrustScore && isKnownDevice,
    isNewDevice: !isKnownDevice,
    similarityScore: bestMatch.similarity,
    requiresVerification: needsVerification,
    lastSeenAt: bestMatch.device?.lastSeenAt,
    riskFactors: riskFactors.length > 0 ? riskFactors : undefined,
  };
}

/**
 * Generates a human-readable device name from components
 * @param components - Device fingerprint components
 * @returns Human-readable device name
 */
export function generateDeviceName(components: DeviceFingerprintComponents): string {
  const ua = components.userAgent || '';
  
  // Extract browser name
  let browser = 'Unknown Browser';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('Opera')) browser = 'Opera';

  // Extract OS
  let os = 'Unknown OS';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // Determine device type
  let type = '';
  if (components.touchSupport && (os === 'Android' || os === 'iOS')) {
    type = 'Mobile';
  } else if (components.touchSupport) {
    type = 'Tablet';
  } else {
    type = 'Desktop';
  }

  return `${browser} on ${os} ${type}`;
}

/**
 * Checks if a device is trusted based on fingerprint comparison
 * @param fingerprint - Current device fingerprint hash
 * @param storedHash - Stored fingerprint hash from database
 * @param trustExpiresAt - Optional expiration date for trust
 * @param lastVerifiedAt - Optional last verification date
 * @returns True if device is considered trusted
 */
export function isTrustedDevice(
  fingerprint: string,
  storedHash: string,
  trustExpiresAt?: Date | null,
  lastVerifiedAt?: Date | null
): boolean {
  // Check if trust has expired
  if (trustExpiresAt && trustExpiresAt < new Date()) {
    return false;
  }

  // Check if device was ever verified
  if (!lastVerifiedAt) {
    return false;
  }

  // Compare fingerprint hashes
  return fingerprint === storedHash;
}

/**
 * Determines device type from components
 * @param components - Device fingerprint components
 * @returns Device type classification
 */
export function getDeviceType(
  components: DeviceFingerprintComponents
): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
  const ua = components.userAgent?.toLowerCase() || '';

  // Check for mobile indicators
  const isMobile = /mobile|android|iphone|ipod|windows phone/.test(ua);
  const isTablet = /ipad|android(?!.*mobile)|tablet/.test(ua) || 
                   (components.platform === 'MacIntel' && components.touchSupport);

  if (isTablet) return 'tablet';
  if (isMobile) return 'mobile';
  if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) {
    return 'desktop';
  }

  return 'unknown';
}
