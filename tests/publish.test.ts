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

import { salvarFotoMaterial, loteInicialBlob } from '../server/fotos';

describe('fotos: Drive x Blob', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 1]);
  const url = 'https://abc123.public.blob.vercel-storage.com/fotos/04-001/u1.jpg';
  const blob = async () => url;
  it('lote 4+ com token vai ao Blob e registra a URL', async () => {
    const d = createMock();
    const r = await salvarFotoMaterial(d, { id: 'M003', lote: 4 }, 'u1', jpeg, { env: { BLOB_READ_WRITE_TOKEN: 't' }, blob });
    expect(r).toEqual({ urlImagem: url, destino: 'blob' });
    const m = (await d.listMateriais()).find((x) => x.id === 'M003')!;
    expect(m.urlImagem).toBe(url);
  });
  it('lote 1–3 continua no Drive mesmo com token', async () => {
    const r = await salvarFotoMaterial(createMock(), { id: 'M003', lote: 3 }, 'u2', jpeg, { env: { BLOB_READ_WRITE_TOKEN: 't' }, blob });
    expect(r.destino).toBe('drive');
  });
  it('sem token cai no Drive em vez de falhar', async () => {
    const r = await salvarFotoMaterial(createMock(), { id: 'M003', lote: 5 }, 'u3', jpeg, { env: {}, blob });
    expect(r.destino).toBe('drive');
  });
  it('ponto de corte configurável e valores ruins voltam a 4', () => {
    expect(loteInicialBlob({ FOTOS_BLOB_A_PARTIR_DO_LOTE: '6' })).toBe(6);
    expect(loteInicialBlob({ FOTOS_BLOB_A_PARTIR_DO_LOTE: 'abc' })).toBe(4);
    expect(loteInicialBlob({})).toBe(4);
  });
  it('catálogo público usa URL direta só para o nosso Blob; outras URLs passam pelo proxy', () => {
    const l = [{ numero: 4, nome: 'N' }];
    const mk = (u: string): import('../server/types').Material => ({ id: 'X1', codigo: 'c', descricao: 'd', quantidade: 1, urlImagem: u, lote: 4 });
    expect(detalhePublico(4, l, [mk(url)])!.materiais[0].foto).toBe(url);
    expect(detalhePublico(4, l, [mk('https://evil.example.com/a.jpg')])!.materiais[0].foto).toBe('/api/img?m=X1');
  });
});
