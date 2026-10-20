import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDataSource, snapshot } from '../server/datasource.js';
import { ehUrlBlob } from '../server/blob.js';
import { fotoPublica } from '../server/publish.js';
import { idValido } from '../server/validate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.m;
  if (!idValido(id)) return res.status(404).end();
  try {
    const { lotes, materiais } = await snapshot();
    if (!fotoPublica(id, lotes, materiais)) return res.status(404).end();
    const url = materiais.find((m) => m.id === id)?.urlImagem;
    if (ehUrlBlob(url)) {
      res.setHeader('Cache-Control', 'public, s-maxage=300, max-age=60');
      return res.redirect(302, url);
    }
    const foto = await getDataSource().lerFoto(id);
    if (!foto) return res.status(404).end();
    res.setHeader('Content-Type', foto.contentType);
    res.setHeader('Cache-Control', 'public, s-maxage=3600, max-age=300, stale-while-revalidate=86400');
    res.status(200).send(foto.data);
  } catch (e) {
    console.error('img', (e as Error).message);
    res.status(503).end();
  }
}
