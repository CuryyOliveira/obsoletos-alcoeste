import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { beforeEach, describe, expect, it } from 'vitest';

/** Executa o Code.gs real contra uma planilha/Drive simulados em memória. */
function ambiente() {
  const mat = [
    ['ID_MATERIAL', 'VENDA', 'LOTE', 'CODIGO', 'DESCRICAO', 'QUANTIDADE', 'CUSTO MEDIO', 'VALOR TOTAL', 'URL_IMAGEM', 'STATUS_FOTO'],
    ['03-147', 3, 'Colhedora JD', 463430, 'CHICOTE', 1, 'R$ 1.344,83', 'R$ 1.344,83', 'https://drive.google.com/file/d/AAAAAAAAAAAAAAAAAAAAAAAA/view', 'OK'],
    ['03-155', 3, 'Colhedora JD', 412793, 'MANGUEIRA', 14, 0, 0, '', 'PENDENTE'],
    ['03-156', 3, 'Colhedora JD', 308393, 'VALVULA', 5, 1, 1, '', 'PENDENTE'],
    ['03-157', 3, 'Colhedora JD', 308393, 'VALVULA', 6, 1, 1, '', 'PENDENTE'],
    ['', 3, 'x', 1, 'sem id', 1, 1, 1, '', ''],
  ];
  const lotes = [['VENDA', 'LOTE', 'ABA_CATALOGO'], [1, 'Herbicida', 'Lote 1'], [3, 'Colhedora JD', 'Lote 3'], ['', '', '']];
  const writes: [number, number, unknown][] = [];
  const arquivos: { nome: string; id: string }[] = [];
  const props: Record<string, string> = { APPS_SCRIPT_KEY: 'k'.repeat(30) };
  const mkSheet = (v: unknown[][], nome: string) => ({
    getDataRange: () => ({ getValues: () => v }),
    getRange: (r: number, c: number) => ({ setValue: (x: unknown) => { writes.push([r, c, x]); if (nome === 'Materiais') v[r - 1][c - 1] = x; } }),
  });
  const abas: Record<string, unknown> = { Materiais: mkSheet(mat, 'Materiais'), Lotes: mkSheet(lotes, 'Lotes') };
  const ctx: Record<string, unknown> = {
    console,
    SpreadsheetApp: { getActive: () => ({ getSheetByName: (n: string) => abas[n] ?? null }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => props[k] ?? null, setProperty: (k: string, v: string) => { props[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t: string) => ({ t, setMimeType() { return this; } }) },
    Utilities: {
      base64Decode: (s: string) => [...Buffer.from(s, 'base64')].map((b) => (b > 127 ? b - 256 : b)),
      base64Encode: (b: number[]) => Buffer.from(b.map((x) => x & 255)).toString('base64'),
      newBlob: (bytes: number[], _t: string, nome: string) => ({ bytes, nome }),
      formatDate: () => '20260101-000000',
    },
    DriveApp: {
      getFolderById: () => ({ createFile: (b: { nome: string }) => { const f = { nome: b.nome, id: 'FILE' + 'X'.repeat(20) + arquivos.length }; arquivos.push(f); return { getId: () => f.id }; } }),
      getFileById: () => ({ getBlob: () => ({ getContentType: () => 'image/jpeg', getBytes: () => [255, 216, 255, 1] }) }),
    },
  };
  vm.createContext(ctx);
  vm.runInContext(readFileSync('apps-script/Code.gs', 'utf8'), ctx);
  const chamar = (corpo: object) => JSON.parse(((ctx.doPost as (e: unknown) => { t: string })({ postData: { contents: JSON.stringify(corpo) } })).t);
  return { chamar, writes, arquivos, mat };
}
const KEY = 'k'.repeat(30);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString('base64');
let A: ReturnType<typeof ambiente>;
beforeEach(() => { A = ambiente(); });

describe('Code.gs', () => {
  it('rejeita chave errada e ação desconhecida', () => {
    expect(A.chamar({ action: 'read', key: 'errada' }).erro).toBe('nao_autorizado');
    expect(A.chamar({ action: 'x', key: KEY }).erro).toBe('acao_invalida');
  });
  it('lê por cabeçalho, ignora linhas sem ID e NÃO devolve custo/valor', () => {
    const r = A.chamar({ action: 'read', key: KEY });
    expect(r.lotes).toEqual([{ numero: 1, nome: 'Herbicida' }, { numero: 3, nome: 'Colhedora JD' }]);
    expect(r.materiais).toHaveLength(4);
    expect(r.materiais[0]).toMatchObject({ id: '03-147', lote: 3, quantidade: 1 });
    expect(JSON.stringify(r)).not.toMatch(/1\.344|CUSTO|VALOR/);
  });
  it('grava só a célula URL_IMAGEM do material certo, mesmo com CODIGO repetido', () => {
    const r = A.chamar({ action: 'photo', key: KEY, materialId: '03-157', uploadId: 'u1', jpegBase64: jpeg });
    expect(r.ok).toBe(true);
    expect(A.writes).toHaveLength(1);
    expect(A.writes[0].slice(0, 2)).toEqual([5, 9]); // linha do 03-157, coluna I
    expect(A.mat[3][8]).toBe(''); // 03-156 intacto
  });
  it('mesmo uploadId não cria outro arquivo', () => {
    const a = A.chamar({ action: 'photo', key: KEY, materialId: '03-155', uploadId: 'u2', jpegBase64: jpeg });
    const b = A.chamar({ action: 'photo', key: KEY, materialId: '03-155', uploadId: 'u2', jpegBase64: jpeg });
    expect(a.urlImagem).toBe(b.urlImagem);
    expect(A.arquivos).toHaveLength(1);
  });
  it('recusa não-JPEG, ID inexistente e ID inválido', () => {
    const png = Buffer.from([1, 2, 3, 4]).toString('base64');
    expect(A.chamar({ action: 'photo', key: KEY, materialId: '03-155', uploadId: 'u3', jpegBase64: png }).erro).toBe('nao_jpeg');
    expect(A.chamar({ action: 'photo', key: KEY, materialId: '99-1', uploadId: 'u4', jpegBase64: jpeg }).erro).toBe('falha_interna');
    expect(A.chamar({ action: 'photo', key: KEY, materialId: '../x', uploadId: 'u5', jpegBase64: jpeg }).erro).toBe('dados_invalidos');
    expect(A.writes).toHaveLength(0);
  });
  it('imagem: só do arquivo citado na planilha; sem URL => sem_imagem', () => {
    expect(A.chamar({ action: 'image', key: KEY, materialId: '03-147' }).ok).toBe(true);
    expect(A.chamar({ action: 'image', key: KEY, materialId: '03-155' }).erro).toBe('sem_imagem');
  });
});
