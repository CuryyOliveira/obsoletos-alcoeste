import { ehUrlBlob } from './blob.js';
import type { Lote, Material } from './types.js';

/**
 * REGRA DE PUBLICAÇÃO (decisão 3A): um lote é público se existe na aba LOTES.
 * Uma foto é pública só se o material tem URL_IMAGEM preenchida.
 * Campos públicos: nome do lote, quantidades, descrição, foto. NUNCA código nem IDs de planilha.
 */
export interface PublicLote {
  numero: number;
  nome: string;
  totalItens: number;
  totalPecas: number;
}
export interface PublicLoteDetalhe extends PublicLote {
  materiais: { descricao: string; quantidade: number; foto: string | null }[];
}

const resumo = (l: Lote, ms: Material[]): PublicLote => ({
  numero: l.numero,
  nome: l.nome,
  totalItens: ms.length,
  totalPecas: ms.reduce((s, m) => s + m.quantidade, 0),
});

export function listarPublico(lotes: Lote[], materiais: Material[]): PublicLote[] {
  return lotes.map((l) => resumo(l, materiais.filter((m) => m.lote === l.numero)));
}

export function detalhePublico(numero: number, lotes: Lote[], materiais: Material[]): PublicLoteDetalhe | null {
  const lote = lotes.find((l) => l.numero === numero);
  if (!lote) return null;
  const ms = materiais.filter((m) => m.lote === numero);
  return {
    ...resumo(lote, ms),
    materiais: ms.map((m) => ({
      descricao: m.descricao,
      quantidade: m.quantidade,
      // Blob: URL direta (CDN, sem passar por função). Drive: via proxy /api/img.
      foto: ehUrlBlob(m.urlImagem) ? m.urlImagem : m.urlImagem ? `/api/img?m=${encodeURIComponent(m.id)}` : null,
    })),
  };
}

/** O proxy de imagem só serve materiais que pertencem a um lote publicado. */
export function fotoPublica(id: string, lotes: Lote[], materiais: Material[]): boolean {
  const m = materiais.find((x) => x.id === id);
  return !!m?.urlImagem && lotes.some((l) => l.numero === m.lote);
}
