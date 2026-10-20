# Ligar a planilha e o Drive (Apps Script)

Tudo no navegador. Nenhuma chave vai para o GitHub nem para o chat.

## 1. Criar a chave de acesso (PowerShell)
```
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 40 | ForEach-Object {[char]$_})
```
Copie o resultado (40 caracteres). Ele é a **chave**. Guarde num lugar seguro.

## 2. Colar o script na planilha
1. Abra a planilha Catalogo_Lotes → **Extensões → Apps Script**.
2. Apague o código que vier e cole todo o conteúdo de `apps-script/Code.gs`. Salve (Ctrl+S).
3. **Configurações do projeto** (engrenagem) → **Propriedades do script** → *Adicionar propriedade*:
   nome `APPS_SCRIPT_KEY`, valor = a chave do passo 1. Salve.

## 3. Publicar
1. **Implantar → Nova implantação → tipo: App da Web**.
2. *Executar como*: **Eu**. *Quem pode acessar*: **Qualquer pessoa**.
3. **Implantar** e autorize (aviso "app não verificado": *Avançado → Acessar…*).
4. Copie a **URL do app da Web** (termina em `/exec`).
5. Teste: abra a URL no navegador; deve aparecer `{"ok":true,"servico":"fotos-obsoletos"}`.

"Qualquer pessoa" só deixa a URL alcançável; sem a chave, nada é lido nem gravado.

## 4. Configurar na Vercel
Variáveis de ambiente do projeto:
- `DATA_SOURCE` = `appsscript`
- `APPS_SCRIPT_URL` = URL do passo 3
- `APPS_SCRIPT_KEY` = a mesma chave

Depois **Redeploy**.

## Atualizar o script no futuro
Se o `Code.gs` mudar: cole de novo e use **Implantar → Gerenciar implantações → editar → Nova versão**. A URL continua a mesma.
