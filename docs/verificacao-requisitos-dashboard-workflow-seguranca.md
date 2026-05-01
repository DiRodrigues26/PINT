# Verificacao de Requisitos - Dashboard, Workflow, Relatorios e Seguranca

Data de referencia: 2026-04-30

## Dashboard e Perfil Pessoal

- [x] Dashboard administrativo implementado em `/admin`.
  - Frontend: `web/src/pages/admin/Admin.jsx`
  - Shell: `web/src/components/AppShell.jsx`

- [x] Design responsivo para desktop.
  - Sidebar fixa em desktop.
  - Conteudo com grids responsivas e tabelas com scroll horizontal quando necessario.

- [x] Design responsivo para mobile.
  - Topbar adapta conteudo.
  - Navegacao mobile via barra inferior horizontal.
  - Conteudo principal ganha padding inferior para nao ficar escondido pela navegacao mobile.

- [~] Perfil pessoal.
  - O admin mostra nome, email, perfil e logout na sidebar.
  - A pagina completa de perfil ainda nao esta implementada; o menu `Perfil` existe mas ainda nao tem CRUD/ecran proprio.

## Workflow de Aprovacao

- [x] Decisoes de aprovacao sao registadas.
  - Backend: `api/src/controllers/candidaturasController.js`
  - Talent Manager: `avaliarTalent`
  - Service Line: `avaliarServiceLine`

- [x] Historico auditavel de feedbacks.
  - Tabela `avaliacao_candidatura`: guarda avaliador, tipo de avaliador, decisao, comentario e data.
  - Tabela `historico_candidatura`: guarda estado origem, estado destino, acao, comentario, responsavel e data.
  - Endpoint: `GET /api/candidaturas/:id/historico`
  - Endpoint detalhe inclui `avaliacoes` e `historico`.

- [x] Fluxo de estados suportado.
  - `OPEN`
  - `SUBMITTED`
  - `IN_TALENT_REVIEW`
  - `IN_SERVICE_LINE_REVIEW`
  - `APPROVED`
  - `REJECTED`
  - `SENT_BACK`
  - `CLOSED`

## Relatorios e Estatisticas

- [x] KPIs exibidos no dashboard de gestores/admin.
  - Total de utilizadores.
  - Total de badges atribuidos.
  - Percentagem de badges atribuidos.
  - Candidaturas por estado.
  - Evolucao mensal.
  - Badges por Learning Path.
  - Badges por nivel.
  - Ranking/gamificacao.
  - SLA.

- [x] Endpoints de estatisticas implementados.
  - `GET /api/estatisticas/gestor`
  - `GET /api/estatisticas/ranking`
  - `GET /api/estatisticas/consultor`

## Seguranca e RGPD

- [x] Autenticacao JWT.
  - Middleware: `api/src/middleware/autenticar.js`

- [x] Autorizacao por perfil.
  - Middleware: `api/src/middleware/autorizar.js`

- [x] RGPD com registo de consentimentos.
  - Backend: `api/src/controllers/rgpdController.js`
  - Rotas: `api/src/routes/rgpdRoutes.js`
  - Tabela: `consentimento_rgpd`

- [x] Publicacao de badges verifica consentimento RGPD.
  - Backend: `api/src/controllers/badgeAtribuidoController.js`

- [x] Salvaguarda HTTPS em producao no backend.
  - `api/src/index.js` força redirect 308 para HTTPS quando `NODE_ENV=production` e o proxy indica `x-forwarded-proto` diferente de `https`.
  - Pode ser desativado explicitamente com `DISABLE_HTTPS_REDIRECT=true`.

- [!] HTTPS depende tambem da configuracao de deploy.
  - Em desenvolvimento local e normal usar `http://localhost`.
  - Em producao, `FRONTEND_URL`, `APP_URL` e `VITE_API_URL` devem usar URLs `https://`.
  - Railway/hosting deve expor frontend e API via HTTPS.
