import type { NovoMaterial } from './types.js';

export const MAX_JPEG_BYTES = 3 * 1024 * 1024;

export function parseJpegDataUrl(s: unknown): Buffer | null {
  if (typeof s !== 'string') return null;
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(s);
  if (!m) return null;
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length === 0 || buf.length > MAX_JPEG_BYTES) return null;
  // assinatura JPEG: FF D8 FF
  if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return null;
  return buf;
}

export const idValido = (s: unknown): s is string => typeof s === 'string' && /^[\w.-]{1,64}$/.test(s);

const limpo = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length >= 1 && t.length <= max ? t : null;
};

/** Valida o formulário de novo item. Devolve o item limpo ou a mensagem de erro para o usuário. */
export function validarNovoMaterial(b: Record<string, unknown> | undefined): { valor: NovoMaterial } | { erro: string } {
  const lote = Number(b?.lote);
  const codigo = limpo(b?.codigo, 40);
  const descricao = limpo(b?.descricao, 120);
  const quantidade = Number(b?.quantidade);
  if (!Number.isInteger(lote) || lote < 1) return { erro: 'Escolha o lote.' };
  if (!codigo) return { erro: 'Informe o código (até 40 caracteres).' };
  if (!descricao) return { erro: 'Informe a descrição (até 120 caracteres).' };
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 1_000_000) return { erro: 'A quantidade deve ser um número inteiro maior que zero.' };
  if (!idValido(b?.requestId)) return { erro: 'Requisição inválida. Recarregue a página.' };
  return { valor: { lote, codigo, descricao, quantidade, requestId: b!.requestId as string } };
}

/**
 * Quantidade confirmada pelo conferente. Ausente/null = não informou (sem alteração).
 * Zero é aceito. Número ≥ 0, até 1.000.000 e 3 casas decimais.
 */
export function validarQuantidade(v: unknown): { valor: number | null } | { erro: string } {
  if (v === undefined || v === null) return { valor: null };
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1_000_000 || Math.round(v * 1000) !== v * 1000)
    return { erro: 'Quantidade inválida. Use um número de 0 a 1.000.000.' };
  return { valor: v };
}
