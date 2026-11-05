# MEMORY — [ PX ] Cargos e Salários

> O que o código não conta: decisões com o porquê, contratos que compilam e quebram na tela, cliques que ainda faltam e o que não fazer de novo. Uma linha por fato, datada. Atualize em vez de duplicar; apague o que ficou errado. Teto: 6000 bytes.

## Decisões
- 2026-10-14 — Drive: busca via `get_dados_drive` com `spreadsheet_id` fixo (`17MdQs2plUl8TM5H_lji8ENNrt2veTzOqgSUJoMMQ0Nw`) lê todas as abas (Colaboradores, Cadastro VIVO, Alterações Salariais) sem filtro; fallback sem ID mantido como segurança; fluxo: DiagDrive.tsx verifica conexão → Dashboard e hooks usam mesmo ID fixo.
- 2026-10-01 — RBAC: Diretor (whitelist + cargo contém DIRETOR/VP/C-LEVEL/SÓCIO) vê tudo; Gerente vê subordinados diretos + mesmo departamento; Colaborador vê só o próprio registro. Whitelist de diretores armazenada na coleção 'config_rbac'.
- 2026-10-02 — Importação XLSX trata arquivo original da Almeida com 35+ campos via parser customizado que mapeia headers para schema de 'colaboradores' (SITUAÇÃO, EMPRESA, MATRICULA, NOME COMPLETO, EMAIL IPNET, etc.); duplicatas evitadas por MATRICULA.
- 2026-10-04 — Fluxo de upload sequencial: arquivo sobe para storage via `storage.upload()`, obtém URL assinada de 2h via `storage.getUrl()`, passa `signed_url` para Edge Function `parse_almeida_xlsx` que baixa, valida magic bytes PK (ZIP/XLSX), lê todas as abas e linhas sem filtro.
- 2026-10-04 — Edge Function parse_almeida_xlsx lê **todas as abas e todas as linhas** sem nenhum filtro (status, nomes de aba ou colunas obrigatórias); valida só magic bytes PK (ZIP/XLSX), trata headers duplicados gerando sufixo `_2`, retorna `sheet_data` com `headers`, `rows`, `total_rows` por aba — validações e mapeamento de campos acontecem na tela de importação.
- 2026-10-04 — Interface `Colaborador` unificada com campos canônicos (nome_completo, email_corporativo, salario_bruto, senioridade, data_admissao, email_coordenador); helpers canônicos `colabNome`, `colabEmail`, `colabSalario`, `colabSenioridade`, `colabAdmissao`, `colabEmailCoord` usados em Dashboard e DetalheColaborador.
- 2026-10-04 — Tela de importação simplificada: upload XLSX → preview colapsável por aba (primeiras 5 linhas, até 8 colunas), mostra total real de linhas. Mapeamento de campos e filtros aplicados conforme pedido do usuário, sem validação rígida de estrutura.
- 2026-10-05 — Dashboard exibe tabela paginada com 5 colunas: MATRÍCULA, NOME, CARGO, SALÁRIO, E-MAIL; clique em linha abre gaveta pela direita com duas sub-abas: Dados Cadastrais (salário em destaque, cards por grupos) e Histórico Salarial (tabela com 6 colunas: Data, Motivo badge, Cargo Anterior, Novo Cargo, Salário Anterior, Salário Novo destaque). Métrica de filtros por Área e Cargo além de busca por nome/email/matrícula.
- 2026-10-05 — Helpers reconhecem **ambos os formatos de campo**: canônico (nome_completo, email_corporativo, salario_bruto, area, cargo) e original do Excel (NOME COMPLETO, EMAIL IPNET, Salário, ÁREA, CARGO) para compatibilidade com dados importados sem transformação.
- 2026-10-05 — App de RH interno sem restrição de acesso por perfil: todos os usuários logados veem todos os colaboradores. Carregamento em loop carrega todas as páginas da coleção sem limite.
- 2026-10-05 — Dashboard exibe dois gráficos acima da tabela: rosquinha de distribuição de cargos (top 8 + Outros, total no anel) à esquerda e linha de evolução de headcount mensal (Head Count vs Estagiários, Maio–Agosto) à direita; ambos respondem a filtros aplicados (busca, área, cargo). Card de Total de Colaboradores acima dos gráficos.
- 2026-10-05 — Gaveta de detalhes de colaborador exibe seção **Dados Funcionais** em grid 2 colunas com Matrícula, Matrícula SAP (campo `MATRÍCULA SAP (80)`), Admissão, Empresa, Área, Centro de Custo, Senioridade e Tipo de Contratação; e-mail Telefônica ocupa linha inteira.
- 2026-10-05 — Tabela Histórico Salarial usa helpers (`hData`, `hMotivo`, `hCargoAnt`, `hCargoNovo`, `hSalAnt`, `hSalNovo`) que reconhecem formatos de campo canônico e original do Excel (acentos, espaços, hífens) — nenhuma célula exibe traço por incompatibilidade.
- 2026-10-06 — Aba Organograma removida do menu lateral; menu exibe apenas Colaboradores, Importar Dados e Configurações.
- 2026-10-20 — Aba Importar Dados removida do menu lateral; menu exibe apenas Colaboradores, Sync Google Sheets e Configurações.

## Contratos que enganam
- 2026-10-04 — Matrículas no CSV vêm como float (ex: `5583885.0`); remover `.0` antes de inserir em colaboradores (stringificar ou truncar como int).
- 2026-10-04 — Edge Function parse_almeida_xlsx detecta arquivo por `signed_url` (não por `file._url`); valida tipo de URL antes de tentar download.
- 2026-10-04 — `tool.run()` envolve resposta em `{ result: ... }` — Edge Function retorna `sheet_data` mas XlsxUploader deve ler `rawResponse.result.sheet_data`, não `rawResponse.sheets`.

## Pendências

## Não fazer
- 2026-10-01 — O erro "seiva.actions.define: input must be a Zod schema" linha 20 vem do scaffold lib/writeQueue.ts que chama actions.define internamente — não tem origem nos arquivos do app; é ruído do scaffold e não bloqueia as telas funcionais (Colaboradores e Configurações renderizam ok).
- 2026-10-02 — Edge Function não pode usar módulo `traceback` (não permitido no sandbox).
- 2026-10-02 — Não passar File direto em tool.run() para Edge Function — causa "Failed to fetch". Usar storage.upload() + storage.getUrl() para obter signed_url e passar para a função.
- 2026-10-05 — Em Dashboard.tsx (DashboardCharts), declarar variáveis de estado (`comDados`) **antes** de useMemo que delas dependem; esbuild minifica e reordena referências, causando "Cannot access 'v' before initialization" — use funções nomeadas no nível do módulo com cores como primitivos separados.

## Threads
