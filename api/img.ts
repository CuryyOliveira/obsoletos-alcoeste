import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sessaoValida } from '../server/auth.js';
import { ehUrlBlob } from '../server/blob.js';
import { getDataSource, snapshot } from '../server/datasource.js';
import { numeroDoToken } from '../server/links.js';
import { fotoPublica } from '../server/publish.js';
import { idValido } from '../server/validate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.m;
  if (!idValido(id)) return res.status(404).end();
  try {
    const { lotes, materiais } = await snapshot();
    if (!fotoPublica(id, lotes, materiais)) return res.status(404).end();
    const material = materiais.find((m) => m.id === id)!;
    // Quem vê a foto: o link do PRÓPRIO lote do material, ou o administrador logado.
    const doLote = numeroDoToken(req.query.t) === material.lote;
    if (!doLote && !sessaoValida(req)) return res.status(404).end();
    res.setHeader('Cache-Control', doLote
        ? 'public, s-maxage=3600, max-age=300, stale-while-revalidate=86400'
        : req.query.v ? 'private, max-age=86400' : 'private, max-age=60');
    const url = material.urlImagem;
    if (ehUrlBlob(url)) return res.redirect(302, url);
    const foto = await getDataSource().lerFoto(id);
    if (!foto) return res.status(404).end();
    res.setHeader('Content-Type', foto.contentType);
    res.status(200).send(foto.data);
  } catch (e) {
    console.error('img', (e as Error).message);
    res.status(503).end();
  }
}
