import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

async function pbkdf2Web(pin: string, saltHex: string): Promise<string> {
  if (typeof globalThis?.crypto?.subtle === 'undefined') {
    throw new Error('crypto.subtle not available');
  }
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    key,
    256
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function pbkdf2Native(pin: string, saltHex: string): Promise<string> {
  // Fallback: use multiple rounds of SHA-256 as KDF on native
  // This is compatible for new PINs created on mobile
  // For PINs created on web (with real PBKDF2), we try crypto.subtle first
  let data = pin + saltHex;
  for (let i = 0; i < 1000; i++) {
    data = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
  }
  return data;
}

export async function derivePinHash(pin: string, saltHex: string): Promise<string> {
  try {
    return await pbkdf2Web(pin, saltHex);
  } catch {
    return await pbkdf2Native(pin, saltHex);
  }
}

export function generateSalt(): string {
  const bytes = Crypto.getRandomBytes(16);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function sameSecret(a: string, b: string): boolean {
  if (a?.length !== b?.length) return false;
  let diff = 0;
  for (let i = 0; i < (a?.length ?? 0); i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
