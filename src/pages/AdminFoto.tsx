import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, type Material } from '../api';
import { useAsync } from '../useAsync';
import { Estado } from '../components/Estado';
import { novoUploadId, reduzirImagem } from '../imagem';
import { lerQuantidade } from '../quantidade';

const fmtQtd = (n: number) => String(n).replace('.', ',');

export default function AdminFoto() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  // O item chega pronto da lista (router state): a tela abre na hora e a releitura roda em segundo plano, sem forçar a planilha.
  const doEstado = (useLocation().state as { m?: Material } | null)?.m;
  const fresco = useRef(false); // depois de salvar, a próxima leitura é "fresca" (outra instância do servidor pode estar defasada)
  const { data, error, loading, reload } = useAsync(() => api.materiais(fresco.current), [id]);
  const [previa, setPrevia] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // Confirmação da quantidade antes de gravar a foto: 'qtd' = conferente informa; 'diff' = confirma a quantidade diferente da original.
  const [etapa, setEtapa] = useState<'qtd' | 'diff' | null>(null);
  const [qtdTxt, setQtdTxt] = useState('');
  const [erroQtd, setErroQtd] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [erroExcluir, setErroExcluir] = useState('');
  const uploadId = useRef(novoUploadId()); // mesmo id em novas tentativas => sem duplicar
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  useEffect(() => { uploadId.current = novoUploadId(); setEtapa(null); }, [previa]);

  const m = data?.materiais.find((x) => x.id === id) ?? (doEstado?.id === id ? doEstado : undefined);
  const versaoFoto = m?.urlImagem ? encodeURIComponent(m.urlImagem.slice(-24)) : '0';

  async function escolher(f?: File) {
    if (!f) return;
    setMsg(null);
    try { setPrevia(await reduzirImagem(f)); }
    catch { setMsg({ tipo: 'erro', texto: 'Não foi possível ler esta imagem. Escolha outra.' }); }
  }
  function pedirQuantidade() {
    if (!m) return;
    setMsg(null); setErroQtd(''); setQtdTxt(fmtQtd(m.quantidade)); setEtapa('qtd');
  }
  /** O conferente confirmou o campo Qtd.: igual/vazio => salva direto; diferente => pede nova confirmação. */
  function confirmarQuantidade() {
    if (!m) return;
    const q = lerQuantidade(qtdTxt);
    if (q !== null && Number.isNaN(q)) { setErroQtd('Quantidade inválida. Digite um número (zero é permitido).'); return; }
    if (q === null || q === m.quantidade) { void salvar(null); return; }
    setErroQtd(''); setEtapa('diff');
  }
  async function salvar(quantidade: number | null) {
    if (!previa || !m) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api.foto(m.id, uploadId.current, previa, quantidade);
      setMsg({
        tipo: 'ok',
        texto: r.quantidade
          ? `Foto salva! Quantidade alterada de ${fmtQtd(r.quantidade.anterior)} para ${fmtQtd(r.quantidade.atual)}.`
          : 'Foto salva com sucesso!',
      });
      setPrevia(null);
      fresco.current = true;
      reload();
    } catch (e) { setMsg({ tipo: 'erro', texto: (e as Error).message }); }
    setBusy(false);
  }

  async function excluir() {
    if (!m) return;
    setBusy(true); setErroExcluir('');
    try {
      await api.excluirMaterial(m.id);
      nav(`/admin/materiais?lote=${m.lote}`);
    } catch (e) { setErroExcluir((e as Error).message); setBusy(false); }
  }

  return (
    <main className="page estreita">
      <Link className="voltar" to={m ? `/admin/materiais?lote=${m.lote}` : '/admin/materiais'}>← Lista</Link>
      <Estado loading={loading && !m} error={m ? null : error} onRetry={reload}>
        {!m ? <p className="aviso">Material não encontrado.</p> : (
          <>
            <h1>{m.descricao}</h1>
            <p>{m.codigo} · Lote {m.lote} · Quantidade {m.quantidade}</p>
            {previa ? (
              <img className="previa" src={previa} alt="Prévia da nova foto" />
            ) : m.urlImagem ? (
              <img className="previa" src={`/api/img?m=${encodeURIComponent(m.id)}&v=${versaoFoto}`} alt="Foto atual" />
            ) : <div className="previa vazio">Sem foto</div>}
            {msg && <p className={msg.tipo === 'ok' ? 'ok' : 'erro'} role="status">{msg.texto}</p>}
            {previa && etapa === 'qtd' ? (
              <div className="aviso" role="group" aria-label="Confirmar quantidade">
                <label>
                  <strong>Confirme a quantidade (Qtd.)</strong>
                  <input inputMode="decimal" value={qtdTxt} autoFocus disabled={busy}
                    onChange={(e) => { setQtdTxt(e.target.value); setErroQtd(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmarQuantidade(); }} />
                </label>
                <p>Quantidade na lista: <strong>{fmtQtd(m.quantidade)}</strong>. Se estiver diferente, digite a quantidade correta. Zero é permitido.</p>
                {erroQtd && <p className="erro" role="alert">{erroQtd}</p>}
                <div className="acoes">
                  <button className="btn primario grande" onClick={confirmarQuantidade} disabled={busy}>{busy ? 'Salvando…' : 'Confirmar e salvar foto'}</button>
                  <button className="btn grande" onClick={() => setEtapa(null)} disabled={busy}>Voltar</button>
                </div>
              </div>
            ) : previa && etapa === 'diff' ? (
              <div className="aviso erro" role="alertdialog" aria-label="Confirmar nova quantidade">
                <p><strong>Alterar a quantidade de {fmtQtd(m.quantidade)} para {fmtQtd(lerQuantidade(qtdTxt) ?? m.quantidade)}?</strong></p>
                <p>A nova quantidade substitui a original na planilha (aba Materiais) e no site, e a troca fica registrada na aba Historico.</p>
                <div className="acoes">
                  <button className="btn primario grande" onClick={() => salvar(lerQuantidade(qtdTxt))} disabled={busy}>{busy ? 'Salvando…' : 'Sim, alterar e salvar foto'}</button>
                  <button className="btn grande" onClick={() => setEtapa('qtd')} disabled={busy}>Corrigir</button>
                </div>
              </div>
            ) : previa ? (
              <div className="acoes">
                <button className="btn primario grande" onClick={pedirQuantidade} disabled={busy}>Salvar foto</button>
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
            <hr />
            {!excluindo ? (
              <button className="btn perigo" onClick={() => setExcluindo(true)} disabled={busy}>Excluir item</button>
            ) : (
              <div className="aviso erro" role="alertdialog" aria-label="Confirmar exclusão">
                <p><strong>Excluir "{m.descricao}"?</strong></p>
                <p>O item sai da lista e do site e é movido para a aba <em>Excluidos</em> da planilha, de onde pode ser recuperado. As fotos não são apagadas.</p>
                {erroExcluir && <p role="alert">{erroExcluir}</p>}
                <div className="acoes">
                  <button className="btn perigo grande" onClick={excluir} disabled={busy}>{busy ? 'Excluindo…' : 'Sim, excluir'}</button>
                  <button className="btn grande" onClick={() => { setExcluindo(false); setErroExcluir(''); }} disabled={busy}>Cancelar</button>
                </div>
              </div>
            )}
          </>
        )}
      </Estado>
    </main>
  );
}
