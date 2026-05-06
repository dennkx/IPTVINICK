# iNick IPTV para Samsung Tizen TV

Aplicativo Web Tizen para abrir listas IPTV M3U/M3U8, com visual de TV, grupos, busca, favoritos, recentes e player em tela cheia.

## Recursos

- Importa lista por URL M3U.
- Importa arquivo `.m3u`/`.m3u8` no teste pelo navegador.
- Gera URL M3U a partir de dados Xtream: servidor, usuario e senha.
- Tela Edits com presets M3U, Xtream, EPG e SSIPTV.
- Campo Web Player para alternar entre modo automatico, HLS `.m3u8` e TS original no navegador.
- Usa `webapis.avplay` na TV Samsung Tizen.
- Usa `<video>` como fallback para teste em navegador.
- Navega por controle remoto: setas, OK, Voltar, Play/Pause, Canal +/-, teclas coloridas.
- Salva lista, favoritos e recentes no `localStorage`.

## Teste local

Com Python instalado:

```powershell
.\start-local-server.ps1 -Port 4173
```

Abra:

```text
http://localhost:4173
```

Para parar o servidor:

```powershell
.\stop-local-server.ps1 -Port 4173
```

Tambem da para iniciar com duplo clique em `run-local-server.cmd`.

Algumas listas remotas podem falhar no navegador por CORS. Na TV Tizen, o app empacotado usa permissao de internet e `access origin="*"`.

## Git e GitHub

Precisa do [Git for Windows](https://git-scm.com/download/win) (inclui o **Git Credential Manager**, login pelo browser).

Crie no GitHub um repositorio **vazio** (sem README gerado).

### Pelo Command Prompt (cmd)

1. Win+R, escreva `cmd`, Enter.
2. Entre na pasta do projeto (o caminho com espacos precisa de aspas):

```bat
cd /d "c:\Users\ThinkPad\Documents\IPTV iNick"
```

3. Se o comando `git` nao for reconhecido, use o caminho completo ou adicione ao PATH desta sessao:

```bat
set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
git --version
```

4. **Opcao A — script:** edite em `push-github.cmd` a variavel `ORIGIN_URL` com o URL HTTPS do repo, guarde, e faça duplo clique no ficheiro ou execute `push-github.cmd` a partir desta pasta. Na primeira `git push`, o **navegador** abre para autorizar a conta GitHub.

5. **Opcao B — comandos manuais** (se o repo ja tem `git init` e commit):

```bat
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

Se o `remote origin` ja existir, use `git remote set-url origin https://github.com/...` em vez de `add`.

**Login no CMD:** com HTTPS, o Git Credential Manager pede login no browser. Se aparecer pedido no proprio CMD (utilizador/senha), o GitHub **nao** aceita a senha da conta: crie um **Personal Access Token** em https://github.com/settings/tokens (permisso `repo`), use o nome de utilizador GitHub e cole o token como "senha".

Para SSH em vez de HTTPS: `git@github.com:USUARIO/REPO.git` e chaves SSH configuradas no GitHub.

### PowerShell (alternativa)

```powershell
cd "c:\Users\ThinkPad\Documents\IPTV iNick"
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

O `.gitignore` ignora pasta `.vercel/`, ficheiros `.env*` e lixo comum do sistema.

## Deploy na Vercel

Site estatico: sem build, raiz com `index.html`.

1. Envie o projeto para um repositorio Git ou use a [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel` e, na pasta do projeto, `vercel`.
2. No painel Vercel: **Add Project** → importe o repo.
3. **Framework Preset:** Other. **Build Command:** vazio. **Output Directory:** `.`

O `index.html` evita carregar `$WEBAPIS/webapis/webapis.js` em dominios de hospedagem estatica conhecidos (ex.: `*.vercel.app`), para nao pedir URL invalida no navegador. No pacote `.wgt` na TV o script continua a ser injetado.

Com **dominio proprio** na Vercel pode aparecer um 404 no console para `$WEBAPIS/...`; e esperado no browser (fallback `<video>`). Para suprimir, acrescente o hostname em `skipWebapis` em `index.html`.

## Instalar na TV Samsung

1. Abra o projeto no Tizen Studio como Web Application.
2. Crie ou selecione um certificado Samsung/Tizen.
3. Ative o Developer Mode na TV e conecte pelo Device Manager.
4. Build do pacote `.wgt`.
5. Instale e rode o app pela TV.

## Estrutura

```text
.gitignore
push-github.cmd
config.xml
index.html
vercel.json
css/app.css
js/app.js
icon.svg
```

## Observacoes

- Use apenas listas IPTV que voce tem autorizacao para acessar.
- Streams HLS devem tocar melhor na TV pelo AVPlay. No navegador do PC, HLS depende do suporte nativo do navegador.
- Para publicacao em loja, substitua `id`, `author`, `license` e icone conforme sua conta.

## Referencias oficiais

- Samsung Developers: TV Web Application
  https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-application.html
- Samsung Developers: AVPlay API
  https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html
- Samsung Developers: TVInputDevice API
  https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/tvinputdevice-api.html
