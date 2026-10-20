import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exigirAdmin } from '../../server/auth.js';
import { getDataSource, invalidate, snapshot } from '../../server/datasource.js';
import { idValido, validarNovoMaterial } from '../../server/validate.js';

/** POST { acao: 'adicionar', lote, codigo, descricao, quantidade, requestId } | { acao: 'excluir', id } — só administrador. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!exigirAdmin(req, res)) return;
  res.setHeader('Cache-Control', 'private, no-store');
  const body = req.body ?? {};
  try {
    if (body.acao === 'adicionar') {
      const v = validarNovoMaterial(body);
      if ('erro' in v) return res.status(400).json({ erro: v.erro });
      const { lotes } = await snapshot(true);
      if (!lotes.some((l) => l.numero === v.valor.lote)) return res.status(400).json({ erro: 'Lote inexistente.' });
      const r = await getDataSource().adicionarMaterial(v.valor);
      invalidate();
      return res.status(200).json({ ok: true, id: r.id });
    }
    if (body.acao === 'excluir') {
      if (!idValido(body.id)) return res.status(400).json({ erro: 'Item inválido.' });
      const { materiais } = await snapshot(true);
      if (!materiais.some((m) => m.id === body.id)) return res.status(404).json({ erro: 'Item não encontrado (talvez já tenha sido excluído).' });
      await getDataSource().excluirMaterial({ materialId: body.id });
      invalidate();
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ erro: 'Ação inválida.' });
  } catch (e) {
    console.error('admin/material', (e as Error).message);
    res.status(502).json({ erro: 'Não foi possível gravar na planilha. Tente novamente.' });
  }
}
