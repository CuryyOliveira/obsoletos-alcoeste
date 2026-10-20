import { beforeAll, describe, expect, it } from 'vitest';
import fotoHandler from '../api/admin/material';
import { criarCookie } from '../server/auth';
import { snapshot } from '../server/datasource';

beforeAll(() => {
  process.env.DATA_SOURCE = 'mock';
  process.env.SESSION_SECRET = 'segredo-de-sessao-de-teste-1234';
  process.env.LOTE_LINK_SECRET = 'segredo-de-teste-para-links-1234';
});

function resp() {
  const r: any = { code: 200, body: undefined, headers: {} };
  r.status = (c: number) => ((r.code = c), r);
  r.json = (b: unknown) => ((r.body = b), r);
  r.end = () => r;
  r.setHeader = (k: string, v: string) => ((r.headers[k] = v), r);
  return r;
}
const post = async (body: object, admin = true) => {
  const r = resp();
  await fotoHandler({ method: 'POST', body, query: {}, headers: admin ? { cookie: criarCookie().split(';')[0] } : {} } as any, r);
  return r;
};

describe('API admin: adicionar/excluir', () => {
  it('sem login: 401 e nada muda', async () => {
    const antes = (await snapshot(true)).materiais.length;
    expect((await post({ acao: 'adicionar', lote: 1, codigo: 'a', descricao: 'b', quantidade: 1, requestId: 'x1' }, false)).code).toBe(401);
    expect((await post({ acao: 'excluir', id: 'M001' }, false)).code).toBe(401);
    expect((await snapshot(true)).materiais).toHaveLength(antes);
  });
  it('adiciona, aparece na lista, e repetir o mesmo requestId não duplica', async () => {
    const corpo = { acao: 'adicionar', lote: 2, codigo: 'C-9', descricao: 'ITEM NOVO', quantidade: 3, requestId: 'req-1' };
    const a = await post(corpo); const b = await post(corpo);
    expect(a.code).toBe(200);
    expect(b.body.id).toBe(a.body.id);
    const novos = (await snapshot(true)).materiais.filter((m) => m.descricao === 'ITEM NOVO');
    expect(novos).toHaveLength(1);
    expect(novos[0]).toMatchObject({ lote: 2, quantidade: 3, urlImagem: null });
  });
  it('valida: lote inexistente, quantidade ruim, campos vazios', async () => {
    const ok = { acao: 'adicionar', lote: 2, codigo: 'C', descricao: 'D', quantidade: 1, requestId: 'req-2' };
    for (const ruim of [{ lote: 99 }, { quantidade: 0 }, { quantidade: 2.5 }, { codigo: '' }, { descricao: '   ' }, { requestId: '' }])
      expect((await post({ ...ok, ...ruim })).code).toBe(400);
  });
  it('exclui um item existente; item inexistente dá 404; ação desconhecida dá 400', async () => {
    expect((await post({ acao: 'excluir', id: 'M009' })).code).toBe(200);
    expect((await snapshot(true)).materiais.some((m) => m.id === 'M009')).toBe(false);
    expect((await post({ acao: 'excluir', id: 'M009' })).code).toBe(404);
    expect((await post({ acao: 'excluir', id: '../x' })).code).toBe(400);
    expect((await post({ acao: 'apagar-tudo' })).code).toBe(400);
  });
});
