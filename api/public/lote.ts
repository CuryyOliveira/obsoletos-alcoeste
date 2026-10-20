import type { VercelRequest, VercelResponse } from '@vercel/node';
import { snapshot } from '../../server/datasource.js';
import { numeroDoToken } from '../../server/links.js';
import { detalhePublico } from '../../server/publish.js';

const NAO_ENCONTRADO = { erro: 'Lote não encontrado ou não publicado.' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = req.query.t;
  const n = numeroDoToken(token);
  // Link inválido, adulterado ou sem segredo configurado: mesma resposta de "lote inexistente".
  if (n === null || typeof token !== 'string') return res.status(404).json(NAO_ENCONTRADO);
  try {
    const { lotes, materiais } = await snapshot();
    const d = detalhePublico(n, lotes, materiais, token);
    if (!d) return res.status(404).json(NAO_ENCONTRADO);
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.status(200).json(d);
  } catch (e) {
    console.error('public/lote', (e as Error).message);
    res.status(503).json({ erro: 'Serviço indisponível, tente novamente.' });
  }
}
