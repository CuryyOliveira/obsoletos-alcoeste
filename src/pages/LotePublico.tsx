import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api } from '../api';
import { useAsync } from '../useAsync';
import { Estado } from '../components/Estado';

export default function LotePublico({ previa = false }: { previa?: boolean }) {
  const { n = '' } = useParams();
  const { data, error, loading, reload } = useAsync(() => api.lote(n), [n]);
  const [zoom, setZoom] = useState<string | null>(null);

  if (error instanceof ApiError && error.status === 404)
    return (
      <main className="page">
        <div className="aviso"><h1>Lote não encontrado</h1>
          <p>Este lote não existe ou ainda não foi publicado.</p>
          <Link className="btn" to="/">Ver lotes disponíveis</Link></div>
      </main>
    );

  return (
    <main className="page">
      {!previa && <Link to="/" className="voltar">← Todos os lotes</Link>}
      <Estado loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <header className="topo">
              <h1>Lote {data.numero} — {data.nome}</h1>
              <p>{data.totalItens} itens · {data.totalPecas} peças disponíveis</p>
            </header>
            <ul className="materiais">
              {data.materiais.map((m, i) => (
                <li key={i} className="material">
                  {m.foto ? (
                    <button className="thumb" onClick={() => setZoom(m.foto)} aria-label={`Ampliar foto: ${m.descricao}`}>
                      <img src={m.foto} alt={m.descricao} loading="lazy" decoding="async" />
                    </button>
                  ) : <div className="thumb vazio">sem foto</div>}
                  <div><strong>{m.descricao}</strong><span>Quantidade: {m.quantidade}</span></div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Estado>
      {zoom && (
        <div className="zoom" onClick={() => setZoom(null)} role="dialog" aria-label="Foto ampliada">
          <img src={zoom} alt="" /><button className="btn">Fechar</button>
        </div>
      )}
    </main>
  );
}
