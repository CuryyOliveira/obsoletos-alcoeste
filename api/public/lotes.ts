import type { VercelRequest, VercelResponse } from '@vercel/node';
import { snapshot } from '../../server/datasource.js';
import { listarPublico } from '../../server/publish.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const { lotes, materiais } = await snapshot();
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.status(200).json(listarPublico(lotes, materiais));
  } catch (e) {
    console.error('public/lotes', (e as Error).message);
    res.status(503).json({ erro: 'Serviço indisponível, tente novamente.' });
  }
}
