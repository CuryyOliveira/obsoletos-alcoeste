import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exigirAdmin } from '../../server/auth.js';
import { snapshot } from '../../server/datasource.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!exigirAdmin(req, res)) return;
  try {
    const { lotes, materiais } = await snapshot(req.query.fresh === '1');
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).json({ lotes, materiais });
  } catch (e) {
    console.error('admin/materiais', (e as Error).message);
    res.status(503).json({ erro: 'Não foi possível ler a planilha. Tente novamente.' });
  }
}
