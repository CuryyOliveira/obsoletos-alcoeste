import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { api } from '../api';
import { useAsync } from '../useAsync';
import { Estado } from '../components/Estado';

const CHAVE = 'obs_base_url';
const lerBase = () => {
  try { return localStorage.getItem(CHAVE) || ''; } catch { return ''; }
};
const ehLocal = () => /^(localhost|127\.|192\.168\.|10\.)/.test(window.location.hostname);
/** Em localhost/rede local o QR não funcionaria no celular: usa a URL pública informada. */
const baseUrl = () => (ehLocal() ? lerBase() : '') || window.location.origin;
const urlLote = (n: number) => `${baseUrl().replace(/\/+$/, '')}/lote/${n}`;

function baixar(href: string, nome: string) {
  const a = document.createElement('a');
  a.href = href; a.download = nome; a.click();
}

function Etiqueta({ numero, nome, bloqueado }: { numero: number; nome: string; bloqueado: boolean }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    if (bloqueado) { setSrc(''); return; }
    QRCode.toDataURL(urlLote(numero), { width: 600, margin: 2, errorCorrectionLevel: 'M' }).then(setSrc);
  }, [numero, bloqueado]);
  return (
    <figure className="etiqueta">
      {src && <img src={src} alt={`QR Code do lote ${numero}`} />}
      <figcaption><strong>Lote {numero}</strong><span>{nome}</span></figcaption>
      <div className="nao-imprimir acoes-linha">
        <button className="btn" disabled={bloqueado} onClick={() => baixar(src, `lote-${numero}.png`)}>PNG</button>
        <button className="btn" disabled={bloqueado} onClick={async () => {
          const svg = await QRCode.toString(urlLote(numero), { type: 'svg', margin: 2 });
          baixar(URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })), `lote-${numero}.svg`);
        }}>SVG</button>
        <Link className="btn" to={`/admin/previa/${numero}`}>Prévia</Link>
      </div>
    </figure>
  );
}

export default function AdminQr() {
  const { data, error, loading, reload } = useAsync(() => api.materiais());
  const [base, setBase] = useState(lerBase());
  const [versao, setVersao] = useState(0);
  const invalida = ehLocal() && !/^https:\/\/[^/\s]+$/.test(base.trim().replace(/\/+$/, ''));
  return (
    <main className="page">
      <div className="nao-imprimir">
        <h1>QR Codes dos lotes</h1>
        {ehLocal() && (
          <div className="aviso erro" role="alert">
            <p>Você está em um endereço local ({window.location.host}); um QR com esse endereço <strong>não abre no celular</strong>.
              Informe a URL pública do aplicativo (ex.: https://seu-app.vercel.app):</p>
            <input type="url" inputMode="url" placeholder="https://seu-app.vercel.app" value={base}
              onChange={(e) => { setBase(e.target.value); try { localStorage.setItem(CHAVE, e.target.value.trim()); } catch { /* ignora */ } setVersao((v) => v + 1); }} />
          </div>
        )}
        <p>Cada QR abre a página pública do lote. Endereço: <code>{baseUrl()}/lote/Nº</code></p>
        <button className="btn primario" onClick={() => window.print()} disabled={invalida}>🖨️ Imprimir todas as etiquetas</button>
      </div>
      <Estado loading={loading} error={error} onRetry={reload}>
        <div className="etiquetas">{data?.lotes.map((l) => <Etiqueta key={`${l.numero}-${versao}`} numero={l.numero} nome={l.nome} bloqueado={invalida} />)}</div>
      </Estado>
    </main>
  );
}
