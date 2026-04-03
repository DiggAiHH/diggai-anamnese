/**
 * Device Fingerprinting Types
 * 
 * Types for device identification and trust scoring
 * following GDPR-compliant practices (no PII in fingerprints).
 */

/**
 * Individual components that make up a device fingerprint
 * All fields are optional to handle varying browser capabilities
 */
export interface DeviceFingerprintComponents {
  /** User agent string from browser */
  userAgent: string;
  /** Accept-Language header */
  acceptLanguage: string;
  /** Accept header for content negotiation */
  acceptHeaders: string;
  /** Screen resolution as "WIDTHxHEIGHT" (e.g., "1920x1080") */
  screenResolution?: string;
  /** Timezone identifier (e.g., "Europe/Berlin") */
  timezone?: string;
  /** Browser language setting (e.g., "de-DE") */
  language?: string;
  /** Platform/OS (e.g., "Win32", "MacIntel") */
  platform?: string;
  /** Screen color depth in bits */
  colorDepth?: number;
  /** Whether device supports touch events */
  touchSupport?: boolean;
  /** Whether cookies are enabled */
  cookiesEnabled?: boolean;
  /** List of installed fonts ( Canvas API) */
  fonts?: string[];
  /** WebGL vendor and renderer info */
  webglVendor?: string;
  /** Canvas fingerprint hash */
  canvasFingerprint?: string;
  /** WebRTC local IP addresses */
  localIps?: string[];
}

/**
 * Complete device fingerprint with hash and metadata
 */
export interface DeviceFingerprint {
  /** SHA-256 hash of all components (hex string, 64 chars) */
  hash: string;
  /** Individual fingerprint components */
  components: DeviceFingerprintComponents;
  /** Trust score from 0.0 (untrusted) to 1.0 (fully trusted) */
  trustScore: number;
  /** When this fingerprint was created */
  createdAt: Date;
  /** Optional: version of fingerprinting algorithm */
  version?: string;
}

/**
 * Result of device trust evaluation
 */
export interface DeviceTrustResult {
  /** Unique device identifier (hash-based) */
  deviceId: string;
  /** Whether device is considered trusted */
  isTrusted: boolean;
  /** Whether this is a previously unseen device */
  isNewDevice: boolean;
  /** Similarity score 0.0-1.0 compared to known devices */
  similarityScore: number;
  /** Whether additional verification is required */
  requiresVerification: boolean;
  /** When device was last seen (undefined for new devices) */
  lastSeenAt?: Date;
  /** Risk factors detected */
  riskFactors?: DeviceRiskFactor[];
}

/**
 * Risk factors for device trust evaluation
 */
export interface DeviceRiskFactor {
  /** Type of risk */
  type: 'vpn' | 'proxy' | 'tor' | 'datacenter' | 'emulator' | 'automation' | 'suspicious';
  /** Risk severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Human-readable description */
  description: string;
}

/**
 * Stored device record for a user
 */
export interface UserDevice {
  /** Unique device ID */
  id: string;
  /** User ID this device belongs to */
  userId: string;
  /** Device fingerprint hash */
  fingerprintHash: string;
  /** Optional: fingerprint components for similarity comparison */
  components?: DeviceFingerprintComponents;
  /** Device name (user-assigned or auto-generated) */
  name: string;
  /** Device type categorization */
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  /** Whether device is trusted */
  isTrusted: boolean;
  /** When device was first registered */
  firstSeenAt: Date;
  /** When device was last used */
  lastSeenAt: Date;
  /** Number of successful logins */
  successCount: number;
  /** Number of failed login attempts */
  failureCount: number;
  /** Current trust score */
  trustScore: number;
}

/**
 * Configuration for device fingerprinting service
 */
export interface DeviceFingerprintConfig {
  /** Minimum trust score to consider device trusted (default: 0.7) */
  minTrustScore: number;
  /** Threshold for requiring verification (default: 0.5) */
  verificationThreshold: number;
  /** How long to remember devices in days (default: 90) */
  deviceRetentionDays: number;
  /** Maximum devices per user (default: 10) */
  maxDevicesPerUser: number;
  /** Whether to use advanced fingerprinting (Canvas, WebGL) */
  useAdvancedFingerprinting: boolean;
  /** Weight factors for trust score calculation */
  weights: {
    similarity: number;
    knownDevice: number;
    loginHistory: number;
  };
}

/**
 * Login attempt record for trust calculation
 */
export interface LoginAttempt {
  /** Whether login was successful */
  success: boolean;
  /** When the attempt occurred */
  timestamp: Date;
  /** Device fingerprint hash used */
  deviceFingerprint?: string;
  /** IP address of the attempt */
  ipAddress?: string;
  /** Failure reason (if unsuccessful) */
  failureReason?: string;
}
