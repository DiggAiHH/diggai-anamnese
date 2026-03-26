/**
 * @module validation
 * @description Enhanced Input Validation Middleware
 *
 * Provides strict input validation using Zod schemas with healthcare-specific
 * validation rules for patient data, medical information, and system identifiers.
 *
 * @security
 * - Type coercion prevention
 * - Length limits to prevent DoS
 * - Character whitelist validation
 * - Medical data format validation
 *
 * @see https://zod.dev/
 */

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ─── Common Validation Schemas ─────────────────────────────────

/**
 * UUID validation - strict v4 format
 * Used for all database identifiers
 */
export const uuidSchema = z.string().uuid({
    message: 'Invalid UUID format',
});

/**
 * Email validation with healthcare-specific rules
 * - RFC 5322 compliant
 * - Length limit (254 chars per RFC)
 * - Normalization (lowercase, trim)
 */
export const emailSchema = z
    .string()
    .email({ message: 'Invalid email format' })
    .max(254, { message: 'Email exceeds maximum length' })
    .transform(val => val.toLowerCase().trim());

/**
 * Name validation for patient/staff names
 * - Unicode letter support (international names)
 * - Common name characters (spaces, hyphens, apostrophes)
 * - No numbers or special characters
 */
export const nameSchema = z
    .string()
    .min(1, { message: 'Name is required' })
    .max(100, { message: 'Name exceeds maximum length' })
    .regex(/^[\p{L}\s'-]+$/u, {
        message: 'Name contains invalid characters',
    });

/**
 * Phone number validation (international format)
 * Supports common German and international formats
 */
export const phoneSchema = z
    .string()
    .regex(/^\+?[\d\s\-\(\)]+$/, {
        message: 'Invalid phone number format',
    })
    .max(20, { message: 'Phone number too long' })
    .optional();

/**
 * Date validation (ISO 8601 format)
 * Used for birthdates, appointment dates, etc.
 */
export const dateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'Date must be in YYYY-MM-DD format',
    })
    .refine(
        (val) => {
            const date = new Date(val);
            return !isNaN(date.getTime());
        },
        { message: 'Invalid date value' }
    );

/**
 * Atom ID validation (question identifier)
 * - Exactly 4 digits
 * - Leading zeros allowed
 */
export const atomIdSchema = z
    .string()
    .regex(/^\d{4}$/, {
        message: 'Atom ID must be exactly 4 digits',
    });

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20),
    offset: z.coerce
        .number()
        .int()
        .min(0)
        .default(0),
});

/**
 * Session status validation
 */
export const sessionStatusSchema = z.enum([
    'created',
    'active',
    'paused',
    'completed',
    'cancelled',
    'archived',
]);

/**
 * Medical data validation schemas
 */
export const medicalDataSchemas = {
    // Blood pressure: systolic/diastolic
    bloodPressure: z.string().regex(/^\d{2,3}\/\d{2,3}$/, {
        message: 'Blood pressure must be in format "120/80"',
    }),

    // Weight in kg
    weight: z.coerce.number().min(0.5).max(500),

    // Height in cm
    height: z.coerce.number().int().min(30).max(300),

    // Temperature in Celsius
    temperature: z.coerce.number().min(30).max(45),

    // Heart rate (BPM)
    heartRate: z.coerce.number().int().min(30).max(250),
};

/**
 * Sanitized text input for free-text fields
 * Prevents XSS and injection attacks
 */
export const sanitizedTextSchema = z
    .string()
    .max(5000, { message: 'Text exceeds maximum length' })
    .transform((val) => {
        // Basic XSS prevention transformation
        return val
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
    });

// ─── Schema Collections ───────────────────────────────────────

/**
 * Common validation schemas for reuse
 */
export const schemas = {
    uuid: uuidSchema,
    email: emailSchema,
    name: nameSchema,
    phone: phoneSchema,
    date: dateSchema,
    atomId: atomIdSchema,
    pagination: paginationSchema,
    sessionStatus: sessionStatusSchema,
    medical: medicalDataSchemas,
    sanitizedText: sanitizedTextSchema,
};

// ─── Middleware Factory ────────────────────────────────────────

/**
 * Creates a validation middleware for Express routes
 *
 * @param schema - Zod schema to validate against
 * @param source - Request property to validate ('body' | 'query' | 'params')
 * @returns Express middleware function
 *
 * @example
 * router.post('/patients',
 *   validate(createPatientSchema, 'body'),
 *   createPatientHandler
 * );
 */
export function validate<T extends z.ZodType>(
    schema: T,
    source: 'body' | 'query' | 'params' = 'body'
) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req[source]);

        if (!result.success) {
            // Format Zod errors for API response
            const errors = result.error.issues.map((issue) => ({
                path: issue.path,
                message: issue.message,
                code: issue.code,
            }));

            // Log validation failures for security monitoring
            console.warn('[Validation] Request validation failed:', {
                path: req.path,
                method: req.method,
                ip: req.ip,
                errors: errors.map(e => `${e.path.join('.')}: ${e.message}`),
            });

            res.status(400).json({
                error: 'Validation failed',
                details: errors,
            });
            return;
        }

        // Replace with validated/parsed data
        // This ensures type coercion and transformations are applied
        req[source] = result.data as unknown as typeof req[typeof source];
        next();
    };
}

/**
 * Strict validation middleware that fails on unknown keys
 * Use for security-critical endpoints
 */
export function validateStrict<T extends z.ZodType>(
    schema: T,
    source: 'body' | 'query' | 'params' = 'body'
) {
    const strictSchema = schema instanceof z.ZodObject
        ? (schema as z.ZodObject<z.ZodRawShape>).strict()
        : schema;

    return validate(strictSchema, source);
}

/**
 * Validation middleware that strips unknown keys instead of failing
 * Use for backward compatibility
 */
export function validateStrip<T extends z.ZodType>(
    schema: T,
    source: 'body' | 'query' | 'params' = 'body'
) {
    const stripSchema = schema instanceof z.ZodObject
        ? (schema as z.ZodObject<z.ZodRawShape>).strip()
        : schema;

    return validate(stripSchema, source);
}

// ─── Pre-built Validation Middlewares ──────────────────────────

/**
 * Validates pagination parameters in query string
 */
export const validatePagination = validate(paginationSchema, 'query');

/**
 * Validates UUID parameter in URL
 */
export const validateUuidParam = validate(
    z.object({ id: uuidSchema }),
    'params'
);

/**
 * Validates session ID parameter
 */
export const validateSessionId = validate(
    z.object({ sessionId: uuidSchema }),
    'params'
);

/**
 * Validates atom ID parameter
 */
export const validateAtomId = validate(
    z.object({ atomId: atomIdSchema }),
    'params'
);

// ─── Validation Helpers ────────────────────────────────────────

/**
 * Validates data against a schema without middleware
 * Useful for service layer validation
 */
export function validateData<T extends z.ZodType>(
    schema: T,
    data: unknown
): z.infer<T> {
    return schema.parse(data);
}

/**
 * Safely validates data, returns null on failure
 * Useful for optional validation
 */
export function safeValidateData<T extends z.ZodType>(
    schema: T,
    data: unknown
): z.infer<T> | null {
    const result = schema.safeParse(data);
    return result.success ? result.data : null;
}

/**
 * Creates a custom validator with error transformation
 */
export function createValidator<T extends z.ZodType>(
    schema: T,
    errorTransformer?: (error: z.ZodError) => Record<string, unknown>
) {
    return (data: unknown): { success: true; data: z.infer<T> } | { success: false; error: Record<string, unknown> } => {
        const result = schema.safeParse(data);

        if (result.success) {
            return { success: true, data: result.data };
        }

        const error = errorTransformer
            ? errorTransformer(result.error)
            : { errors: result.error.issues };

        return { success: false, error };
    };
}

// ─── Healthcare-Specific Validators ────────────────────────────

/**
 * Validates patient demographic data
 */
export const patientDemographicsSchema = z.object({
    firstName: nameSchema,
    lastName: nameSchema,
    birthDate: dateSchema,
    gender: z.enum(['male', 'female', 'diverse', 'unknown']),
    email: emailSchema.optional(),
    phone: phoneSchema,
    address: z.object({
        street: z.string().max(100),
        postalCode: z.string().regex(/^\d{5}$/),
        city: nameSchema,
    }).optional(),
});

/**
 * Validates medical questionnaire answers
 */
export const answerSchema = z.object({
    atomId: atomIdSchema,
    value: z.union([z.string(), z.array(z.string()), z.number(), z.boolean()]),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Validates session creation request
 */
export const createSessionSchema = z.object({
    firstName: nameSchema,
    lastName: nameSchema,
    birthDate: dateSchema,
    email: emailSchema.optional(),
    phone: phoneSchema,
    gdprConsent: z.literal(true, 'GDPR consent is required'),
    medicalConsent: z.boolean().optional(),
});

export default {
    schemas,
    validate,
    validateStrict,
    validateStrip,
    validateData,
    safeValidateData,
    createValidator,
    patientDemographicsSchema,
    answerSchema,
    createSessionSchema,
    validatePagination,
    validateUuidParam,
    validateSessionId,
    validateAtomId,
};
