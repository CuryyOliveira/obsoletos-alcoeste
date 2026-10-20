export const MAX_JPEG_BYTES = 3 * 1024 * 1024;

export function parseJpegDataUrl(s: unknown): Buffer | null {
  if (typeof s !== 'string') return null;
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(s);
  if (!m) return null;
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length === 0 || buf.length > MAX_JPEG_BYTES) return null;
  // assinatura JPEG: FF D8 FF
  if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return null;
  return buf;
}

export const idValido = (s: unknown): s is string => typeof s === 'string' && /^[\w.-]{1,64}$/.test(s);
