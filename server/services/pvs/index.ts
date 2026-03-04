// ============================================
// PVS Service — Public Façade
// ============================================

export { pvsRouter } from './pvs-router.service.js';
export { buildBefundtext, countExportFields } from './mapping-engine.js';
export { parseGdtFile, extractPatientData, validateGdtRecord } from './gdt/gdt-parser.js';
export { buildAnamneseResult, writeGdtFile, buildStammdatenAnfordern } from './gdt/gdt-writer.js';
export { GDT_FIELDS, GDT_SATZARTEN, GDT_VERSION } from './gdt/gdt-constants.js';
export { FhirClient } from './fhir/fhir-client.js';
export * from './fhir/fhir-mapper.js';
export * from './types.js';
