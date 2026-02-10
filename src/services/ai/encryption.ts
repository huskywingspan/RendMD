// Web Crypto API encryption for API keys at rest in localStorage.
// Provides obfuscation — not absolute security (client-side limitation).

const SEED_KEY = 'rendmd-crypto-seed';
const SALT = new TextEncoder().encode('RendMD-AI-Key-Salt-v1');
const ITERATIONS = 100_000;

/** Retrieve or generate a random base seed stored in localStorage. */
function getOrCreateSeed(): Uint8Array {
  const existing = localStorage.getItem(SEED_KEY);
  if (existing) {
    return Uint8Array.from(atob(existing), (c) => c.charCodeAt(0));
  }
  const seed = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem(SEED_KEY, btoa(String.fromCharCode(...seed)));
  return seed;
}

/** Derive an AES-GCM key from the stored seed using PBKDF2. */
async function getEncryptionKey(): Promise<CryptoKey> {
  const seed = getOrCreateSeed();
  const baseKey = await crypto.subtle.importKey('raw', seed as BufferSource, 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Encrypt a plaintext API key. Returns a base64 string (iv + ciphertext). */
export async function encryptKey(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

/** Decrypt a base64-encoded encrypted key back to plaintext. */
export async function decryptKey(encrypted: string): Promise<string> {
  const key = await getEncryptionKey();
  const data = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(decrypted);
}
