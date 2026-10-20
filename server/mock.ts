import type { DataSource, Lote, Material } from './types.js';

const placeholder = (txt: string) =>
  'data:image/svg+xml;base64,' +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#d9dee3"/><text x="50%" y="50%" font-family="sans-serif" font-size="40" text-anchor="middle" fill="#445">${txt}</text></svg>`,
  ).toString('base64');

const lotes: Lote[] = [
  { numero: 1, nome: 'Herbicida' },
  { numero: 2, nome: 'Fictício B' },
  { numero: 3, nome: 'Fictício C' },
];

const seed: [string, string, number, number, boolean][] = [
  ['M001', 'JUNTA ROTATIVA SUP.COMP.CANHAO', 4, 1, true],
  ['M002', 'CORPO BICO P/ BARRA UMIDA 1/2', 61, 1, true],
  ['M003', 'VALVULA DIST.ADUBO LIQUIDO', 2, 1, false],
  ['M004', 'FILTRO BOMBA HERBIC.JACTO COMP', 2, 1, false],
  ['M005', 'TANQUE 18 LTS HERBICAT', 1, 1, true],
  ['M006', 'ANEL CHATO 4x47x67 P/ CONEXAO', 14, 1, false],
  ['M007', 'PARAFUSO REGULAGEM', 24, 2, true],
  ['M008', 'SEMI BRACADEIRA P/TUBO 40', 69, 2, false],
  ['M009', 'FLANGE FEMEA PARA MANOMETRO', 5, 3, false],
];

export function createMock(): DataSource {
  const materiais: Material[] = seed.map(([id, d, q, l, foto], i) => ({
    id,
    codigo: `COD-${1000 + i}`,
    descricao: d,
    quantidade: q,
    lote: l,
    urlImagem: foto ? placeholder(id) : null,
  }));
  const feitos = new Map<string, string>(); // uploadId -> urlImagem
  const adicionados = new Map<string, string>(); // requestId -> id
  const excluidos = new Set<string>();

  return {
    async listLotes() {
      return lotes;
    },
    async listMateriais() {
      return materiais.map((m) => ({ ...m }));
    },
    async salvarFoto({ materialId, uploadId, jpeg }) {
      const prev = feitos.get(uploadId);
      if (prev) return { urlImagem: prev };
      const m = materiais.find((x) => x.id === materialId);
      if (!m) throw new Error('Material não encontrado');
      m.urlImagem = 'data:image/jpeg;base64,' + jpeg.toString('base64');
      feitos.set(uploadId, m.urlImagem);
      return { urlImagem: m.urlImagem };
    },
    async adicionarMaterial(input) {
      const ja = adicionados.get(input.requestId);
      if (ja) return { id: ja };
      const pref = String(input.lote).padStart(2, '0') + '-';
      const usados = new Set([...materiais.map((m) => m.id), ...excluidos]);
      let n = 1;
      while (usados.has(pref + String(n).padStart(3, '0'))) n++;
      const id = pref + String(n).padStart(3, '0');
      materiais.push({ id, codigo: input.codigo, descricao: input.descricao, quantidade: input.quantidade, lote: input.lote, urlImagem: null });
      adicionados.set(input.requestId, id);
      return { id };
    },
    async excluirMaterial({ materialId }) {
      const i = materiais.findIndex((x) => x.id === materialId);
      if (i < 0) throw new Error('Material não encontrado');
      excluidos.add(materiais[i].id);
      materiais.splice(i, 1);
    },
    async registrarUrl({ materialId, urlImagem }) {
      const m = materiais.find((x) => x.id === materialId);
      if (!m) throw new Error('Material não encontrado');
      m.urlImagem = urlImagem;
    },
    async lerFoto(materialId) {
      const m = materiais.find((x) => x.id === materialId);
      if (!m?.urlImagem) return null;
      const [head, b64] = m.urlImagem.split(',');
      return { contentType: head.slice(5, head.indexOf(';')), data: Buffer.from(b64, 'base64') };
    },
  };
}
