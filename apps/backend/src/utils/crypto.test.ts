import { describe, it, expect } from 'vitest';
import { generateInviteCode } from './crypto.js';

describe('Crypto utils', () => {
  it('should generate an 8-character uppercase hex string', () => {
    const code = generateInviteCode();
    expect(code).toBeTypeOf('string');
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[0-9A-F]{8}$/);
  });
});
