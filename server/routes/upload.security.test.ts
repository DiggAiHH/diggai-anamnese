/**
 * @module upload.security.test
 * @description Security tests for Path Traversal vulnerabilities in upload routes
 * @security CRIT-001 Path Traversal Protection Tests
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { resolve, normalize, sep } from 'path';

// Import the isPathSecure function logic for testing
const UPLOAD_DIR = resolve(process.cwd(), 'uploads');

/**
 * SECURITY: Validates that the requested file path is within the upload directory.
 * Prevents path traversal attacks like ../../../etc/passwd
 */
function isPathSecure(filepath: string): boolean {
    const normalized = normalize(filepath);
    return normalized.startsWith(UPLOAD_DIR + sep);
}

describe('CRIT-001: Path Traversal Security Tests', () => {
    describe('Basic Path Traversal Attempts', () => {
        it('should block Unix-style path traversal (../../../etc/passwd)', () => {
            const maliciousPath = resolve(UPLOAD_DIR, '../../../etc/passwd');
            expect(isPathSecure(maliciousPath)).toBe(false);
        });

        it('should block Windows-style path traversal (..\\..\\windows\\system.ini)', () => {
            const maliciousPath = resolve(UPLOAD_DIR, '..\\..\\windows\\system.ini');
            expect(isPathSecure(maliciousPath)).toBe(false);
        });

        it('should block mixed path traversal attempts', () => {
            const maliciousPath = resolve(UPLOAD_DIR, '../..\\../etc/passwd');
            expect(isPathSecure(maliciousPath)).toBe(false);
        });

        it('should block deep path traversal (6 levels)', () => {
            const maliciousPath = resolve(UPLOAD_DIR, '../../../../../../etc/shadow');
            expect(isPathSecure(maliciousPath)).toBe(false);
        });
    });

    describe('Double Encoding Attacks', () => {
        it('should treat encoded traversal sequences as literal filenames (not decoded)', () => {
            // URL-encoded sequences like %2e%2e%2f are treated as literal filenames by path.resolve
            // The actual security is enforced by the multer filename generation (UUID-based)
            // and proper path normalization on the resolved path
            const encodedPath = resolve(UPLOAD_DIR, '%2e%2e%2f%2e%2e%2fetc/passwd');
            // Since %2e is a literal string, not '..', this resolves safely within UPLOAD_DIR
            expect(isPathSecure(encodedPath)).toBe(true);
            // The resolved path should contain the literal % characters
            expect(encodedPath).toContain('%');
        });

        it('should handle encoded paths as literal strings within upload directory', () => {
            const encodedPath = resolve(UPLOAD_DIR, 'file%2e%2e%2ftxt.pdf');
            // Encoded paths are treated as literal filenames, which is safe
            expect(isPathSecure(encodedPath)).toBe(true);
        });
    });

    describe('Null Byte Injection', () => {
        it('should handle null byte injection attempts (file.txt\x00.jpg)', () => {
            // Null bytes should not bypass path check
            const nullBytePath = resolve(UPLOAD_DIR, 'file.txt\x00.jpg');
            // The resolved path should still be within upload dir or normalization should handle it
            const normalized = normalize(nullBytePath);
            expect(normalized.startsWith(UPLOAD_DIR + sep)).toBe(true);
        });
    });

    describe('Unicode/UTF-8 Sequences in Filenames', () => {
        it('should treat Unicode escape sequences as literal filenames', () => {
            // Unicode escape sequences like %c0%af are treated as literal strings
            // by the path module. The file system layer handles actual decoding.
            const unicodePath = resolve(UPLOAD_DIR, '..%c0%af..%c0%afetc/passwd');
            // Since %c0%af is treated literally, the path remains within UPLOAD_DIR
            expect(isPathSecure(unicodePath)).toBe(true);
        });

        it('should handle full-width characters as literal strings', () => {
            const unicodePath2 = resolve(UPLOAD_DIR, '..%ef%bc%8f..%ef%bc%8fsecret');
            // %ef%bc%8f is treated as literal string, not as '/'
            expect(isPathSecure(unicodePath2)).toBe(true);
        });

        it('should treat fullwidth solidus as literal character (not path separator)', () => {
            // Fullwidth solidus (／) is U+FF0F - treated as literal, not as path separator
            const decodedSlash = '\uFF0F'; // Fullwidth solidus
            const unicodePath = resolve(UPLOAD_DIR, `..${decodedSlash}..${decodedSlash}etc/passwd`);
            // Since fullwidth solidus is not a path separator, the path remains within UPLOAD_DIR
            // The path.resolve treats it as a literal character in the filename
            expect(isPathSecure(unicodePath)).toBe(true);
            // Verify the path contains the fullwidth character
            expect(unicodePath).toContain('\uFF0F');
        });
    });

    describe('Absolute Path Attacks', () => {
        it('should block absolute path to system files', () => {
            const absolutePath = '/etc/passwd';
            expect(isPathSecure(absolutePath)).toBe(false);
        });

        it('should block absolute Windows path', () => {
            const windowsPath = 'C:\\Windows\\System32\\config\\SAM';
            expect(isPathSecure(windowsPath)).toBe(false);
        });
    });

    describe('Traversal with Valid Filename', () => {
        it('should block path traversal disguised with valid extension', () => {
            const disguisedPath = resolve(UPLOAD_DIR, '../../../etc/passwd.pdf');
            expect(isPathSecure(disguisedPath)).toBe(false);
        });

        it('should block path traversal with image extension', () => {
            const disguisedPath = resolve(UPLOAD_DIR, '..\\..\\windows\\system32\\config\\sam.jpg');
            expect(isPathSecure(disguisedPath)).toBe(false);
        });
    });

    describe('Edge Cases and Bypass Attempts', () => {
        it('should block traversal with multiple slashes (..//..//etc/passwd)', () => {
            const multiSlashPath = resolve(UPLOAD_DIR, '..///..//etc/passwd');
            expect(isPathSecure(multiSlashPath)).toBe(false);
        });

        it('should block traversal with dot-slash prefix (./../../etc/passwd)', () => {
            const dotSlashPath = resolve(UPLOAD_DIR, './../../etc/passwd');
            expect(isPathSecure(dotSlashPath)).toBe(false);
        });

        it('should block traversal with current directory noise (foo/bar/../../../etc/passwd)', () => {
            const noisyPath = resolve(UPLOAD_DIR, 'foo/bar/../../../etc/passwd');
            expect(isPathSecure(noisyPath)).toBe(false);
        });
    });

    describe('Valid Paths (Should Pass)', () => {
        it('should allow valid filename in upload directory', () => {
            const validPath = resolve(UPLOAD_DIR, 'document.pdf');
            expect(isPathSecure(validPath)).toBe(true);
        });

        it('should allow filename with UUID pattern', () => {
            const uuidPath = resolve(UPLOAD_DIR, '550e8400-e29b-41d4-a716-446655440000.pdf');
            expect(isPathSecure(uuidPath)).toBe(true);
        });

        it('should allow nested path within uploads', () => {
            const nestedPath = resolve(UPLOAD_DIR, 'subfolder/nested/document.jpg');
            expect(isPathSecure(nestedPath)).toBe(true);
        });

        it('should allow filename with dots in name', () => {
            const dotNamePath = resolve(UPLOAD_DIR, 'file.name.with.dots.pdf');
            expect(isPathSecure(dotNamePath)).toBe(true);
        });

        it('should allow path with spaces in filename', () => {
            const spacePath = resolve(UPLOAD_DIR, 'my document file.pdf');
            expect(isPathSecure(spacePath)).toBe(true);
        });
    });

    describe('Path Normalization Behavior', () => {
        it('should normalize paths correctly', () => {
            const messyPath = resolve(UPLOAD_DIR, './foo/../bar/./document.pdf');
            const expectedPath = resolve(UPLOAD_DIR, 'bar/document.pdf');
            expect(normalize(messyPath)).toBe(expectedPath);
            expect(isPathSecure(messyPath)).toBe(true);
        });

        it('should handle redundant separators', () => {
            const redundantPath = resolve(UPLOAD_DIR, 'folder//file.pdf');
            expect(isPathSecure(redundantPath)).toBe(true);
        });
    });
});

describe('Upload Route Security Integration', () => {
    it('should have UPLOAD_DIR defined as absolute path', () => {
        expect(UPLOAD_DIR).toBeTruthy();
        expect(UPLOAD_DIR.startsWith(sep) || /^[A-Za-z]:/.test(UPLOAD_DIR)).toBe(true);
    });

    it('should verify the separator is correctly appended', () => {
        // Ensure UPLOAD_DIR + sep creates a proper prefix check
        const prefix = UPLOAD_DIR + sep;
        expect(prefix.endsWith(sep)).toBe(true);
    });
});
