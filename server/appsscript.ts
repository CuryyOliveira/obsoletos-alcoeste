import type { DataSource, Lote, Material } from './types.js';

interface Resposta {
  ok: boolean;
  erro?: string;
  [k: string]: unknown;
}

/** Fonte de dados real: Google Planilhas + Drive via Apps Script publicado na conta do proprietário. */
export function createAppsScript(url: string, key: string, fetchImpl: typeof fetch = fetch): DataSource {
  async function chamar(corpo: Record<string, unknown>): Promise<Resposta> {
    let r: Response;
    try {
      r = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight; Apps Script lê o corpo cru
        body: JSON.stringify({ ...corpo, key }),
        redirect: 'follow',
        signal: AbortSignal.timeout(25_000),
      });
    } catch {
      throw new Error('Apps Script inacessível');
    }
    const texto = await r.text();
    let j: Resposta;
    try {
      j = JSON.parse(texto) as Resposta;
    } catch {
      throw new Error(`Apps Script respondeu algo inesperado (HTTP ${r.status})`);
    }
    if (!j.ok) throw new Error(`Apps Script: ${j.erro ?? 'erro desconhecido'}`);
    return j;
  }

  // lotes e materiais saem da mesma leitura; chamadas simultâneas compartilham uma só ida ao Apps Script
  let pendente: Promise<{ lotes: Lote[]; materiais: Material[] }> | null = null;
  function ler() {
    pendente ??= chamar({ action: 'read' })
      .then((j) => {
        if (!Array.isArray(j.lotes) || !Array.isArray(j.materiais)) throw new Error('Resposta de leitura inválida');
        return { lotes: j.lotes as Lote[], materiais: j.materiais as Material[] };
      })
      .finally(() => {
        pendente = null;
      });
    return pendente;
  }

  return {
    async listLotes() {
      return (await ler()).lotes;
    },
    async listMateriais() {
      return (await ler()).materiais;
    },
    async salvarFoto({ materialId, uploadId, jpeg }) {
      const j = await chamar({ action: 'photo', materialId, uploadId, jpegBase64: jpeg.toString('base64') });
      if (typeof j.urlImagem !== 'string') throw new Error('Resposta de gravação inválida');
      return { urlImagem: j.urlImagem };
    },
    async lerFoto(materialId) {
      try {
        const j = await chamar({ action: 'image', materialId });
        if (typeof j.data !== 'string' || typeof j.contentType !== 'string') return null;
        return { contentType: j.contentType, data: Buffer.from(j.data, 'base64') };
      } catch (e) {
        if (/sem_imagem|id_inexistente/.test((e as Error).message)) return null;
        throw e;
      }
    },
  };
}
