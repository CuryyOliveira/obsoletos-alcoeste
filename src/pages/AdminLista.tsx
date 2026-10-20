import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAsync } from '../useAsync';
import { Estado } from '../components/Estado';

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const PAGINA = 50;

export default function AdminLista() {
  const { data, error, loading, reload } = useAsync(() => api.materiais());
  const [q, setQ] = useState('');
  const [lote, setLote] = useState('');
  const [semFoto, setSemFoto] = useState(false);
  const [limite, setLimite] = useState(PAGINA);

  const filtrados = useMemo(() => {
    const t = norm(q.trim());
    return (data?.materiais ?? []).filter(
      (m) =>
        (!lote || m.lote === Number(lote)) &&
        (!semFoto || !m.urlImagem) &&
        (!t || norm(m.codigo).includes(t) || norm(m.descricao).includes(t)),
    );
  }, [data, q, lote, semFoto]);

  const total = data?.materiais.length ?? 0;
  const pend = data?.materiais.filter((m) => !m.urlImagem).length ?? 0;

  return (
    <main className="page">
      <Estado loading={loading} error={error} onRetry={reload}>
        <p className="resumo"><strong>{total}</strong> materiais · <strong>{pend}</strong> sem foto
          <button className="link" onClick={() => api.materiais(true).then(() => reload())}>Atualizar</button></p>
        <div className="filtros">
          <input type="search" placeholder="Buscar por código ou descrição" value={q}
            onChange={(e) => { setQ(e.target.value); setLimite(PAGINA); }} />
          <select value={lote} onChange={(e) => setLote(e.target.value)} aria-label="Lote">
            <option value="">Todos os lotes</option>
            {data?.lotes.map((l) => <option key={l.numero} value={l.numero}>Lote {l.numero} — {l.nome}</option>)}
          </select>
          <label className="chk"><input type="checkbox" checked={semFoto} onChange={(e) => setSemFoto(e.target.checked)} /> Só sem foto</label>
        </div>
        <ul className="materiais">
          {filtrados.slice(0, limite).map((m) => (
            <li key={m.id}>
              <Link className="material linha" to={`/admin/foto/${encodeURIComponent(m.id)}`}>
                <div><strong>{m.descricao}</strong>
                  <span>{m.codigo} · Lote {m.lote} · Qtd {m.quantidade}</span></div>
                <span className={m.urlImagem ? 'tag ok' : 'tag pend'}>{m.urlImagem ? 'OK' : 'PENDENTE'}</span>
              </Link>
            </li>
          ))}
        </ul>
        {filtrados.length === 0 && <p className="aviso">Nenhum material encontrado.</p>}
        {filtrados.length > limite && <button className="btn" onClick={() => setLimite(limite + PAGINA)}>Mostrar mais</button>}
      </Estado>
    </main>
  );
}
