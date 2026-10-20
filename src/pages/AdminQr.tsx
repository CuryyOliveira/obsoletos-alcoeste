import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { api } from '../api';
import { useAsync } from '../useAsync';
import { Estado } from '../components/Estado';

const urlLote = (n: number) => `${window.location.origin}/lote/${n}`;

function baixar(href: string, nome: string) {
  const a = document.createElement('a');
  a.href = href; a.download = nome; a.click();
}

function Etiqueta({ numero, nome }: { numero: number; nome: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(urlLote(numero), { width: 600, margin: 2, errorCorrectionLevel: 'M' }).then(setSrc); }, [numero]);
  return (
    <figure className="etiqueta">
      {src && <img src={src} alt={`QR Code do lote ${numero}`} />}
      <figcaption><strong>Lote {numero}</strong><span>{nome}</span></figcaption>
      <div className="nao-imprimir acoes-linha">
        <button className="btn" onClick={() => baixar(src, `lote-${numero}.png`)}>PNG</button>
        <button className="btn" onClick={async () => {
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
  return (
    <main className="page">
      <div className="nao-imprimir">
        <h1>QR Codes dos lotes</h1>
        <p>Cada QR abre a página pública do lote. Endereço: <code>{window.location.origin}/lote/Nº</code></p>
        <button className="btn primario" onClick={() => window.print()}>🖨️ Imprimir todas as etiquetas</button>
      </div>
      <Estado loading={loading} error={error} onRetry={reload}>
        <div className="etiquetas">{data?.lotes.map((l) => <Etiqueta key={l.numero} numero={l.numero} nome={l.nome} />)}</div>
      </Estado>
    </main>
  );
}
