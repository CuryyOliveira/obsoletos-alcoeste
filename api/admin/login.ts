import type { VercelRequest, VercelResponse } from '@vercel/node';
import { criarCookie, limparCookie, pinCorreto, sessaoValida } from '../../server/auth.js';

let falhas = 0; // freio simples por instância; o PIN é longo o bastante para o resto
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return res.status(sessaoValida(req) ? 200 : 401).json({ ok: sessaoValida(req) });
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', limparCookie(req));
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') return res.status(405).end();
  if (falhas) await new Promise((r) => setTimeout(r, Math.min(falhas, 5) * 500));
  if (!pinCorreto(req.body?.pin)) {
    falhas++;
    return res.status(401).json({ erro: 'PIN incorreto' });
  }
  falhas = 0;
  res.setHeader('Set-Cookie', criarCookie(req));
  res.status(200).json({ ok: true });
}
