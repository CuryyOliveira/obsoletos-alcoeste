import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Link de cada lote = "<número>-<assinatura>". A assinatura é um HMAC do número com LOTE_LINK_SECRET,
 * então o link de um lote não permite deduzir o de outro, e o mesmo lote tem sempre o mesmo link (QR permanente).
 * NUNCA troque LOTE_LINK_SECRET depois de imprimir etiquetas: todos os QR deixariam de funcionar.
 */
const FORMATO = /^(\d{1,6})-([0-9a-f]{16})$/;

function segredo(env: NodeJS.ProcessEnv): string | null {
  const s = env.LOTE_LINK_SECRET;
  return s && s.length >= 16 ? s : null;
}

const assinar = (numero: number, s: string) => createHmac('sha256', s).update(`lote:${numero}`).digest('hex').slice(0, 16);

export function linksConfigurados(env: NodeJS.ProcessEnv = process.env): boolean {
  return segredo(env) !== null;
}

export function tokenLote(numero: number, env: NodeJS.ProcessEnv = process.env): string | null {
  const s = segredo(env);
  return s && Number.isInteger(numero) && numero > 0 ? `${numero}-${assinar(numero, s)}` : null;
}

/** Devolve o número do lote se o token for autêntico; senão null (inclusive sem segredo configurado). */
export function numeroDoToken(token: unknown, env: NodeJS.ProcessEnv = process.env): number | null {
  const s = segredo(env);
  const m = typeof token === 'string' ? FORMATO.exec(token) : null;
  if (!s || !m) return null;
  const numero = Number(m[1]);
  const esperado = Buffer.from(assinar(numero, s));
  const recebido = Buffer.from(m[2]);
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido) ? numero : null;
}
