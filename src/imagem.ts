/** Reduz a foto no aparelho (lado maior 1600 px, JPEG) antes de enviar. */
export async function reduzirImagem(file: File, max = 1600, qualidade = 0.82): Promise<string> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c.toDataURL('image/jpeg', qualidade);
}

export const novoUploadId = () => crypto.randomUUID();
