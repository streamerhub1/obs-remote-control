import { describe, it, expect } from 'vitest';
import { generateInviteCode } from './crypto.js';

describe('Crypto utils', () => {
  it('should generate an unambiguous invite code formatted as PH-XXXX-XXXX', () => {
    const code = generateInviteCode();
    expect(code).toBeTypeOf('string');
    expect(code).toHaveLength(12); // PH- + 4 + - + 4 = 12
    expect(code).toMatch(/^PH-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
  });
});
