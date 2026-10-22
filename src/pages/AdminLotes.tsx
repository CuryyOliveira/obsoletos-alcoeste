import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAsync } from '../useAsync';
import { Estado } from '../components/Estado';
import { NovoLote } from '../components/NovoLote';

export default function AdminLotes() {
  const nav = useNavigate();
  const fresco = useRef(false);
  const { data, error, loading, reload } = useAsync(() => api.materiais(fresco.current));
  const recarregar = () => { fresco.current = true; reload(); };
  const [criando, setCriando] = useState(false);

  const lotes = useMemo(
    () =>
      (data?.lotes ?? []).map((l) => {
        const ms = data!.materiais.filter((m) => m.lote === l.numero);
        return {
          ...l,
          itens: ms.length,
          pecas: ms.reduce((s, m) => s + m.quantidade, 0),
          semFoto: ms.filter((m) => !m.urlImagem).length,
        };
      }),
    [data],
  );

  return (
    <main className="page">
      <h1>Lotes</h1>
      {/* fora do <Estado>: recarregar a lista não pode desmontar o formulário nem apagar a mensagem de sucesso */}
      {data && (criando ? (
        <NovoLote lotes={data.lotes} onCriado={recarregar} onFechar={() => setCriando(false)}
          onAdicionarItens={(n) => nav(`/admin/materiais?lote=${n}`)} />
      ) : (
        <button className="btn primario" onClick={() => setCriando(true)}>+ Criar lote</button>
      ))}
      <Estado loading={loading} error={error} onRetry={reload}>
        {lotes.length === 0 && <p className="aviso">Nenhum lote cadastrado na aba Lotes da planilha.</p>}
        <ul className="cards">
          {lotes.map((l) => (
            <li key={l.numero} className="card">
              <strong>Lote {l.numero} — {l.nome}</strong>
              <span>{l.itens} itens · {l.pecas} peças</span>
              <span className={l.semFoto ? 'tag pend' : 'tag ok'}>
                {l.semFoto ? `${l.semFoto} sem foto` : 'Todas as fotos OK'}
              </span>
              <div className="acoes-linha">
                <Link className="btn primario" to={`/admin/materiais?lote=${l.numero}`}>Materiais e fotos</Link>
                {l.token && <Link className="btn" to={`/admin/previa/${l.token}`}>Ver página pública</Link>}
              </div>
            </li>
          ))}
        </ul>
        <p><Link to="/admin/qr">Gerar e imprimir QR Codes →</Link></p>
      </Estado>
    </main>
  );
}
