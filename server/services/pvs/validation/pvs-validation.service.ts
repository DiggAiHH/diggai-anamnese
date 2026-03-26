// ============================================
// PVS Validation Service
// ============================================
// Zod-basierte Validierung für alle PVS-Eingaben

import { z } from 'zod';

// Enums
const PvsTypeSchema = z.enum([
  'CGM_M1', 'MEDATIXX', 'MEDISTAR', 'T2MED', 
  'X_ISYNET', 'DOCTOLIB', 'TURBOMED', 
  'FHIR_GENERIC', 'ALBIS', 'TOMEDO'
]);

// GDT Connection Schema
export const GdtConnectionSchema = z.object({
  id: z.string().min(1),
  praxisId: z.string().min(1),
  pvsType: PvsTypeSchema,
  protocol: z.literal('GDT'),
  isActive: z.boolean().default(true),
  syncIntervalSec: z.number().min(5).max(3600).default(30),
  retryCount: z.number().min(0).max(10).default(3),
  autoMapFields: z.boolean().default(true),
  
  // GDT-specific
  gdtImportDir: z.string().min(1).optional(),
  gdtExportDir: z.string().min(1).optional(),
  gdtFilePattern: z.string().default('*.gdt'),
  gdtEncoding: z.enum(['ISO-8859-1', 'ISO-8859-15', 'UTF-8']).default('ISO-8859-15'),
  gdtSenderId: z.string().min(1).max(15).default('DIGGAI01'),
  gdtReceiverId: z.string().min(1).max(15).optional(),
  
  // Credentials (encrypted)
  credentials: z.record(z.string(), z.unknown()).optional(),
});

// FHIR Connection Schema
export const FhirConnectionSchema = z.object({
  id: z.string().min(1),
  praxisId: z.string().min(1),
  pvsType: PvsTypeSchema,
  protocol: z.enum(['FHIR', 'REST']),
  isActive: z.boolean().default(true),
  syncIntervalSec: z.number().min(5).max(3600).default(30),
  retryCount: z.number().min(0).max(10).default(3),
  autoMapFields: z.boolean().default(true),
  
  // FHIR-specific
  fhirBaseUrl: z.string().url(),
  fhirAuthType: z.enum(['basic', 'oauth2', 'apikey']),
  fhirCredentials: z.string().optional(), // encrypted
  fhirTenantId: z.string().optional(),
  fhirVersion: z.enum(['R4', 'R4B', 'R5']).default('R4'),
  
  // OAuth2-specific
  fhirTokenUrl: z.string().url().optional(),
  fhirClientId: z.string().optional(),
  fhirScope: z.string().optional(),
});

// Union schema
export const PvsConnectionSchema = z.discriminatedUnion('protocol', [
  GdtConnectionSchema,
  FhirConnectionSchema,
]);

// Export types
export type ValidatedGdtConnection = z.infer<typeof GdtConnectionSchema>;
export type ValidatedFhirConnection = z.infer<typeof FhirConnectionSchema>;
export type ValidatedPvsConnection = z.infer<typeof PvsConnectionSchema>;

/**
 * Validate connection configuration
 */
export function validateConnection(
  data: unknown
): { success: true; data: ValidatedPvsConnection } | { success: false; errors: z.ZodError } {
  const result = PvsConnectionSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Validate GDT file content
 */
export function validateGdtContent(content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check line endings
  if (!content.includes('\r\n') && !content.includes('\n')) {
    errors.push('Invalid line endings');
  }
  
  const lines = content.split(/\r?\n/);
  
  // Check for 8000 record (length)
  const lengthLine = lines.find(l => l.startsWith('8000'));
  if (!lengthLine) {
    errors.push('Missing 8000 length record');
  }
  
  // Check for 8100 record (sender)
  const senderLine = lines.find(l => l.startsWith('8100'));
  if (!senderLine) {
    errors.push('Missing 8100 sender record');
  }
  
  // Check for 8200 record (receiver)
  const receiverLine = lines.find(l => l.startsWith('8200'));
  if (!receiverLine) {
    errors.push('Missing 8200 receiver record');
  }
  
  // Check for 9200 record (end)
  const endLine = lines.find(l => l.startsWith('9200'));
  if (!endLine) {
    errors.push('Missing 9200 end record');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate FHIR Bundle
 */
export function validateFhirBundle(bundle: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!bundle || typeof bundle !== 'object') {
    errors.push('Bundle must be an object');
    return { valid: false, errors };
  }
  
  const b = bundle as Record<string, unknown>;
  
  // Check resourceType
  if (b.resourceType !== 'Bundle') {
    errors.push('Resource must be a Bundle');
  }
  
  // Check type
  if (!b.type) {
    errors.push('Bundle must have a type');
  }
  
  // Check entry
  if (!Array.isArray(b.entry)) {
    errors.push('Bundle must have an entry array');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate patient data
 */
export const PatientDataSchema = z.object({
  patientNr: z.string().optional(),
  versichertenNr: z.string().optional(),
  name: z.string().optional(),
  surname: z.string().optional(),
  birthDate: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/).optional(),
  gender: z.enum(['M', 'W', 'D', '']).optional(),
  street: z.string().optional(),
  zip: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
});

export type ValidatedPatientData = z.infer<typeof PatientDataSchema>;

/**
 * Sanitize string for GDT
 */
export function sanitizeGdtString(input: string): string {
  // Remove control characters except allowed ones
  return input
    .replace(/[^\x20-\x7EäöüÄÖÜß]/g, '')
    .substring(0, 255); // Max length for GDT fields
}

/**
 * Validate and sanitize patient export data
 */
export function validateExportData(data: unknown): { 
  valid: boolean; 
  data?: ValidatedPatientData; 
  errors?: string[];
} {
  const result = PatientDataSchema.safeParse(data);
  
  if (result.success) {
    // Sanitize strings
    const sanitized: ValidatedPatientData = {
      ...result.data,
      name: result.data.name ? sanitizeGdtString(result.data.name) : undefined,
      surname: result.data.surname ? sanitizeGdtString(result.data.surname) : undefined,
    };
    
    return { valid: true, data: sanitized };
  } else {
    return { 
      valid: false, 
      errors: result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`) 
    };
  }
}
