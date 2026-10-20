import { createHmac, timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const DIAS = 30;

/** Duas sessões independentes: administrador (fotos/QR) e visualização (só leitura). O HMAC inclui o escopo,
 *  então um cookie de visualização nunca vale como administrador. */
interface Sessao {
  cookie: string;
  escopo: string;
}
const ADMIN: Sessao = { cookie: 'obs_sess', escopo: '' };
const VIEW: Sessao = { cookie: 'obs_view', escopo: 'view:' };

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

const pinConfere = (pin: unknown, esperado: string | undefined) => !!esperado && typeof pin === 'string' && igual(pin, esperado);
export const pinCorreto = (pin: unknown) => pinConfere(pin, process.env.ADMIN_PIN);
/** Sem VIEW_PIN configurado, a visualização fica desligada (falha fechada). */
export const pinVisualizacaoCorreto = (pin: unknown) => pinConfere(pin, process.env.VIEW_PIN);

/** Secure só quando a requisição é HTTPS (Vercel envia x-forwarded-proto); permite testar em http local. */
const https = (req?: VercelRequest) => !req || req.headers['x-forwarded-proto'] === 'https';

function criar(s: Sessao, req?: VercelRequest): string {
  const exp = Date.now() + DIAS * 864e5;
  const v = `${exp}.${sign(s.escopo + exp)}`;
  return `${s.cookie}=${v}; HttpOnly;${https(req) ? ' Secure;' : ''} SameSite=Strict; Path=/; Max-Age=${DIAS * 86400}`;
}
const limpar = (s: Sessao, req?: VercelRequest) =>
  `${s.cookie}=; HttpOnly;${https(req) ? ' Secure;' : ''} SameSite=Strict; Path=/; Max-Age=0`;

function valida(req: VercelRequest, s: Sessao): boolean {
  const raw = req.headers.cookie?.split(';').map((c) => c.trim()).find((c) => c.startsWith(s.cookie + '='));
  if (!raw) return false;
  const [exp, sig] = raw.slice(s.cookie.length + 1).split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return igual(sig, sign(s.escopo + exp));
}

export const criarCookie = (req?: VercelRequest) => criar(ADMIN, req);
export const limparCookie = (req?: VercelRequest) => limpar(ADMIN, req);
export const criarCookieView = (req?: VercelRequest) => criar(VIEW, req);
export const limparCookieView = (req?: VercelRequest) => limpar(VIEW, req);

export const sessaoValida = (req: VercelRequest) => valida(req, ADMIN);
/** Quem administra também pode visualizar. */
export const sessaoViewValida = (req: VercelRequest) => valida(req, VIEW) || valida(req, ADMIN);

/** Retorna true se autorizado; senão já responde 401. */
export function exigirAdmin(req: VercelRequest, res: VercelResponse): boolean {
  if (sessaoValida(req)) return true;
  res.status(401).json({ erro: 'Não autorizado' });
  return false;
}
export function exigirVisualizacao(req: VercelRequest, res: VercelResponse): boolean {
  if (sessaoViewValida(req)) return true;
  res.status(401).json({ erro: 'Não autorizado' });
  return false;
}
