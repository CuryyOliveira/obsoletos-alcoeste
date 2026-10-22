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
var ABA_EXCLUIDOS = 'Excluidos';
var ABA_HISTORICO = 'Historico';
var MAX_BYTES = 3 * 1024 * 1024;
var MAX_IMG_BYTES = 12 * 1024 * 1024;
// Fotos hospedadas no Vercel Blob (lote 4 em diante): só este formato de URL é aceito.
var URL_BLOB = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/fotos\/[\w.-]+\/[\w.-]+\.jpg$/;

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
      case 'seturl': return out(registrarUrl(req));
      case 'add': return out(adicionarMaterial(req));
      case 'delete': return out(excluirMaterial(req));
      case 'qty': return out(alterarQuantidade(req));
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

/** Grava SÓ a célula URL_IMAGEM do material, e só com URL do nosso Blob. */
function registrarUrl(req) {
  var id = String(req.materialId || '');
  var url = String(req.url || '');
  if (!/^[\w.-]{1,64}$/.test(id) || !URL_BLOB.test(url)) return { ok: false, erro: 'dados_invalidos' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var M = tabela(ABA_MATERIAIS, ['ID_MATERIAL', 'URL_IMAGEM']);
    M.sh.getRange(achar(M, id), M.idx['URL_IMAGEM'] + 1).setValue(url);
    return { ok: true, urlImagem: url };
  } finally {
    lock.releaseLock();
  }
}

function limpaTexto(v, max) {
  var t = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? '' : t;
}

function pad(n, w) {
  var t = String(n);
  while (t.length < w) t = '0' + t;
  return t;
}

/** Texto do usuário nunca vira fórmula: formato "texto simples" antes de gravar. */
function gravaTexto(range, valor) {
  range.setNumberFormat('@');
  range.setValue(valor);
}

/**
 * Cria um material no fim da aba Materiais. Gera o ID_MATERIAL ("NN-NNN", próximo número do lote, sem reaproveitar
 * IDs já usados nem os da aba Excluidos), copia as fórmulas da última linha preenchida (ex.: STATUS_FOTO) e é
 * idempotente por requestId.
 */
function adicionarMaterial(req) {
  var rid = String(req.requestId || '');
  var lote = Number(req.lote);
  var codigo = limpaTexto(req.codigo, 40);
  var desc = limpaTexto(req.descricao, 120);
  var qtd = Number(req.quantidade);
  if (!/^[\w.-]{1,64}$/.test(rid) || !isFinite(lote) || lote < 1 || lote % 1 || !codigo || !desc || !isFinite(qtd) || qtd < 1 || qtd > 1000000 || qtd % 1)
    return { ok: false, erro: 'dados_invalidos' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var props = PropertiesService.getScriptProperties();
    var feito = props.getProperty('add_' + rid);
    if (feito) return { ok: true, id: feito };
    var L = tabela(ABA_LOTES, ['VENDA', 'LOTE']);
    var nomeLote = null;
    for (var i = 1; i < L.v.length; i++) if (Number(L.v[i][L.idx['VENDA']]) === lote) nomeLote = String(L.v[i][L.idx['LOTE']]).trim();
    if (!nomeLote) return { ok: false, erro: 'lote_inexistente' };

    var M = tabela(ABA_MATERIAIS, ['ID_MATERIAL', 'VENDA', 'LOTE', 'CODIGO', 'DESCRICAO', 'QUANTIDADE']);
    var pref = pad(lote, 2) + '-';
    var usados = {};
    var max = 0;
    var ultima = 1;
    var anota = function (id) {
      if (!id) return;
      usados[id] = true;
      if (id.indexOf(pref) === 0) max = Math.max(max, parseInt(id.slice(pref.length), 10) || 0);
    };
    for (var j = 1; j < M.v.length; j++) {
      var id = String(M.v[j][M.idx['ID_MATERIAL']]).trim();
      if (id) { anota(id); ultima = j + 1; }
    }
    var ex = SpreadsheetApp.getActive().getSheetByName(ABA_EXCLUIDOS);
    if (ex && ex.getLastRow() > 1) {
      var cab = ex.getRange(1, 1, 1, ex.getLastColumn()).getValues()[0].map(norm);
      var c = cab.indexOf('ID_MATERIAL');
      if (c >= 0) ex.getRange(2, c + 1, ex.getLastRow() - 1, 1).getValues().forEach(function (r) { anota(String(r[0]).trim()); });
    }
    var n = max + 1;
    var novoId = pref + pad(n, 3);
    while (usados[novoId]) { n++; novoId = pref + pad(n, 3); }

    var linha = ultima + 1;
    var sh = M.sh;
    var nCols = M.v[0].length;
    var f = sh.getRange(ultima, 1, 1, nCols).getFormulasR1C1()[0];
    for (var k = 0; k < nCols; k++) if (f[k]) sh.getRange(linha, k + 1).setFormulaR1C1(f[k]);
    var col = function (nome) { return sh.getRange(linha, M.idx[nome] + 1); };
    gravaTexto(col('ID_MATERIAL'), novoId);
    col('VENDA').setValue(lote);
    gravaTexto(col('LOTE'), nomeLote);
    if (/^\d{1,15}$/.test(codigo)) col('CODIGO').setValue(Number(codigo)); else gravaTexto(col('CODIGO'), codigo);
    gravaTexto(col('DESCRICAO'), desc);
    col('QUANTIDADE').setValue(qtd);
    props.setProperty('add_' + rid, novoId);
    return { ok: true, id: novoId };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Exclusão REVERSÍVEL: copia a linha para a aba Excluidos (criada se não existir, com data/hora) e só então remove
 * da aba Materiais. Fotos no Drive/Blob não são apagadas.
 */
function excluirMaterial(req) {
  var id = String(req.materialId || '');
  if (!/^[\w.-]{1,64}$/.test(id)) return { ok: false, erro: 'dados_invalidos' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var M = tabela(ABA_MATERIAIS, ['ID_MATERIAL']);
    var linha = achar(M, id);
    var nCols = M.v[0].length;
    var ss = SpreadsheetApp.getActive();
    var ex = ss.getSheetByName(ABA_EXCLUIDOS);
    if (!ex) {
      ex = ss.insertSheet(ABA_EXCLUIDOS);
      ex.getRange(1, 1, 1, nCols + 1).setValues([M.v[0].concat(['EXCLUIDO_EM'])]);
    }
    var destino = ex.getLastRow() + 1;
    ex.getRange(destino, 1, 1, nCols + 1).setValues([M.v[linha - 1].concat([new Date()])]);
    if (String(ex.getRange(destino, M.idx['ID_MATERIAL'] + 1).getValue()).trim() !== id) throw new Error('arquivo_falhou');
    M.sh.deleteRow(linha);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Confirmação da quantidade pelo conferente: altera SÓ a célula QUANTIDADE do material e registra a troca na aba
 * Historico (criada se não existir). O valor anterior é lido da própria planilha, nunca informado pelo site.
 * Idempotente por requestId: repetir não duplica o registro. Se o valor já é igual, não grava nada.
 */
function alterarQuantidade(req) {
  var id = String(req.materialId || '');
  var rid = String(req.requestId || '');
  var qtd = req.quantidade;
  if (!/^[\w.-]{1,64}$/.test(id) || !/^[\w.-]{1,64}$/.test(rid) || typeof qtd !== 'number' || !isFinite(qtd) || qtd < 0 || qtd > 1000000 || Math.round(qtd * 1000) !== qtd * 1000)
    return { ok: false, erro: 'dados_invalidos' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var props = PropertiesService.getScriptProperties();
    var M = tabela(ABA_MATERIAIS, ['ID_MATERIAL', 'VENDA', 'LOTE', 'CODIGO', 'DESCRICAO', 'QUANTIDADE']);
    var linha = achar(M, id);
    var r = M.v[linha - 1];
    var anterior = Number(r[M.idx['QUANTIDADE']]);
    if (!isFinite(anterior)) anterior = 0; // célula vazia conta como 0
    if (anterior === qtd) return { ok: true, alterada: false, anterior: anterior, atual: qtd };
    if (!props.getProperty('qtyh_' + rid)) { // histórico ANTES da troca: nenhuma alteração fica sem registro
      var ss = SpreadsheetApp.getActive();
      var h = ss.getSheetByName(ABA_HISTORICO);
      if (!h) {
        h = ss.insertSheet(ABA_HISTORICO);
        h.getRange(1, 1, 1, 8).setValues([['DATA_HORA', 'ID_MATERIAL', 'VENDA', 'LOTE', 'CODIGO', 'DESCRICAO', 'QTD_ANTERIOR', 'QTD_NOVA']]);
      }
      var lin = h.getLastRow() + 1;
      var lote = String(r[M.idx['LOTE']]).trim();
      var cod = String(r[M.idx['CODIGO']]).trim();
      var desc = String(r[M.idx['DESCRICAO']]).trim();
      // textos vindos da planilha nunca viram fórmula no histórico
      [2, 4, 5, 6].forEach(function (c) { h.getRange(lin, c).setNumberFormat('@'); });
      h.getRange(lin, 1).setValue(new Date());
      h.getRange(lin, 2).setValue(id);
      h.getRange(lin, 3).setValue(r[M.idx['VENDA']]);
      h.getRange(lin, 4).setValue(lote);
      h.getRange(lin, 5).setValue(cod);
      h.getRange(lin, 6).setValue(desc);
      h.getRange(lin, 7).setValue(anterior);
      h.getRange(lin, 8).setValue(qtd);
      props.setProperty('qtyh_' + rid, '1');
    }
    M.sh.getRange(linha, M.idx['QUANTIDADE'] + 1).setValue(qtd);
    return { ok: true, alterada: true, anterior: anterior, atual: qtd };
  } finally {
    lock.releaseLock();
  }
}
