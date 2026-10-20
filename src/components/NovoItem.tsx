import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Lote } from '../api';
import { novoUploadId } from '../imagem';

/** Formulário de novo item. O requestId só muda após sucesso: tocar "Adicionar" de novo depois de uma falha de rede não duplica. */
export function NovoItem({ lotes, loteInicial, onCriado, onFechar }: {
  lotes: Lote[]; loteInicial: string; onCriado: () => void; onFechar: () => void;
}) {
  const [lote, setLote] = useState(loteInicial || String(lotes[0]?.numero ?? ''));
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const [criado, setCriado] = useState<string | null>(null);
  const requestId = useRef(novoUploadId());

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErro('');
    try {
      const r = await api.adicionarMaterial({
        lote: Number(lote), codigo, descricao, quantidade: Number(quantidade), requestId: requestId.current,
      });
      setCriado(r.id);
      requestId.current = novoUploadId();
      setCodigo(''); setDescricao(''); setQuantidade('');
      onCriado();
    } catch (x) { setErro((x as Error).message); }
    setBusy(false);
  }

  return (
    <form className="aviso form" onSubmit={enviar}>
      <h2>Adicionar item</h2>
      <label>Lote
        <select value={lote} onChange={(e) => setLote(e.target.value)} required>
          {lotes.map((l) => <option key={l.numero} value={l.numero}>Lote {l.numero} — {l.nome}</option>)}
        </select>
      </label>
      <label>Código
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={40} required />
      </label>
      <label>Descrição
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={120} required />
      </label>
      <label>Quantidade
        <input type="number" inputMode="numeric" min={1} step={1} value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)} required />
      </label>
      {erro && <p className="erro" role="alert">{erro}</p>}
      {criado && (
        <p className="ok" role="status">
          Item {criado} adicionado. <Link to={`/admin/foto/${encodeURIComponent(criado)}`}>Fotografar agora</Link>
        </p>
      )}
      <div className="acoes">
        <button className="btn primario grande" disabled={busy}>{busy ? 'Adicionando…' : 'Adicionar'}</button>
        <button type="button" className="btn grande" onClick={onFechar} disabled={busy}>Fechar</button>
      </div>
    </form>
  );
}
