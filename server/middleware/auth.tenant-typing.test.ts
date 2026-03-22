import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('wave 1.5 RED-first: auth payload tenantId typing contract', () => {
  it('declares tenantId?: string on AuthPayload interface', () => {
    const authSource = readSource('server/middleware/auth.ts');

    expect(authSource).toMatch(/export interface AuthPayload[\s\S]*tenantId\?:\s*string/);
  });

  it('avoids unsafe route-level req.auth tenant casts once AuthPayload is typed', () => {
    const exportRouteSource = readSource('server/routes/export.ts');
    const adminRouteSource = readSource('server/routes/admin.ts');

    expect(exportRouteSource).not.toContain('as unknown as { tenantId?: string }');
    expect(adminRouteSource).not.toContain('as { tenantId?: string } | undefined');
  });
});
