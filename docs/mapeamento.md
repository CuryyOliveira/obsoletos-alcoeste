# Mapeamento planilha → aplicativo (confirmado por prints da planilha "Catalogo_Lotes")

O script lê pelo **nome do cabeçalho** (linha 1), não pela letra da coluna.

## Aba Materiais
| Cabeçalho | Entidade | Regra |
|---|---|---|
| ID_MATERIAL | Material.id | chave única (ex.: `03-147`). **Não** usar CODIGO: há códigos repetidos |
| VENDA | Material.lote | número do lote |
| LOTE | — | nome do lote (informativo; o nome oficial vem da aba Lotes) |
| CODIGO | Material.codigo | só admin; nunca público |
| DESCRICAO | Material.descricao | público |
| QUANTIDADE | Material.quantidade | público |
| CUSTO MEDIO, VALOR TOTAL | — | **nunca lidos nem expostos** |
| URL_IMAGEM | Material.urlImagem | **única célula que o app grava** (link do Drive) |
| STATUS_FOTO | — | fórmula da planilha; o app não escreve |

## Aba Lotes
| Cabeçalho | Uso |
|---|---|
| VENDA | Lote.numero (na URL: `/lote/3`) |
| LOTE | Lote.nome |
| ABA_CATALOGO, URL_CATALOGO, QR_CODE, QR_ABRIR | preservadas, não lidas, não alteradas |

Abas "Lote 1/2/3": visões geradas por fórmula; o app não as usa.

## Regras
- Lote público = existe na aba Lotes. Foto pública = URL_IMAGEM preenchida.
- Público vê: nome do lote, nº de itens, total de peças, descrição, quantidade, foto.
- Fotos novas: arquivo novo na pasta "FOTOS DO CATÁLOGO" (`<ID_MATERIAL>_<data-hora>.jpg`); arquivos antigos nunca são apagados.
