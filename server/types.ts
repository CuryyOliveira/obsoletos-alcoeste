/** Entidades internas. Mapeamento: docs/mapeamento.md */
export interface Lote {
  numero: number; // aba LOTES, coluna C (identificador estável)
  nome: string; // aba LOTES, coluna B
}

export interface Material {
  id: string; // aba MATERIAIS, coluna A (ID_MATERIAL)
  codigo: string; // coluna D — só na área administrativa
  descricao: string; // coluna E
  quantidade: number; // coluna F
  urlImagem: string | null; // coluna I
  lote: number;
}

export interface NovoMaterial {
  lote: number;
  codigo: string;
  descricao: string;
  quantidade: number;
  requestId: string; // repetir o mesmo requestId não cria outro item
}

export interface DataSource {
  listLotes(): Promise<Lote[]>;
  listMateriais(): Promise<Material[]>;
  /** Grava a foto (Drive) e a URL na coluna I. Idempotente por uploadId. */
  salvarFoto(input: { materialId: string; uploadId: string; jpeg: Buffer }): Promise<{ urlImagem: string }>;
  /** Só grava a URL (coluna URL_IMAGEM) de uma foto que já está hospedada em outro lugar (Blob). */
  registrarUrl(input: { materialId: string; urlImagem: string }): Promise<void>;
  /** Cria o material (ID gerado pelo script). Idempotente por requestId. */
  adicionarMaterial(input: NovoMaterial): Promise<{ id: string }>;
  /** Exclusão reversível: a linha vai para a aba Excluidos antes de sair de Materiais. */
  excluirMaterial(input: { materialId: string }): Promise<void>;
  /** Bytes da imagem de um material (para o proxy /api/img). */
  lerFoto(materialId: string): Promise<{ contentType: string; data: Buffer } | null>;
}
