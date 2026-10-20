import { describe, expect, it } from 'vitest';
import { createMock } from '../server/mock';
import { detalhePublico, fotoPublica, listarPublico } from '../server/publish';
import { parseJpegDataUrl } from '../server/validate';

const ds = createMock();

describe('catálogo público', () => {
  it('não vaza código nem ID do material', async () => {
    const [lotes, ms] = [await ds.listLotes(), await ds.listMateriais()];
    // O ID_MATERIAL só aparece como chave da imagem (/api/img?m=...), que só serve fotos publicadas.
    const json = JSON.stringify([listarPublico(lotes, ms), detalhePublico(1, lotes, ms)])
      .replace(/\/api\/img\?m=[\w.-]+/g, '/api/img');
    expect(json).not.toMatch(/COD-/);
    expect(json).not.toMatch(/"id"/);
    expect(json).not.toMatch(/M00\d/);
  });
  it('lote inexistente devolve null', async () => {
    expect(detalhePublico(99, await ds.listLotes(), await ds.listMateriais())).toBeNull();
  });
  it('só mostra materiais do próprio lote e totais corretos', async () => {
    const d = detalhePublico(1, await ds.listLotes(), await ds.listMateriais())!;
    expect(d.totalItens).toBe(6);
    expect(d.totalPecas).toBe(4 + 61 + 2 + 2 + 1 + 14);
  });
  it('proxy de imagem só serve foto existente de lote publicado', async () => {
    const [lotes, ms] = [await ds.listLotes(), await ds.listMateriais()];
    expect(fotoPublica('M001', lotes, ms)).toBe(true);
    expect(fotoPublica('M003', lotes, ms)).toBe(false); // sem foto
    expect(fotoPublica('XYZ', lotes, ms)).toBe(false);
  });
});

describe('upload', () => {
  it('aceita só JPEG válido', () => {
    const ok = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]).toString('base64');
    expect(parseJpegDataUrl(ok)).not.toBeNull();
    expect(parseJpegDataUrl('data:image/png;base64,AAAA')).toBeNull();
    expect(parseJpegDataUrl('data:image/jpeg;base64,' + Buffer.from('texto').toString('base64'))).toBeNull();
  });
  it('mesmo uploadId não duplica', async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 1]);
    const a = await ds.salvarFoto({ materialId: 'M003', uploadId: 'u1', jpeg });
    const b = await ds.salvarFoto({ materialId: 'M003', uploadId: 'u1', jpeg });
    expect(a.urlImagem).toBe(b.urlImagem);
  });
});
