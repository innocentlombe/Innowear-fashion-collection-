export const DEFAULT_ADMIN_PASSWORD = 'innowear2026';

const PASSWORD_SALT = 'innowear-bms-salt-v1::';

function fallbackDigest(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `fb_${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

export async function hashPassword(plain: string): Promise<string> {
  const salted = `${PASSWORD_SALT}${plain}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoded = new TextEncoder().encode(salted);
      const buffer = await crypto.subtle.digest('SHA-256', encoded);
      const bytes = Array.from(new Uint8Array(buffer));
      return `sha256_${bytes.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
    } catch {
      return fallbackDigest(salted);
    }
  }
  return fallbackDigest(salted);
}
