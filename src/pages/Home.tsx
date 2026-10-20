import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAsync } from '../useAsync';
import { Estado } from '../components/Estado';

/** Raiz do site: para o público só orienta a escanear o QR. Com o código de visualização (equipe), lista todos os lotes. */
export default function Home() {
  const [liberado, setLiberado] = useState<boolean | null>(null);
  useEffect(() => { api.viewSessao().then(() => setLiberado(true)).catch(() => setLiberado(false)); }, []);

  return (
    <main className="page estreita">
      <header className="topo">
        <h1>Materiais obsoletos</h1>
        <p>Para ver os materiais de uma caixa, escaneie o QR Code colado nela.</p>
      </header>
      {liberado === true && <Lotes onSair={() => setLiberado(false)} />}
      {liberado === false && <Entrar onOk={() => setLiberado(true)} />}
    </main>
  );
}

function Entrar({ onOk }: { onOk: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErro('');
    try { await api.viewEntrar(pin); onOk(); } catch (x) { setErro((x as Error).message); }
    setBusy(false);
  }
  if (!aberto) return <button className="link" onClick={() => setAberto(true)}>Acesso da equipe</button>;
  return (
    <form onSubmit={enviar} className="aviso">
      <label>Código de visualização
        <input type="password" inputMode="numeric" autoComplete="current-password" value={pin}
          onChange={(e) => setPin(e.target.value)} autoFocus />
      </label>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <button className="btn primario" disabled={busy || !pin}>{busy ? 'Entrando…' : 'Ver lotes'}</button>
    </form>
  );
}

function Lotes({ onSair }: { onSair: () => void }) {
  const { data, error, loading, reload } = useAsync(api.viewLotes);
  return (
    <>
      <Estado loading={loading} error={error} onRetry={reload}>
        <ul className="cards">
          {data?.map((l) => (
            <li key={l.numero}>
              {/* state: só quem chegou pela lista vê o "← Todos os lotes"; quem chega pelo QR não vê */}
              <Link className="card" to={`/lote/${l.token}`} state={{ voltar: '/' }}>
                <strong>Lote {l.numero} — {l.nome}</strong>
                <span>{l.totalItens} itens · {l.totalPecas} peças</span>
              </Link>
            </li>
          ))}
        </ul>
      </Estado>
      <button className="link" onClick={async () => { await api.viewSair(); onSair(); }}>Sair</button>
    </>
  );
}
