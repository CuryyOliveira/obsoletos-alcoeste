import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { beforeEach, describe, expect, it } from 'vitest';

/** Planilha simulada com valores, fórmulas, formatos, abas extras e deleteRow — para testar adicionar/excluir do Code.gs real. */
class Aba {
  fmt: Record<string, string> = {};
  constructor(public nome: string, public v: unknown[][], public f: string[][] = v.map((r) => r.map(() => ''))) {}
  getLastRow() { return this.v.length; }
  getLastColumn() { return Math.max(...this.v.map((r) => r.length)); }
  getDataRange() { return { getValues: () => this.v.map((r) => [...r]) }; }
  deleteRow(n: number) { this.v.splice(n - 1, 1); this.f.splice(n - 1, 1); }
  getRange(r: number, c: number, nr = 1, nc = 1) {
    const aba = this;
    const garante = (rr: number) => { while (aba.v.length < rr) { aba.v.push([]); aba.f.push([]); } };
    return {
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => aba.v[r - 1 + i]?.[c - 1 + j] ?? '')),
      getValue: () => aba.v[r - 1]?.[c - 1] ?? '',
      getFormulasR1C1: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => aba.f[r - 1 + i]?.[c - 1 + j] ?? '')),
      setValue: (x: unknown) => { garante(r); aba.v[r - 1][c - 1] = typeof x === 'string' && x.startsWith('=') && aba.fmt[`${r},${c}`] !== '@' ? `#FORMULA:${x}` : x; aba.f[r - 1][c - 1] = ''; },
      setValues: (m: unknown[][]) => m.forEach((row, i) => { garante(r + i); row.forEach((x, j) => { aba.v[r - 1 + i][c - 1 + j] = x; }); }),
      setFormulaR1C1: (x: string) => { garante(r); aba.f[r - 1][c - 1] = x; aba.v[r - 1][c - 1] = `=calc(${x})`; },
      setNumberFormat(x: string) { aba.fmt[`${r},${c}`] = x; return this; },
    };
  }
}

const CAB = ['ID_MATERIAL', 'VENDA', 'LOTE', 'CODIGO', 'DESCRICAO', 'QUANTIDADE', 'CUSTO MEDIO', 'VALOR TOTAL', 'URL_IMAGEM', 'STATUS_FOTO'];
const KEY = 'k'.repeat(30);

function ambiente() {
  const mat = new Aba('Materiais', [
    CAB,
    ['03-147', 3, 'Colhedora JD', 463430, 'CHICOTE', 1, 10, 10, 'https://drive.google.com/file/d/AAAAAAAAAAAAAAAAAAAAAAAA/view', 'OK'],
    ['03-157', 3, 'Colhedora JD', 308393, 'VALVULA', 2, 5, 10, '', 'PENDENTE'],
    ['01-001', 1, 'Herbicida', 1, 'A', 1, 1, 1, '', 'PENDENTE'],
  ], [
    CAB.map(() => ''),
    ...[1, 2, 3].map(() => ['', '', '', '', '', '', '', 'R[0]C[-2]*R[0]C[-1]', '', 'SE(RC[-1]="";"PENDENTE";"OK")']), // toda linha de dados tem as fórmulas
  ]);
  const lotes = new Aba('Lotes', [['VENDA', 'LOTE', 'ABA_CATALOGO'], [1, 'Herbicida', 'Lote 1'], [3, 'Colhedora JD', 'Lote 3'], [4, 'Teste', 'Lote 4']]);
  const abas: Record<string, Aba> = { Materiais: mat, Lotes: lotes };
  const props: Record<string, string> = { APPS_SCRIPT_KEY: KEY };
  const ctx: Record<string, unknown> = {
    console,
    SpreadsheetApp: { getActive: () => ({ getSheetByName: (n: string) => abas[n] ?? null, insertSheet: (n: string) => (abas[n] = new Aba(n, [])) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => props[k] ?? null, setProperty: (k: string, v: string) => { props[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t: string) => ({ t, setMimeType() { return this; } }) },
    Utilities: { base64Decode: () => [], base64Encode: () => '', newBlob: () => ({}), formatDate: () => 'x' },
    DriveApp: {},
  };
  vm.createContext(ctx);
  vm.runInContext(readFileSync('apps-script/Code.gs', 'utf8'), ctx);
  const chamar = (corpo: object) => JSON.parse((ctx.doPost as (e: unknown) => { t: string })({ postData: { contents: JSON.stringify({ key: KEY, ...corpo }) } }).t);
  return { chamar, abas, mat };
}
let A: ReturnType<typeof ambiente>;
beforeEach(() => { A = ambiente(); });

const novo = (o: object = {}) => ({ action: 'add', requestId: 'r1', lote: 3, codigo: '412345', descricao: 'MANGUEIRA NOVA', quantidade: 7, ...o });

describe('adicionar item', () => {
  it('gera o próximo ID do lote, grava os campos e copia as fórmulas da última linha preenchida', () => {
    const r = A.chamar(novo());
    expect(r).toEqual({ ok: true, id: '03-158' });
    const linha = A.mat.v[4];
    expect(linha.slice(0, 6)).toEqual(['03-158', 3, 'Colhedora JD', 412345, 'MANGUEIRA NOVA', 7]);
    expect(A.mat.f[4][9]).toBe('SE(RC[-1]="";"PENDENTE";"OK")'); // STATUS_FOTO
    expect(A.mat.f[4][7]).toBe('R[0]C[-2]*R[0]C[-1]'); // VALOR TOTAL
    expect(linha[8] ?? '').toBe(''); // URL_IMAGEM não preenchida
    expect(A.mat.v).toHaveLength(5); // nada foi sobrescrito
    expect(A.mat.v[1][4]).toBe('CHICOTE');
  });
  it('lote novo começa em 001; lote de um dígito ganha zero à esquerda', () => {
    expect(A.chamar(novo({ requestId: 'r2', lote: 4 })).id).toBe('04-001');
  });
  it('mesmo requestId não cria duas linhas', () => {
    const a = A.chamar(novo()); const b = A.chamar(novo());
    expect(b.id).toBe(a.id);
    expect(A.mat.v).toHaveLength(5);
  });
  it('lote inexistente e dados inválidos são recusados sem escrever nada', () => {
    expect(A.chamar(novo({ lote: 9 })).erro).toBe('lote_inexistente');
    for (const ruim of [{ quantidade: 0 }, { quantidade: 1.5 }, { quantidade: -3 }, { codigo: '' }, { descricao: ' ' }, { descricao: 'x'.repeat(121) }, { lote: 'a' }, { requestId: '../x' }])
      expect(A.chamar(novo({ requestId: 'rx' + Math.random(), ...ruim })).erro).toMatch(/dados_invalidos|lote_inexistente/);
    expect(A.mat.v).toHaveLength(4);
  });
  it('texto que começa com "=" é gravado como TEXTO, nunca como fórmula', () => {
    A.chamar(novo({ descricao: '=IMPORTRANGE("x";"y")', codigo: '=1+1' }));
    const linha = A.mat.v[4];
    expect(linha[4]).toBe('=IMPORTRANGE("x";"y")');
    expect(String(linha[4])).not.toContain('#FORMULA');
    expect(linha[3]).toBe('=1+1');
    expect(String(linha[3])).not.toContain('#FORMULA');
  });
  it('não reaproveita ID de item excluído', () => {
    A.chamar({ action: 'delete', materialId: '03-157' });
    expect(A.chamar(novo()).id).toBe('03-158'); // 03-157 foi para Excluidos; maior ID existente era 03-147, mas 03-157 não volta
  });
});

describe('excluir item', () => {
  it('copia para a aba Excluidos (criada com cabeçalho + data) e só então remove de Materiais', () => {
    const r = A.chamar({ action: 'delete', materialId: '03-157' });
    expect(r.ok).toBe(true);
    expect(A.mat.v.map((l) => l[0])).toEqual(['ID_MATERIAL', '03-147', '01-001']);
    const ex = A.abas.Excluidos;
    expect(ex.v[0]).toEqual([...CAB, 'EXCLUIDO_EM']);
    expect(ex.v[1].slice(0, 6)).toEqual(['03-157', 3, 'Colhedora JD', 308393, 'VALVULA', 2]);
    expect(Object.prototype.toString.call(ex.v[1][10])).toBe('[object Date]'); // data/hora da exclusão
  });
  it('segunda exclusão vai para a MESMA aba, na linha seguinte', () => {
    A.chamar({ action: 'delete', materialId: '03-157' });
    A.chamar({ action: 'delete', materialId: '01-001' });
    expect(A.abas.Excluidos.v.map((l) => l[0])).toEqual(['ID_MATERIAL', '03-157', '01-001']);
  });
  it('ID inexistente, repetido (já excluído) ou inválido não apaga nada', () => {
    expect(A.chamar({ action: 'delete', materialId: '99-999' }).erro).toBe('falha_interna');
    expect(A.chamar({ action: 'delete', materialId: '../x' }).erro).toBe('dados_invalidos');
    A.chamar({ action: 'delete', materialId: '03-157' });
    expect(A.chamar({ action: 'delete', materialId: '03-157' }).ok).toBe(false);
    expect(A.mat.v).toHaveLength(3);
  });
  it('exige a chave', () => {
    const r = A.chamar({ action: 'delete', materialId: '03-157', key: 'errada' });
    expect(r.erro).toBe('nao_autorizado');
    expect(A.mat.v).toHaveLength(4);
  });
});
