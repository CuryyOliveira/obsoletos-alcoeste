import { beforeAll, describe, expect, it } from 'vitest';
import imgHandler from '../api/img';
import loteHandler from '../api/public/lote';
import { numeroDoToken, tokenLote } from '../server/links';

beforeAll(() => {
  process.env.DATA_SOURCE = 'mock';
  process.env.LOTE_LINK_SECRET = 'segredo-de-teste-para-links-1234';
  process.env.SESSION_SECRET = 'segredo-de-sessao-de-teste-1234';
});

function resp() {
  const r = { code: 200, body: undefined as unknown, headers: {} as Record<string, string>, location: '' } as any;
  r.status = (c: number) => ((r.code = c), r);
  r.json = (b: unknown) => ((r.body = b), r);
  r.send = (b: unknown) => ((r.body = b), r);
  r.end = () => r;
  r.setHeader = (k: string, v: string) => ((r.headers[k] = v), r);
  r.redirect = (c: number, u: string) => ((r.code = c), (r.location = u), r);
  return r;
}
const get = async (h: (a: any, b: any) => unknown, query: Record<string, string>) => {
  const r = resp();
  await h({ query, headers: {}, method: 'GET' }, r);
  return r;
};

describe('links assinados', () => {
  it('mesmo lote => mesmo link; lotes diferentes => links sem relação; adulterado => inválido', () => {
    const t1 = tokenLote(1)!, t2 = tokenLote(2)!;
    expect(tokenLote(1)).toBe(t1);
    expect(t1).toMatch(/^1-[0-9a-f]{16}$/);
    expect(numeroDoToken(t1)).toBe(1);
    expect(numeroDoToken('2-' + t1.split('-')[1])).toBeNull(); // assinatura do lote 1 não vale para o 2
    expect(numeroDoToken('1')).toBeNull(); // número puro não abre nada
    expect(numeroDoToken(t1.slice(0, -1) + (t1.endsWith('0') ? '1' : '0'))).toBeNull();
    expect(numeroDoToken(undefined)).toBeNull();
    expect(t2).not.toContain(t1.split('-')[1]);
  });
  it('sem LOTE_LINK_SECRET nada abre (falha fechada)', () => {
    expect(tokenLote(1, {})).toBeNull();
    expect(numeroDoToken('1-0123456789abcdef', {})).toBeNull();
  });
});

describe('página pública do lote', () => {
  it('abre só com o link do próprio lote', async () => {
    const r = await get(loteHandler, { t: tokenLote(1)! });
    expect(r.code).toBe(200);
    expect((r.body as any).numero).toBe(1);
    expect(JSON.stringify(r.body)).not.toContain('Fictício'); // nada de outros lotes
  });
  it('/lote/N sequencial, token falso e lote inexistente dão a MESMA resposta 404', async () => {
    const a = await get(loteHandler, { t: '2' });
    const b = await get(loteHandler, { t: '2-0000000000000000' });
    const c = await get(loteHandler, { t: tokenLote(99)! });
    const d = await get(loteHandler, {});
    for (const r of [a, b, c, d]) expect(r.code).toBe(404);
    expect(new Set([a, b, c, d].map((r) => JSON.stringify(r.body))).size).toBe(1);
  });
  it('não existe mais listagem pública de lotes', async () => {
    const antigo = '../api/public/' + 'lotes';
    await expect(import(/* @vite-ignore */ antigo)).rejects.toThrow();
  });
});

describe('fotos', () => {
  it('foto de um lote não abre com o link de outro, nem sem link', async () => {
    const ok = await get(imgHandler, { m: 'M001', t: tokenLote(1)! });
    expect(ok.code).toBe(200);
    for (const t of [tokenLote(2)!, tokenLote(3)!, '', 'x'])
      expect((await get(imgHandler, { m: 'M001', t })).code).toBe(404);
    expect((await get(imgHandler, { m: 'M001' })).code).toBe(404);
  });
});

import lotesView from '../api/view/lotes';
import { criarCookie, criarCookieView } from '../server/auth';

describe('lista de lotes (equipe)', () => {
  const comCookie = (c?: string) => async () => {
    const r = resp();
    await lotesView({ query: {}, method: 'GET', headers: c ? { cookie: c.split(';')[0] } : {} } as any, r);
    return r;
  };
  it('sem código: 401, sem vazar nada', async () => {
    const r = await comCookie()();
    expect(r.code).toBe(401);
    expect(JSON.stringify(r.body)).not.toMatch(/Herbicida|Fictício|token/);
  });
  it('com código de visualização ou admin: lista com link assinado e sem código de material', async () => {
    for (const c of [criarCookieView(), criarCookie()]) {
      const r = await comCookie(c)();
      expect(r.code).toBe(200);
      expect((r.body as any[]).length).toBeGreaterThan(0);
      expect((r.body as any[])[0].token).toMatch(/^\d+-[0-9a-f]{16}$/);
      expect(JSON.stringify(r.body)).not.toMatch(/COD-|"id"/);
    }
  });
});
