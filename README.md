# Vivo OS (Mogno AI) + Antigravity IDE

Repositório base para desenvolvimento, governança e sincronização de aplicações da plataforma **Vivo OS** (Mogno AI) utilizando o **Google Antigravity IDE**.

Este projeto permite que múltiplos membros do time colaborem no mesmo repositório utilizando **suas próprias chaves de API**, sem risco de vazamento de credenciais.

---

## 🚀 Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 18, 20 ou superior)
- [Antigravity IDE](https://antigravity.google/) (ou compatível com Model Context Protocol - MCP)
- Acesso ao workspace da Vivo OS e uma chave de API pessoal gerada em:  
  👉 **https://cloud.mogno.ai/api-keys**

---

## 📦 Como Iniciar (Quickstart para o Time)

### 1. Clonar o repositório
```bash
git clone https://github.com/NicollasAvila/vivo-os-antigravity.git
cd vivo-os-antigravity
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Executar o assistente de configuração
Execute o comando abaixo e insira sua chave de API pessoal quando solicitado (ou passe como argumento):
```bash
npm run setup
```
> O assistente irá validar sua chave na plataforma, criar o seu `.env` local, salvar a credencial em `~/.seiva/config.json` para o CLI e registrar o servidor MCP no seu Antigravity IDE.

### 4. Validar a conexão
```bash
npm run status
```
Você verá o resumo do seu usuário, workspace e total de apps aos quais tem acesso.

---

## 🛠️ Comandos Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run setup` | Assistente interativo de configuração de chave de API e MCP |
| `npm run status` | Verifica a conectividade com o workspace e exibe dados do usuário |
| `npm run seiva -- <cmd>` | Executa comandos do CLI da plataforma (`clone`, `pull`, `push`, `build`) |
| `npm run cargos:status` | Verifica alterações locais vs remoto no app *Cargos e Salários* |
| `npm run cargos:pull` | Puxa a versão mais recente do app *Cargos e Salários* da plataforma |
| `npm run cargos:push` | Envia alterações locais do app *Cargos e Salários* para a plataforma |
| `npm run cargos:build` | Compila o app no sandbox remoto e retorna a URL de preview |

---

## 📱 Trabalhando com Apps

### App Atual: Cargos e Salários
O app já está clonado no diretório `apps/cargos-e-salarios/`.
- [MEMORY.md](apps/cargos-e-salarios/MEMORY.md): Contratos, decisões de arquitetura e regras de negócio do app.
- [App.tsx](apps/cargos-e-salarios/App.tsx): Ponto de entrada e rotas.

Para obter intellisense completo no app:
```bash
cd apps/cargos-e-salarios
npm install
```

### Clonando outros apps do Workspace
Para baixar qualquer outro app do workspace para trabalhar localmente:
```bash
npm run seiva -- clone <APP_ID> --dir apps/<nome-da-pasta>
```
*(Você pode consultar a lista completa de IDs de apps usando o assistente ou via `npm run status`).*

---

## 🤖 Integração com o Antigravity IDE

O projeto já inclui o arquivo [.mcp.json](.mcp.json) e o script de setup registra o servidor MCP `vivo-os` globalmente no seu Antigravity (`~/.gemini/config/mcp_config.json`).

Com isso, o assistente do Antigravity possui acesso nativo às ferramentas da plataforma (`seiva_*`), permitindo:
- Inspecionar contexto do app (`seiva_get_project_context`)
- Travar edição concorrente (`seiva_app_lock`)
- Ler e aplicar diffs em arquivos (`seiva_read_file`, `seiva_edit_file_diff`)
- Disparar compilação remota e smoke tests (`seiva_build_app`, `seiva_test_app`)
- Gerenciar deploys e versões (`seiva_publish_app`, `seiva_rollback_app`)

Consulte o documento [CONTEXT.md](CONTEXT.md) para detalhes aprofundados sobre a arquitetura da plataforma, guardrails e a lista fechada de bibliotecas permitidas.

---

## 🔒 Segurança

- O arquivo `.env` está no `.gitignore` e **NUNCA** deve ser commitado.
- Chaves de API são individuais e vinculadas ao seu usuário na plataforma.
- Credenciais e segredos de produção nunca devem ser escritos no código-fonte; utilize o cofre da plataforma (`seiva.credential()`).
