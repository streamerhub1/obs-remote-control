import crypto from 'crypto';

export function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 characters
}
