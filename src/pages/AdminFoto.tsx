import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAsync } from '../useAsync';
import { Estado } from '../components/Estado';
import { novoUploadId, reduzirImagem } from '../imagem';

export default function AdminFoto() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { data, error, loading, reload } = useAsync(() => api.materiais(true), [id]);
  const [previa, setPrevia] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const uploadId = useRef(novoUploadId()); // mesmo id em novas tentativas => sem duplicar
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  useEffect(() => { uploadId.current = novoUploadId(); }, [previa]);

  const m = data?.materiais.find((x) => x.id === id);

  async function escolher(f?: File) {
    if (!f) return;
    setMsg(null);
    try { setPrevia(await reduzirImagem(f)); }
    catch { setMsg({ tipo: 'erro', texto: 'Não foi possível ler esta imagem. Escolha outra.' }); }
  }
  async function salvar() {
    if (!previa || !m) return;
    setBusy(true); setMsg(null);
    try {
      await api.foto(m.id, uploadId.current, previa);
      setMsg({ tipo: 'ok', texto: 'Foto salva com sucesso!' });
      setPrevia(null);
      reload();
    } catch (e) { setMsg({ tipo: 'erro', texto: (e as Error).message }); }
    setBusy(false);
  }

  return (
    <main className="page estreita">
      <Link className="voltar" to={m ? `/admin/materiais?lote=${m.lote}` : '/admin/materiais'}>← Lista</Link>
      <Estado loading={loading} error={error} onRetry={reload}>
        {!m ? <p className="aviso">Material não encontrado.</p> : (
          <>
            <h1>{m.descricao}</h1>
            <p>{m.codigo} · Lote {m.lote} · Quantidade {m.quantidade}</p>
            {previa ? (
              <img className="previa" src={previa} alt="Prévia da nova foto" />
            ) : m.urlImagem ? (
              <img className="previa" src={`/api/img?m=${encodeURIComponent(m.id)}&t=${Date.now()}`} alt="Foto atual" />
            ) : <div className="previa vazio">Sem foto</div>}
            {msg && <p className={msg.tipo === 'ok' ? 'ok' : 'erro'} role="status">{msg.texto}</p>}
            {previa ? (
              <div className="acoes">
                <button className="btn primario grande" onClick={salvar} disabled={busy}>{busy ? 'Salvando…' : 'Salvar foto'}</button>
                <button className="btn grande" onClick={() => { setPrevia(null); setMsg(null); }} disabled={busy}>Cancelar</button>
              </div>
            ) : (
              <div className="acoes">
                <button className="btn primario grande" onClick={() => cam.current?.click()}>📷 Tirar foto</button>
                <button className="btn grande" onClick={() => gal.current?.click()}>🖼️ Escolher da galeria</button>
                {msg?.tipo === 'ok' && <button className="btn grande" onClick={() => nav(`/admin/materiais?lote=${m.lote}`)}>Voltar à lista</button>}
              </div>
            )}
            <input ref={cam} type="file" accept="image/*" capture="environment" hidden
              onChange={(e) => { escolher(e.target.files?.[0]); e.target.value = ''; }} />
            <input ref={gal} type="file" accept="image/*" hidden
              onChange={(e) => { escolher(e.target.files?.[0]); e.target.value = ''; }} />
          </>
        )}
      </Estado>
    </main>
  );
}
