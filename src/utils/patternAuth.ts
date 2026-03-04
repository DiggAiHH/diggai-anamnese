/**
 * Pattern Authentication Utility
 * Hashes pattern sequences for secure storage and comparison.
 * No raw pattern is ever sent to the server — only the hash.
 */

/**
 * Serialize a pattern (array of dot indices) into a deterministic string.
 * e.g., [0, 1, 5, 6] → "0-1-5-6"
 */
export function serializePattern(pattern: number[]): string {
  return pattern.join('-');
}

/**
 * Hash a pattern sequence using SHA-256 (client-side).
 * Returns a hex string for transmission to the server.
 * Server will do bcrypt comparison for storage.
 */
export async function hashPattern(pattern: number[]): Promise<string> {
  const serialized = serializePattern(pattern);
  const encoder = new TextEncoder();
  const data = encoder.encode(serialized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compare two patterns for equality (client-side quick check).
 * Used during pattern creation (draw + confirm).
 */
export function patternsMatch(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/**
 * Validate pattern constraints.
 * Returns error message or null if valid.
 */
export function validatePattern(pattern: number[], gridSize: number = 4): string | null {
  const minLength = 4;
  const maxDots = gridSize * gridSize;

  if (pattern.length < minLength) {
    return `Mindestens ${minLength} Punkte verbinden`;
  }

  if (pattern.some((d) => d < 0 || d >= maxDots)) {
    return 'Ungültiger Punkt im Muster';
  }

  // Check for duplicates
  const unique = new Set(pattern);
  if (unique.size !== pattern.length) {
    return 'Doppelte Punkte nicht erlaubt';
  }

  return null;
}

/**
 * Calculate pattern complexity score (0-100).
 * Higher = more secure. Considers length, direction changes, spread.
 */
export function patternComplexity(pattern: number[], gridSize: number = 4): number {
  if (pattern.length < 4) return 0;

  let score = 0;

  // Length score (4 dots = 20pts, each extra = +10, max 50)
  score += Math.min(50, 20 + (pattern.length - 4) * 10);

  // Direction changes (more = better, max 30 pts)
  let dirChanges = 0;
  for (let i = 2; i < pattern.length; i++) {
    const prev = pattern[i - 2];
    const curr = pattern[i - 1];
    const next = pattern[i];

    const prevRow = Math.floor(prev / gridSize);
    const prevCol = prev % gridSize;
    const currRow = Math.floor(curr / gridSize);
    const currCol = curr % gridSize;
    const nextRow = Math.floor(next / gridSize);
    const nextCol = next % gridSize;

    const dx1 = currCol - prevCol;
    const dy1 = currRow - prevRow;
    const dx2 = nextCol - currCol;
    const dy2 = nextRow - currRow;

    if (dx1 !== dx2 || dy1 !== dy2) dirChanges++;
  }
  score += Math.min(30, dirChanges * 10);

  // Spread score: uses full grid? (max 20 pts)
  const rows = new Set(pattern.map((d) => Math.floor(d / gridSize)));
  const cols = new Set(pattern.map((d) => d % gridSize));
  const rowSpread = rows.size / gridSize;
  const colSpread = cols.size / gridSize;
  score += Math.round(((rowSpread + colSpread) / 2) * 20);

  return Math.min(100, score);
}
