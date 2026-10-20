import { ehUrlBlob } from './blob.js';
import type { Lote, Material } from './types.js';

/**
 * REGRA DE PUBLICAÇÃO (decisão 3A): um lote é público se existe na aba LOTES.
 * Uma foto é pública só se o material tem URL_IMAGEM preenchida.
 * Campos públicos: nome do lote, quantidades, descrição, foto. NUNCA código nem IDs de planilha.
 * Acesso: só com o link assinado do próprio lote (server/links.ts); não há lista pública nem navegação entre lotes.
 */
export interface PublicLoteDetalhe {
  numero: number;
  nome: string;
  totalItens: number;
  totalPecas: number;
  materiais: { descricao: string; quantidade: number; foto: string | null }[];
}

/** `token` é o do próprio lote; entra no endereço das fotos servidas pelo proxy. Não existe listagem pública de lotes. */
export function detalhePublico(numero: number, lotes: Lote[], materiais: Material[], token: string): PublicLoteDetalhe | null {
  const lote = lotes.find((l) => l.numero === numero);
  if (!lote) return null;
  const ms = materiais.filter((m) => m.lote === numero);
  return {
    numero: lote.numero,
    nome: lote.nome,
    totalItens: ms.length,
    totalPecas: ms.reduce((s, m) => s + m.quantidade, 0),
    materiais: ms.map((m) => ({
      descricao: m.descricao,
      quantidade: m.quantidade,
      // Blob: URL direta e impossível de adivinhar (uuid no caminho). Drive: via proxy /api/img, que exige o token do lote.
      foto: ehUrlBlob(m.urlImagem)
        ? m.urlImagem
        : m.urlImagem
          ? `/api/img?m=${encodeURIComponent(m.id)}&t=${encodeURIComponent(token)}`
          : null,
    })),
  };
}

/** O proxy de imagem só serve materiais que pertencem a um lote publicado. */
export function fotoPublica(id: string, lotes: Lote[], materiais: Material[]): boolean {
  const m = materiais.find((x) => x.id === id);
  return !!m?.urlImagem && lotes.some((l) => l.numero === m.lote);
}
