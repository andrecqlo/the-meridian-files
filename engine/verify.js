/* Answer checking. Nothing in this repo stores a plaintext code: content ships
   SHA-256 hex digests and we compare digests of normalised player input. */

export function normalise(input) {
  return String(input == null ? '' : input)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/,/g, '')
    .replace(/[-‐‑‒–—―]/g, '');
}

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verify(input, expectedDigest) {
  if (!expectedDigest) return false;
  const hex = await sha256Hex(normalise(input));
  return hex === String(expectedDigest).toLowerCase();
}

/* Spoiler-shy values (stamped words, discovered counts) travel base64 so a
   casual read of the repo does not hand over the case. */
export function decode(value) {
  if (typeof value !== 'string') return value;
  try {
    return decodeURIComponent(escape(atob(value)));
  } catch (err) {
    return value;
  }
}
