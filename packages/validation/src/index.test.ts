import { describe, it, expect } from 'vitest';
import { uuidSchema, inviteCodeSchema, safeUrlSchema } from './index.js';

describe('Validation', () => {
  it('validates UUID', () => {
    expect(
      uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000').success,
    ).toBe(true);
    expect(uuidSchema.safeParse('invalid').success).toBe(false);
  });
  it('normalizes invite code', () => {
    expect(inviteCodeSchema.parse(' aBc-123 ')).toBe('ABC-123');
  });
  it('validates safe URL', () => {
    expect(safeUrlSchema.safeParse('https://github.com').success).toBe(true);
    expect(safeUrlSchema.safeParse('javascript:alert(1)').success).toBe(false);
  });
});
