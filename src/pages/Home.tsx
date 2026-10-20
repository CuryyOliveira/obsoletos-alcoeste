import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAsync } from '../useAsync';
import { Estado } from '../components/Estado';

export default function Home() {
  const { data, error, loading, reload } = useAsync(api.lotes);
  return (
    <main className="page">
      <header className="topo"><h1>Materiais obsoletos</h1><p>Escolha um lote</p></header>
      <Estado loading={loading} error={error} onRetry={reload}>
        <ul className="cards">
          {data?.map((l) => (
            <li key={l.numero}>
              <Link className="card" to={`/lote/${l.numero}`}>
                <strong>Lote {l.numero} — {l.nome}</strong>
                <span>{l.totalItens} itens · {l.totalPecas} peças</span>
              </Link>
            </li>
          ))}
        </ul>
      </Estado>
    </main>
  );
}
