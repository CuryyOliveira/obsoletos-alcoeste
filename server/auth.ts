import { createHmac, timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const COOKIE = 'obs_sess';
const DIAS = 30;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET ausente ou curto demais');
  return s;
}
const sign = (v: string) => createHmac('sha256', secret()).update(v).digest('hex');

function igual(a: string, b: string): boolean {
  const ha = createHmac('sha256', 'cmp').update(a).digest();
  const hb = createHmac('sha256', 'cmp').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function pinCorreto(pin: unknown): boolean {
  const esperado = process.env.ADMIN_PIN;
  return !!esperado && typeof pin === 'string' && igual(pin, esperado);
}

/** Secure só quando a requisição é HTTPS (Vercel envia x-forwarded-proto); permite testar em http local. */
const https = (req?: VercelRequest) => !req || req.headers['x-forwarded-proto'] === 'https';

export function criarCookie(req?: VercelRequest): string {
  const exp = Date.now() + DIAS * 864e5;
  const v = `${exp}.${sign(String(exp))}`;
  return `${COOKIE}=${v}; HttpOnly;${https(req) ? ' Secure;' : ''} SameSite=Strict; Path=/; Max-Age=${DIAS * 86400}`;
}

export function limparCookie(req?: VercelRequest): string {
  return `${COOKIE}=; HttpOnly;${https(req) ? ' Secure;' : ''} SameSite=Strict; Path=/; Max-Age=0`;
}

export function sessaoValida(req: VercelRequest): boolean {
  const raw = req.headers.cookie?.split(';').map((c) => c.trim()).find((c) => c.startsWith(COOKIE + '='));
  if (!raw) return false;
  const [exp, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return igual(sig, sign(exp));
}

/** Retorna true se autorizado; senão já responde 401. */
export function exigirAdmin(req: VercelRequest, res: VercelResponse): boolean {
  if (sessaoValida(req)) return true;
  res.status(401).json({ erro: 'Não autorizado' });
  return false;
}
