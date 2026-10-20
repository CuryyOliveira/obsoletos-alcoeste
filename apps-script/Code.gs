/**
 * Fotos Obsoletos — ponte entre o site (Vercel) e esta planilha + pasta do Drive.
 * Cole este arquivo em: Planilha > Extensões > Apps Script.
 * Roda com a SUA conta. A chave de acesso fica em Propriedades do script (APPS_SCRIPT_KEY), nunca neste código.
 *
 * O script só LÊ colunas do catálogo e só ESCREVE a célula URL_IMAGEM do material informado.
 * Nunca lê CUSTO MEDIO / VALOR TOTAL e nunca apaga nada.
 */
var FOLDER_ID = '1HcHurJLG1NjRB4O1jjG2y2VoDwkZ5N7e'; // pasta "FOTOS DO CATÁLOGO"
var ABA_MATERIAIS = 'Materiais';
var ABA_LOTES = 'Lotes';
var MAX_BYTES = 3 * 1024 * 1024;
var MAX_IMG_BYTES = 12 * 1024 * 1024;

function doGet() {
  return out({ ok: true, servico: 'fotos-obsoletos' }); // teste de vida; não devolve dados
}

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    var key = PropertiesService.getScriptProperties().getProperty('APPS_SCRIPT_KEY');
    if (!key || key.length < 20 || !iguais(String(req.key || ''), key)) return out({ ok: false, erro: 'nao_autorizado' });
    switch (req.action) {
      case 'read': return out(lerTudo());
      case 'photo': return out(salvarFoto(req));
      case 'image': return out(lerImagem(req));
      default: return out({ ok: false, erro: 'acao_invalida' });
    }
  } catch (err) {
    console.error(String(err && err.message));
    return out({ ok: false, erro: 'falha_interna' });
  }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function iguais(a, b) {
  if (a.length !== b.length) return false;
  var r = 0;
  for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function norm(h) {
  return String(h).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
}

/** Lê a aba pelo NOME do cabeçalho (linha 1), não pela letra da coluna. */
function tabela(nomeAba, obrigatorias) {
  var sh = SpreadsheetApp.getActive().getSheetByName(nomeAba);
  if (!sh) throw new Error('aba_ausente:' + nomeAba);
  var v = sh.getDataRange().getValues();
  var idx = {};
  for (var c = 0; c < v[0].length; c++) idx[norm(v[0][c])] = c;
  obrigatorias.forEach(function (n) {
    if (idx[n] === undefined) throw new Error('coluna_ausente:' + nomeAba + ':' + n);
  });
  return { sh: sh, v: v, idx: idx };
}

function lerTudo() {
  var L = tabela(ABA_LOTES, ['VENDA', 'LOTE']);
  var lotes = [];
  for (var i = 1; i < L.v.length; i++) {
    var n = Number(L.v[i][L.idx['VENDA']]);
    var nome = String(L.v[i][L.idx['LOTE']]).trim();
    if (isFinite(n) && n > 0 && nome) lotes.push({ numero: n, nome: nome });
  }
  var M = tabela(ABA_MATERIAIS, ['ID_MATERIAL', 'VENDA', 'CODIGO', 'DESCRICAO', 'QUANTIDADE', 'URL_IMAGEM']);
  var materiais = [];
  for (var j = 1; j < M.v.length; j++) {
    var r = M.v[j];
    var id = String(r[M.idx['ID_MATERIAL']]).trim();
    var lote = Number(r[M.idx['VENDA']]);
    if (!id || !isFinite(lote)) continue;
    var q = Number(r[M.idx['QUANTIDADE']]);
    var url = String(r[M.idx['URL_IMAGEM']]).trim();
    materiais.push({
      id: id,
      codigo: String(r[M.idx['CODIGO']]).trim(),
      descricao: String(r[M.idx['DESCRICAO']]).trim(),
      quantidade: isFinite(q) ? q : 0,
      urlImagem: url || null,
      lote: lote,
    });
  }
  return { ok: true, lotes: lotes, materiais: materiais };
}

/** Linha (1-based) do material; recusa se o ID não existir ou estiver duplicado. */
function achar(M, id) {
  var achados = [];
  for (var i = 1; i < M.v.length; i++) if (String(M.v[i][M.idx['ID_MATERIAL']]).trim() === id) achados.push(i + 1);
  if (achados.length !== 1) throw new Error('id_' + (achados.length ? 'duplicado' : 'inexistente'));
  return achados[0];
}

function salvarFoto(req) {
  var id = String(req.materialId || '');
  var up = String(req.uploadId || '');
  if (!/^[\w.-]{1,64}$/.test(id) || !/^[\w.-]{1,64}$/.test(up)) return { ok: false, erro: 'dados_invalidos' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var props = PropertiesService.getScriptProperties();
    var M = tabela(ABA_MATERIAIS, ['ID_MATERIAL', 'URL_IMAGEM']);
    var linha = achar(M, id);
    var url = props.getProperty('up_' + up); // mesmo uploadId => não cria outro arquivo
    if (!url) {
      var bytes = Utilities.base64Decode(String(req.jpegBase64 || ''));
      if (!bytes.length || bytes.length > MAX_BYTES) return { ok: false, erro: 'tamanho_invalido' };
      if ((bytes[0] & 255) !== 0xff || (bytes[1] & 255) !== 0xd8 || (bytes[2] & 255) !== 0xff) return { ok: false, erro: 'nao_jpeg' };
      var nome = id + '_' + Utilities.formatDate(new Date(), 'GMT', 'yyyyMMdd-HHmmss') + '.jpg';
      var file = DriveApp.getFolderById(FOLDER_ID).createFile(Utilities.newBlob(bytes, 'image/jpeg', nome));
      url = 'https://drive.google.com/file/d/' + file.getId() + '/view';
      props.setProperty('up_' + up, url); // grava ANTES da planilha: se a escrita falhar, a repetição reaproveita o arquivo
    }
    M.sh.getRange(linha, M.idx['URL_IMAGEM'] + 1).setValue(url);
    return { ok: true, urlImagem: url };
  } finally {
    lock.releaseLock();
  }
}

/** Só devolve a imagem do material informado (arquivo citado na própria planilha), nunca um arquivo arbitrário. */
function lerImagem(req) {
  var id = String(req.materialId || '');
  if (!/^[\w.-]{1,64}$/.test(id)) return { ok: false, erro: 'dados_invalidos' };
  var M = tabela(ABA_MATERIAIS, ['ID_MATERIAL', 'URL_IMAGEM']);
  var url = String(M.v[achar(M, id) - 1][M.idx['URL_IMAGEM']]).trim();
  var m = /(?:\/d\/|[?&]id=)([-\w]{20,})/.exec(url);
  if (!m) return { ok: false, erro: 'sem_imagem' };
  var blob = DriveApp.getFileById(m[1]).getBlob();
  var bytes = blob.getBytes();
  if (bytes.length > MAX_IMG_BYTES) return { ok: false, erro: 'imagem_grande' };
  return { ok: true, contentType: blob.getContentType(), data: Utilities.base64Encode(bytes) };
}
