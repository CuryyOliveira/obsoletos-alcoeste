import { enviarParaBlob } from './blob.js';
import type { DataSource, Material } from './types.js';

/** A partir deste lote as fotos novas vão para o Blob; antes, continuam no Drive. */
export function loteInicialBlob(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.FOTOS_BLOB_A_PARTIR_DO_LOTE ?? 4);
  return Number.isInteger(n) && n > 0 ? n : 4;
}

export async function salvarFotoMaterial(
  ds: DataSource,
  m: Pick<Material, 'id' | 'lote'>,
  uploadId: string,
  jpeg: Buffer,
  deps: { env?: NodeJS.ProcessEnv; blob?: typeof enviarParaBlob } = {},
): Promise<{ urlImagem: string; destino: 'blob' | 'drive' }> {
  const env = deps.env ?? process.env;
  if (m.lote >= loteInicialBlob(env)) {
    if (env.BLOB_READ_WRITE_TOKEN) {
      const urlImagem = await (deps.blob ?? enviarParaBlob)(m.id, uploadId, jpeg);
      await ds.registrarUrl({ materialId: m.id, urlImagem });
      return { urlImagem, destino: 'blob' };
    }
    console.warn('BLOB_READ_WRITE_TOKEN ausente: salvando no Drive');
  }
  const r = await ds.salvarFoto({ materialId: m.id, uploadId, jpeg });
  return { urlImagem: r.urlImagem, destino: 'drive' };
}
