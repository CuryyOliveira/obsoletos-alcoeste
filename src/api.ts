export interface PublicLoteDetalhe {
  numero: number; nome: string; totalItens: number; totalPecas: number;
  materiais: { descricao: string; quantidade: number; foto: string | null }[];
}
export interface Lote { numero: number; nome: string; token: string | null }
export interface Material {
  id: string; codigo: string; descricao: string; quantidade: number; urlImagem: string | null; lote: number;
}

export interface LoteResumo { numero: number; nome: string; totalItens: number; totalPecas: number; token: string }

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
  lote: (t: string) => req<PublicLoteDetalhe>(`/api/public/lote?t=${encodeURIComponent(t)}`),
  viewSessao: () => req<{ ok: boolean }>('/api/view/login'),
  viewEntrar: (pin: string) =>
    req<{ ok: boolean }>('/api/view/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }),
    }),
  viewSair: () => req('/api/view/login', { method: 'DELETE' }),
  viewLotes: () => req<LoteResumo[]>('/api/view/lotes'),
  sessao: () => req<{ ok: boolean }>('/api/admin/login'),
  entrar: (pin: string) =>
    req<{ ok: boolean }>('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }),
    }),
  sair: () => req('/api/admin/login', { method: 'DELETE' }),
  materiais: (fresh = false) =>
    req<{ lotes: Lote[]; materiais: Material[]; linksConfigurados: boolean }>(`/api/admin/materiais${fresh ? '?fresh=1' : ''}`),
  adicionarMaterial: (d: { lote: number; codigo: string; descricao: string; quantidade: number; requestId: string }) =>
    req<{ ok: boolean; id: string }>('/api/admin/material', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'adicionar', ...d }),
    }),
  excluirMaterial: (id: string) =>
    req<{ ok: boolean }>('/api/admin/material', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'excluir', id }),
    }),
  foto: (materialId: string, uploadId: string, imagem: string, quantidade: number | null) =>
    req<{ ok: boolean; quantidade: { anterior: number; atual: number } | null }>('/api/admin/foto', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialId, uploadId, imagem, quantidade }),
    }),
};
