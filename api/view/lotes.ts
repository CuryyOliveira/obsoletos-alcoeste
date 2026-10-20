import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exigirVisualizacao } from '../../server/auth.js';
import { snapshot } from '../../server/datasource.js';
import { tokenLote } from '../../server/links.js';

/** Lista de todos os lotes, só para quem tem o código de visualização (ou é administrador). Campos públicos apenas. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!exigirVisualizacao(req, res)) return;
  try {
    const { lotes, materiais } = await snapshot();
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).json(
      lotes.flatMap((l) => {
        const token = tokenLote(l.numero);
        if (!token) return [];
        const ms = materiais.filter((m) => m.lote === l.numero);
        return [{ numero: l.numero, nome: l.nome, totalItens: ms.length, totalPecas: ms.reduce((s, m) => s + m.quantidade, 0), token }];
      }),
    );
  } catch (e) {
    console.error('view/lotes', (e as Error).message);
    res.status(503).json({ erro: 'Serviço indisponível, tente novamente.' });
  }
}
