import crypto from 'crypto';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    const randomByte = crypto.randomBytes(1)[0];
    code += ALPHABET[randomByte % ALPHABET.length];
  }
  return `PH-${code.slice(0, 4)}-${code.slice(4)}`;
}
