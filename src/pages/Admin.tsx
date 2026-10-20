import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { api } from '../api';
import AdminLista from './AdminLista';
import AdminFoto from './AdminFoto';
import AdminQr from './AdminQr';
import LotePublico from './LotePublico';
import { ROTA_PREVIA } from '../rotas';

export default function Admin() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => { api.sessao().then(() => setOk(true)).catch(() => setOk(false)); }, []);
  if (ok === null) return <p className="aviso">Carregando…</p>;
  if (!ok) return <Entrar onOk={() => setOk(true)} />;
  return <Painel onSair={() => setOk(false)} />;
}

function Entrar({ onOk }: { onOk: () => void }) {
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErro('');
    try { await api.entrar(pin); onOk(); } catch (x) { setErro((x as Error).message); }
    setBusy(false);
  }
  return (
    <main className="page estreita">
      <form onSubmit={enviar} className="aviso">
        <h1>Área de fotos</h1>
        <label>PIN de acesso
          <input type="password" inputMode="numeric" autoComplete="current-password" value={pin}
            onChange={(e) => setPin(e.target.value)} autoFocus />
        </label>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="btn primario" disabled={busy || !pin}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </main>
  );
}

function Painel({ onSair }: { onSair: () => void }) {
  const nav = useNavigate();
  return (
    <div className="admin">
      <nav className="menu">
        <NavLink to="/admin" end>Materiais</NavLink>
        <NavLink to="/admin/qr">QR Codes</NavLink>
        <button className="link" onClick={async () => { await api.sair(); onSair(); nav('/admin'); }}>Sair</button>
      </nav>
      <Routes>
        <Route index element={<AdminLista />} />
        <Route path="foto/:id" element={<AdminFoto />} />
        <Route path="qr" element={<AdminQr />} />
        <Route path={ROTA_PREVIA} element={<><Link className="voltar" to="/admin/qr">← Voltar</Link><LotePublico previa /></>} />
      </Routes>
    </div>
  );
}
