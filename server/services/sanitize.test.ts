import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeObject } from './sanitize';

// Note: sanitize-html with disallowedTagsMode: 'recursiveEscape' HTML-encodes
// disallowed tags rather than removing them. This is the intended behavior —
// XSS is prevented because tags are escaped, not executed.

describe('sanitizeText', () => {
  it('should return plain text unchanged', () => {
    expect(sanitizeText('Hallo Welt')).toBe('Hallo Welt');
  });

  it('should HTML-escape disallowed tags (recursiveEscape mode)', () => {
    expect(sanitizeText('<b>bold</b>')).toContain('bold');
    expect(sanitizeText('<b>bold</b>')).not.toContain('<b>');
  });

  it('should escape script injection (not executable)', () => {
    const result = sanitizeText('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
  });

  it('should escape img injection', () => {
    const result = sanitizeText('<img src=x onerror=alert(1)>');
    expect(result).not.toContain('<img');
    expect(result).not.toContain('onerror');
  });

  it('should preserve German characters', () => {
    expect(sanitizeText('Müller Straße Düsseldorf')).toBe('Müller Straße Düsseldorf');
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeText(42 as unknown as string)).toBe('');
    expect(sanitizeText(null as unknown as string)).toBe('');
    expect(sanitizeText(undefined as unknown as string)).toBe('');
  });

  it('should escape event handlers', () => {
    const result = sanitizeText('<a href="javascript:alert(1)">click</a>');
    expect(result).toContain('click');
    expect(result).not.toContain('javascript:');
  });

  it('should trim result', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });
});

describe('sanitizeObject', () => {
  it('should sanitize all string values in a flat object', () => {
    const input = { name: '<b>John</b>', age: 30 };
    const result = sanitizeObject(input);
    expect(result.name).toContain('John');
    expect(result.name).not.toContain('<b>');
    expect(result.age).toBe(30);
  });

  it('should sanitize nested objects', () => {
    const input = { data: { name: '<script>xss</script>Test' } };
    const result = sanitizeObject(input as any);
    expect((result.data as any).name).toContain('Test');
    expect((result.data as any).name).not.toContain('<script>');
  });

  it('should sanitize arrays of strings', () => {
    const input = { tags: ['<b>bold</b>', 'normal'] };
    const result = sanitizeObject(input as any);
    expect((result.tags as string[])[0]).toContain('bold');
    expect((result.tags as string[])[0]).not.toContain('<b>');
    expect((result.tags as string[])[1]).toBe('normal');
  });

  it('should handle arrays of objects', () => {
    const input = { items: [{ name: '<script>x</script>Hello' }] };
    const result = sanitizeObject(input as any);
    expect((result.items as any[])[0].name).toContain('Hello');
    expect((result.items as any[])[0].name).not.toContain('<script>');
  });

  it('should preserve non-string primitives', () => {
    const input = { count: 5, active: true, nothing: null };
    const result = sanitizeObject(input as any);
    expect(result.count).toBe(5);
    expect(result.active).toBe(true);
    expect(result.nothing).toBe(null);
  });
});
