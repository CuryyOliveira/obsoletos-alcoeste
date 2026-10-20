import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exigirAdmin } from '../../server/auth.js';
import { getDataSource, invalidate, snapshot } from '../../server/datasource.js';
import { salvarFotoMaterial } from '../../server/fotos.js';
import { idValido, parseJpegDataUrl } from '../../server/validate.js';

export const config = { api: { bodyParser: { sizeLimit: '5mb' } } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!exigirAdmin(req, res)) return;
  const { materialId, uploadId, imagem } = req.body ?? {};
  const jpeg = parseJpegDataUrl(imagem);
  if (!idValido(materialId) || !idValido(uploadId) || !jpeg)
    return res.status(400).json({ erro: 'Dados inválidos. Use uma imagem JPEG de até 3 MB.' });
  try {
    const { materiais } = await snapshot(); // o Apps Script revalida o ID ao gravar; não precisa reler a planilha inteira aqui
    const material = materiais.find((m) => m.id === materialId);
    if (!material) return res.status(404).json({ erro: 'Material não encontrado.' });
    const r = await salvarFotoMaterial(getDataSource(), material, uploadId, jpeg);
    invalidate();
    res.status(200).json({ ok: true, urlImagem: r.urlImagem.startsWith('data:') ? null : r.urlImagem });
  } catch (e) {
    console.error('admin/foto', (e as Error).message);
    res.status(502).json({ erro: 'Falha ao salvar. Toque em tentar novamente: não será duplicado.' });
  }
}
