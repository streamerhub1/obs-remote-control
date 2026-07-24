import * as jose from 'jose';
import crypto from 'crypto';

let privateKey: crypto.KeyObject;
let publicKey: crypto.KeyObject;

export function initSessionKeys() {
  if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY) {
    privateKey = crypto.createPrivateKey(process.env.JWT_PRIVATE_KEY);
    publicKey = crypto.createPublicKey(process.env.JWT_PUBLIC_KEY);
  } else {
    // Generate an ephemeral key pair for development
    const keys = crypto.generateKeyPairSync('ed25519');
    privateKey = keys.privateKey;
    publicKey = keys.publicKey;
  }
}

export function getSessionPublicKey(): string {
  if (!publicKey) initSessionKeys();
  return publicKey.export({ type: 'spki', format: 'pem' }) as string;
}

export async function signSessionToken(payload: jose.JWTPayload): Promise<string> {
  if (!privateKey) initSessionKeys();
  const alg = 'EdDSA';
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setIssuer('urn:streamerhub:backend')
    .setAudience('urn:streamerhub:desktop')
    .sign(privateKey);
}
