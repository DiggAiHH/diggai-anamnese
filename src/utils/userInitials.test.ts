import { describe, it, expect } from 'vitest';
import { getUserInitials } from './userInitials';

describe('getUserInitials', () => {
  it('uses first+last initials when both present', () => {
    expect(getUserInitials({ firstName: 'Christian', lastName: 'Klaproth' })).toEqual({
      initials: 'CK',
    });
  });

  it('attaches prefix as tooltip when provided', () => {
    expect(
      getUserInitials({ firstName: 'Christian', lastName: 'Klaproth', prefix: 'Dr' }),
    ).toEqual({ initials: 'CK', prefixTooltip: 'Dr.' });
  });

  it('strips trailing dot in prefix to avoid double-dot', () => {
    expect(
      getUserInitials({ firstName: 'A', lastName: 'B', prefix: 'Dr.' }),
    ).toEqual({ initials: 'AB', prefixTooltip: 'Dr.' });
  });

  it('falls back to first 2 chars of firstName when lastName missing', () => {
    expect(getUserInitials({ firstName: 'Maria' })).toEqual({ initials: 'MA' });
  });

  it('falls back to prefix when no name provided', () => {
    expect(getUserInitials({ prefix: 'Dr' })).toEqual({
      initials: 'DR',
      prefixTooltip: 'Dr.',
    });
  });

  it('returns ? when nothing usable', () => {
    expect(getUserInitials({})).toEqual({ initials: '?' });
  });

  it('handles null inputs gracefully', () => {
    expect(getUserInitials({ firstName: null, lastName: null, prefix: null })).toEqual({
      initials: '?',
    });
  });

  it('uppercases lowercase name input', () => {
    expect(getUserInitials({ firstName: 'anna', lastName: 'müller' })).toEqual({
      initials: 'AM',
    });
  });
});
