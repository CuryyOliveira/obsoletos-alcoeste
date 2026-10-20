import type { VercelRequest, VercelResponse } from '@vercel/node';
import { snapshot } from '../../server/datasource.js';
import { detalhePublico } from '../../server/publish.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const n = Number(req.query.n);
  try {
    const { lotes, materiais } = await snapshot();
    const d = Number.isInteger(n) ? detalhePublico(n, lotes, materiais) : null;
    if (!d) return res.status(404).json({ erro: 'Lote não encontrado ou não publicado.' });
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.status(200).json(d);
  } catch (e) {
    console.error('public/lote', (e as Error).message);
    res.status(503).json({ erro: 'Serviço indisponível, tente novamente.' });
  }
}
