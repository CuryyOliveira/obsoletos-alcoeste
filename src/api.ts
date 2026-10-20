export interface PublicLote { numero: number; nome: string; totalItens: number; totalPecas: number }
export interface PublicLoteDetalhe extends PublicLote {
  materiais: { descricao: string; quantidade: number; foto: string | null }[];
}
export interface Lote { numero: number; nome: string }
export interface Material {
  id: string; codigo: string; descricao: string; quantidade: number; urlImagem: string | null; lote: number;
}

export class ApiError extends Error {
  constructor(public status: number, msg: string) { super(msg); }
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(url, { credentials: 'same-origin', ...init });
  } catch {
    throw new ApiError(0, 'Sem conexão. Verifique a internet e tente novamente.');
  }
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, body.erro ?? 'Erro inesperado.');
  return body as T;
}

export const api = {
  lotes: () => req<PublicLote[]>('/api/public/lotes'),
  lote: (n: string) => req<PublicLoteDetalhe>(`/api/public/lote?n=${encodeURIComponent(n)}`),
  sessao: () => req<{ ok: boolean }>('/api/admin/login'),
  entrar: (pin: string) =>
    req<{ ok: boolean }>('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }),
    }),
  sair: () => req('/api/admin/login', { method: 'DELETE' }),
  materiais: (fresh = false) =>
    req<{ lotes: Lote[]; materiais: Material[] }>(`/api/admin/materiais${fresh ? '?fresh=1' : ''}`),
  foto: (materialId: string, uploadId: string, imagem: string) =>
    req<{ ok: boolean }>('/api/admin/foto', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialId, uploadId, imagem }),
    }),
};
