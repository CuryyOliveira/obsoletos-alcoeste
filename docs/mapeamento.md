# Mapeamento planilha → aplicativo (PRELIMINAR)

Fonte: informado pelo proprietário. **Ainda não verificado contra a planilha real.**

## Aba MATERIAIS
| Col | Cabeçalho | Entidade | Regra |
|---|---|---|---|
| A | ID_MATERIAL | Material.id | chave estável, leitura |
| D | CODIGO | Material.codigo | só admin; nunca público |
| E | DESCRICAO | Material.descricao | público |
| F | QUANTIDADE | Material.quantidade | público |
| I | URL_IMAGEM | Material.urlImagem | único campo que o app grava |
| J | STATUS_FOTO | — | fórmula `=SE(I..="";"PENDENTE";"OK")`; o app não escreve |

**Pendente:** colunas B, C, G, H e como cada material se liga a um lote.

## Aba LOTES
| Col | Cabeçalho | Uso |
|---|---|---|
| B | NOME DO LOTE | Lote.nome |
| C | NUMERO DO LOTE | Lote.numero (id na URL `/lote/N`) |
| D, E, F | LINK/QR_CODE/QR_ABRIR | preservadas, não alteradas |

## Abas Lote 1/2/3
Visões geradas por fórmula (Nº do lote em B1; DESCRICAO, QUANTIDADE, FOTO "Ver foto").
O app **não** as lê nem escreve; usa MATERIAIS + LOTES.

## Regras
- Lote público = existe na aba LOTES. Foto pública = URL_IMAGEM preenchida.
- Público vê: nome do lote, nº de itens, total de peças, descrição, quantidade, foto.
- Sem login de conta; área de fotos protegida por PIN (cookie HttpOnly assinado).
- Gravação no Drive/Planilha via Apps Script da conta do proprietário (Fase 3).
