import { beforeAll, describe, expect, it } from 'vitest';
import fotoHandler from '../api/admin/foto';
import { criarCookie } from '../server/auth';
import { snapshot } from '../server/datasource';
import { lerQuantidade } from '../src/quantidade';

// JPEG mínimo válido para o validador (assinatura FF D8 FF)
const JPEG = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]).toString('base64');

beforeAll(() => {
  process.env.DATA_SOURCE = 'mock';
  process.env.SESSION_SECRET = 'segredo-de-sessao-de-teste-1234';
  process.env.LOTE_LINK_SECRET = 'segredo-de-teste-para-links-1234';
  delete process.env.BLOB_READ_WRITE_TOKEN;
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
const qtdDe = async (id: string) => (await snapshot(true)).materiais.find((m) => m.id === id)!.quantidade;

describe('foto + confirmação de quantidade', () => {
  it('sem login: 401 e a quantidade não muda', async () => {
    expect((await post({ materialId: 'M001', uploadId: 'u0', imagem: JPEG, quantidade: 99 }, false)).code).toBe(401);
    expect(await qtdDe('M001')).toBe(4);
  });
  it('quantidade igual à original (ou ausente): salva a foto e não altera nada', async () => {
    const a = await post({ materialId: 'M001', uploadId: 'u1', imagem: JPEG, quantidade: 4 });
    const b = await post({ materialId: 'M001', uploadId: 'u2', imagem: JPEG });
    expect([a.code, b.code]).toEqual([200, 200]);
    expect(a.body.quantidade).toBeNull();
    expect(await qtdDe('M001')).toBe(4);
  });
  it('quantidade diferente: altera a lista, devolve anterior/atual e repetir não duplica', async () => {
    const corpo = { materialId: 'M002', uploadId: 'u3', imagem: JPEG, quantidade: 58 };
    const a = await post(corpo);
    expect(a.code).toBe(200);
    expect(a.body.quantidade).toEqual({ anterior: 61, atual: 58 });
    expect(await qtdDe('M002')).toBe(58);
    const b = await post(corpo); // repetição com o mesmo uploadId
    expect(b.code).toBe(200);
    expect(await qtdDe('M002')).toBe(58);
  });
  it('aceita zero', async () => {
    expect((await post({ materialId: 'M003', uploadId: 'u4', imagem: JPEG, quantidade: 0 })).code).toBe(200);
    expect(await qtdDe('M003')).toBe(0);
  });
  it('recusa quantidade inválida sem salvar a foto', async () => {
    const antes = (await snapshot(true)).materiais.find((m) => m.id === 'M004')!;
    for (const ruim of [-1, 1.2345, '7', 2_000_000, NaN])
      expect((await post({ materialId: 'M004', uploadId: 'u5', imagem: JPEG, quantidade: ruim })).code).toBe(400);
    const depois = (await snapshot(true)).materiais.find((m) => m.id === 'M004')!;
    expect(depois).toEqual(antes);
  });
});

describe('lerQuantidade (campo digitado)', () => {
  it('vazio mantém; vírgula e milhar; lixo é NaN; zero vale', () => {
    expect(lerQuantidade('')).toBeNull();
    expect(lerQuantidade('  ')).toBeNull();
    expect(lerQuantidade('0')).toBe(0);
    expect(lerQuantidade('4,5')).toBe(4.5);
    expect(lerQuantidade('1.000')).toBe(1000);
    expect(lerQuantidade('1.000,5')).toBe(1000.5);
    for (const x of ['abc', '-3', '1,2,3', '1e3', '2000000', '1,2345']) expect(lerQuantidade(x)).toBeNaN();
  });
});
