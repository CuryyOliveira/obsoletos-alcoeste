import { useRef, useState } from 'react';
import { api, type Lote } from '../api';
import { novoUploadId } from '../imagem';

/** Formulário de novo lote. O requestId só muda após sucesso: tocar "Criar" de novo depois de uma falha de rede não duplica. */
export function NovoLote({ lotes, onCriado, onAdicionarItens, onFechar }: {
  lotes: Lote[]; onCriado: () => void; onAdicionarItens: (numero: number) => void; onFechar: () => void;
}) {
  const sugestao = String(lotes.reduce((m, l) => Math.max(m, l.numero), 0) + 1);
  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState(sugestao);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const [criado, setCriado] = useState<{ numero: number; nome: string; aba?: string } | null>(null);
  const requestId = useRef(novoUploadId());

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    const n = Number(numero);
    if (lotes.some((l) => l.numero === n)) { setErro(`Já existe o lote ${n} (${lotes.find((l) => l.numero === n)?.nome}). Use outro número.`); return; }
    setBusy(true);
    try {
      const r = await api.criarLote({ numero: n, nome, requestId: requestId.current });
      setCriado({ numero: n, nome: nome.trim(), aba: r.aba });
      requestId.current = novoUploadId();
      onCriado();
    } catch (x) { setErro((x as Error).message); }
    setBusy(false);
  }

  if (criado) return (
    <div className="aviso form">
      <h2>Lote criado</h2>
      <p className="ok" role="status">Lote {criado.numero} — {criado.nome} criado na planilha (aba Lotes{criado.aba === 'criada' ? ` e aba "Lote ${criado.numero}"` : ''}).</p>
      {criado.aba === 'sem_modelo' && <p className="erro" role="alert">A aba "Lote {criado.numero}" NÃO foi criada: não encontrei a aba-modelo "Lote 1". Crie-a manualmente copiando "Lote 1" e informando o número em B1.</p>}
      <div className="acoes">
        <button className="btn primario grande" onClick={() => onAdicionarItens(criado.numero)}>Adicionar itens a este lote</button>
        <button className="btn grande" onClick={onFechar}>Fechar</button>
      </div>
    </div>
  );

  return (
    <form className="aviso form" onSubmit={enviar}>
      <h2>Criar lote</h2>
      <label>Nome do lote
        <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} required />
      </label>
      <label>Número do lote
        <input type="number" inputMode="numeric" min={1} max={999999} step={1} value={numero}
          onChange={(e) => setNumero(e.target.value)} required />
      </label>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="acoes">
        <button className="btn primario grande" disabled={busy}>{busy ? 'Criando…' : 'Criar lote'}</button>
        <button type="button" className="btn grande" onClick={onFechar} disabled={busy}>Fechar</button>
      </div>
    </form>
  );
}
