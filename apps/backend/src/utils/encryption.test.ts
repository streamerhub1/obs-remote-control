import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from './encryption.js';
import crypto from 'crypto';

describe('Encryption Utils', () => {
  const TEST_KEY = crypto.randomBytes(32).toString('hex');
  const INVALID_KEY = crypto.randomBytes(16).toString('hex');

  it('should successfully encrypt and decrypt a string', () => {
    const plaintext = 'test-refresh-token-12345';
    const encrypted = encryptToken(plaintext, TEST_KEY);

    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.startsWith('v1:')).toBe(true);

    const decrypted = decryptToken(encrypted, TEST_KEY);
    expect(decrypted).toBe(plaintext);
  });

  it('should throw error if key is invalid length', () => {
    expect(() => encryptToken('test', INVALID_KEY)).toThrow(
      /must be exactly 32 bytes/,
    );
    expect(() => decryptToken('test', INVALID_KEY)).toThrow(
      /must be exactly 32 bytes/,
    );
  });

  it('should throw error if ciphertext format is invalid', () => {
    expect(() => decryptToken('invalid:format', TEST_KEY)).toThrow(
      /Invalid encrypted token format/,
    );
    expect(() => decryptToken('v99:123:456:789', TEST_KEY)).toThrow(
      /Invalid encrypted token format/,
    );
  });

  it('should fail to decrypt if cipher text is tampered', () => {
    const encrypted = encryptToken('test', TEST_KEY);
    const parts = encrypted.split(':');

    // Change a char in the ciphertext
    parts[3] =
      parts[3].substring(0, parts[3].length - 1) +
      (parts[3].endsWith('0') ? '1' : '0');
    const tampered = parts.join(':');

    expect(() => decryptToken(tampered, TEST_KEY)).toThrow(
      /Unsupported state or unable to authenticate data/,
    );
  });

  it('should fail to decrypt if auth tag is tampered', () => {
    const encrypted = encryptToken('test', TEST_KEY);
    const parts = encrypted.split(':');

    // Change a char in auth tag
    parts[2] =
      parts[2].substring(0, parts[2].length - 1) +
      (parts[2].endsWith('0') ? '1' : '0');
    const tampered = parts.join(':');

    expect(() => decryptToken(tampered, TEST_KEY)).toThrow(
      /Unsupported state or unable to authenticate data/,
    );
  });
});
