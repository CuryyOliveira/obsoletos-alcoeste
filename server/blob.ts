import { put } from '@vercel/blob';

/** Envia a foto ao Vercel Blob. Caminho fixo por (material, uploadId): repetir o envio sobrescreve, não duplica. */
export async function enviarParaBlob(materialId: string, uploadId: string, jpeg: Buffer): Promise<string> {
  const r = await put(`fotos/${materialId}/${uploadId}.jpg`, jpeg, {
    access: 'public',
    contentType: 'image/jpeg',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  return r.url;
}

/** URL pública do nosso Blob (única origem aceita fora do Drive). */
export const ehUrlBlob = (u: string | null | undefined): u is string =>
  !!u && /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/fotos\/[\w.-]+\/[\w.-]+\.jpg$/.test(u);
