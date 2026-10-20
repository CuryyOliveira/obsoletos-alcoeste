import type { VercelRequest, VercelResponse } from '@vercel/node';
import { criarCookieView, limparCookieView, pinVisualizacaoCorreto, sessaoViewValida } from '../../server/auth.js';

let falhas = 0; // freio simples por instância
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'GET') {
    const ok = sessaoViewValida(req);
    return res.status(ok ? 200 : 401).json({ ok });
  }
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', limparCookieView(req));
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') return res.status(405).end();
  if (falhas) await new Promise((r) => setTimeout(r, Math.min(falhas, 5) * 500));
  if (!pinVisualizacaoCorreto(req.body?.pin)) {
    falhas++;
    return res.status(401).json({ erro: 'Código incorreto' });
  }
  falhas = 0;
  res.setHeader('Set-Cookie', criarCookieView(req));
  res.status(200).json({ ok: true });
}
