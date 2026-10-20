import { describe, expect, it, vi } from 'vitest';
import { createAppsScript } from '../server/appsscript';

const resp = (o: unknown, status = 200) => Promise.resolve(new Response(typeof o === 'string' ? o : JSON.stringify(o), { status }));

describe('fonte Apps Script', () => {
  it('lê lotes e materiais em UMA chamada e envia a chave só no corpo', async () => {
    const f = vi.fn((_u: unknown, _i?: RequestInit) =>
      resp({ ok: true, lotes: [{ numero: 1, nome: 'A' }], materiais: [{ id: '01-1', codigo: 'c', descricao: 'd', quantidade: 2, urlImagem: null, lote: 1 }] }));
    const ds = createAppsScript('https://script.example/exec', 'segredo', f as unknown as typeof fetch);
    const [l, m] = await Promise.all([ds.listLotes(), ds.listMateriais()]);
    expect(l).toHaveLength(1);
    expect(m[0].id).toBe('01-1');
    expect(f).toHaveBeenCalledTimes(1);
    expect(String(f.mock.calls[0][0])).not.toContain('segredo');
    expect(JSON.parse(String(f.mock.calls[0][1]!.body)).key).toBe('segredo');
  });
  it('erro do script vira exceção sem vazar a chave', async () => {
    const ds = createAppsScript('https://x/exec', 'segredo', (() => resp({ ok: false, erro: 'nao_autorizado' })) as unknown as typeof fetch);
    await expect(ds.listLotes()).rejects.toThrow(/nao_autorizado/);
    await expect(ds.listLotes()).rejects.not.toThrow(/segredo/);
  });
  it('HTML de login do Google é tratado como erro claro', async () => {
    const ds = createAppsScript('https://x/exec', 'k', (() => resp('<html>login</html>', 200)) as unknown as typeof fetch);
    await expect(ds.listMateriais()).rejects.toThrow(/inesperado/);
  });
  it('foto sem imagem devolve null; imagem válida decodifica', async () => {
    const sem = createAppsScript('https://x/exec', 'k', (() => resp({ ok: false, erro: 'sem_imagem' })) as unknown as typeof fetch);
    expect(await sem.lerFoto('01-1')).toBeNull();
    const com = createAppsScript('https://x/exec', 'k', (() => resp({ ok: true, contentType: 'image/jpeg', data: Buffer.from('abc').toString('base64') })) as unknown as typeof fetch);
    expect((await com.lerFoto('01-1'))!.data.toString()).toBe('abc');
  });
});
