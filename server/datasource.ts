import { createMock } from './mock.js';
import type { DataSource } from './types.js';

let instance: DataSource | null = null;
let cache: { at: number; lotes: Awaited<ReturnType<DataSource['listLotes']>>; materiais: Awaited<ReturnType<DataSource['listMateriais']>> } | null = null;
const TTL_MS = 30_000;

export function getDataSource(): DataSource {
  if (instance) return instance;
  const kind = process.env.DATA_SOURCE ?? 'mock';
  if (kind === 'mock') instance = createMock();
  else throw new Error(`DATA_SOURCE "${kind}" ainda não implementado (Fase 3: Apps Script).`);
  return instance;
}

/** Leitura em lote com cache curto, para poupar cota e manter rapidez. */
export async function snapshot(force = false) {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache;
  const ds = getDataSource();
  const [lotes, materiais] = await Promise.all([ds.listLotes(), ds.listMateriais()]);
  cache = { at: Date.now(), lotes, materiais };
  return cache;
}

export function invalidate() {
  cache = null;
}
