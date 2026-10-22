/** Lê o que o conferente digitou. "" => null (manter a original); "4,5" => 4.5; "1.000" => 1000; inválido => NaN. */
export function lerQuantidade(txt: string): number | null {
  const t = txt.trim().replace(/\s/g, '');
  if (t === '') return null;
  let n: string;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) n = t.replace(/\./g, '').replace(',', '.'); // 1.000 ou 1.000,5
  else if (/^\d+([.,]\d+)?$/.test(t)) n = t.replace(',', '.');
  else return NaN;
  const v = Number(n);
  return Number.isFinite(v) && v <= 1_000_000 && Math.round(v * 1000) === v * 1000 ? v : NaN;
}
