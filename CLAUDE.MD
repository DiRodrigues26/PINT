# PINT — Plataforma de Badges Softinsa

## Contexto
Plataforma de badges digitais para a Softinsa, inspirada em sistemas como o Credly.
Projeto academico PINT.

## Estrutura do repositório
- `/api` — Backend Node.js + Express + MySQL.
- `/web` — Frontend React + Vite + Tailwind CSS.

## Stack
- Backend: Node.js, Express, MySQL2, JWT, Bcryptjs, Multer, Nodemailer.
- Frontend: React 18, Vite, Tailwind CSS, Axios, React Query, React Router.
- Base de dados: MySQL hospedado no Railway.
- API local: `http://localhost:3000`.
- Frontend local: `http://localhost:5173`.

## Como iniciar em desenvolvimento
Terminal 1:
```bash
cd api
npm install
npm run dev
```

Terminal 2:
```bash
cd web
npm install
npm run dev
```

## Base de dados
- BD: `softinsa_badges`.
- Ligacao configurada via `api/.env`.
- Schema local para consulta: `api/database/schema.sql`.
- Rotina obrigatoria: antes de criar/alterar queries SQL, endpoints que leem/escrevem na BD, CRUDs, dashboards, graficos ou designs que dependam de dados reais, consultar primeiro `api/database/schema.sql` para confirmar nomes de tabelas, colunas, chaves estrangeiras, tipos e relacoes.
- Se houver duvida entre o codigo e o schema, validar o schema local primeiro e so depois recorrer a ligacao Railway quando for mesmo necessario testar dados reais.
- A BD real no Railway tem colunas usadas pelo codigo atual, incluindo `url_slug`, `ultimo_login`, `totp_secret` e `totp_ativo`.
- Evitar commitar ficheiros `.env` com credenciais reais.

## Hierarquia de badges
- Documento guia: `docs/hierarquia-badges-softinsa.md`.
- Rotina obrigatoria: antes de implementar CRUDs, dashboards, filtros, dropdowns ou validacoes de Learning Paths, Service Lines, Areas, Niveis, Requisitos, Badges, Candidaturas ou Evidencias, consultar `docs/hierarquia-badges-softinsa.md` e depois confirmar colunas/relacoes em `api/database/schema.sql`.
- Regra funcional: `Learning Path -> Service Line -> Area -> Nivel -> Badge -> Requisitos`.
- O admin nao pode criar entidades filhas sem a entidade-pai existir: Service Line precisa de Learning Path; Area precisa de Service Line; Nivel precisa de Area; Badge so pode ser criado dentro de Nivel; Requisito so pode ser criado dentro de Badge.

## Perfis de utilizador
- `Consultor` — submete candidaturas a badges e carrega evidencias.
- `Talent Manager` — valida evidencias e encaminha para Service Line.
- `Service Line` — faz a validacao final.
- `Administrador` — gere a plataforma, utilizadores, badges, hierarquia, SLA, avisos e configuracoes.

## Autenticacao e conta admin
Autenticacao JWT implementada.

Fluxos existentes:
- Registo publico.
- Confirmacao de email.
- Completar perfil.
- Login.
- Recuperacao e redefinicao de password.
- Alteracao obrigatoria de password no primeiro login.
- Rota `/api/auth/eu`.

O registo publico nao permite criar `Administrador`. Para criar/bootstrap do primeiro admin existe:
```bash
cd api
npm run admin:create -- "Nome" "email@dominio.pt" "PasswordTemporaria123"
```

Tambem e possivel executar diretamente com reset explicito:
```bash
node scripts/criar-admin.js --reset-password "Nome" "email@dominio.pt" "PasswordTemporaria123"
```

## Workflow de candidatura
Estados principais:
```txt
OPEN -> SUBMITTED -> IN_SERVICE_LINE_REVIEW -> APPROVED/REJECTED
```

Tambem existem estados auxiliares:
```txt
IN_TALENT_REVIEW
SENT_BACK
CLOSED
```

Todas as transicoes relevantes registam historico/auditoria em `historico_candidatura` e/ou `avaliacao_candidatura`.

## Funcionalidades implementadas
Backend:
- Auth JWT e middleware de permissao por perfil.
- Utilizadores e perfis.
- Learning Paths, Service Lines, Areas, Niveis e Requisitos.
- Badges.
- Candidaturas.
- Upload/remocao de evidencias.
- Avaliacao por Talent Manager.
- Avaliacao final por Service Line.
- Emissao de badges atribuidos.
- Publicacao/despublicacao de badges.
- Notificacoes.
- Conquistas.
- SLA.
- Avisos/informacoes.
- Estatisticas para dashboards.
- Endpoints publicos para perfis e verificacao de badges.

Frontend:
- Login, registo, confirmacao de email e completar perfil.
- Recuperacao/redefinicao de password.
- Rotas protegidas.
- Dashboard geral.
- Catalogo e detalhe de badges.
- Candidaturas e detalhe com evidencias/avaliacoes.
- Meus badges.
- Conquistas.
- Notificacoes.
- Gestao de candidaturas pendentes.
- Dashboard de administrador em `/admin`.

## Dashboard de administrador
O admin tem uma experiencia propria em `/admin`, separada do layout normal da app.

Inclui:
- Sidebar de backoffice.
- Topbar com saudacao, idioma, notificacoes e perfil.
- KPIs gerais.
- Graficos de badges por Learning Path, nivel e evolucao mensal.
- Controlo SLA.
- Gamificacao global.
- Pedidos recentes.
- Avisos ativos/inativos.
- Bloco de auditoria.

Endpoints usados pelo dashboard:
- `GET /api/estatisticas/gestor`
- `GET /api/estatisticas/ranking`
- `GET /api/candidaturas`
- `GET /api/sla`
- `GET /api/sla/fora-prazo`
- `GET /api/avisos/todos`

Administradores sao redirecionados automaticamente para `/admin` apos login e tambem quando acedem a `/`.

## Convenções
- Codigo e mensagens em portugues.
- Respostas da API sempre em JSON.
- Erros no formato `{ "erro": "mensagem" }`.
- Sucesso no formato `{ "mensagem": "texto", ...dados }`.
- Preferir reutilizar os controladores/rotas existentes antes de criar novos endpoints.
- Manter frontend ligado a dados reais da API, evitando mock data permanente.

## Notas tecnicas recentes
- Corrigido desalinhamento entre frontend e backend:
  - Cancelar candidatura usa `DELETE /api/candidaturas/:id`.
  - Notificacoes usam `POST /api/notificacoes/:id/ler` e `POST /api/notificacoes/ler-todas`.
- Corrigida query de estatisticas para compatibilidade com `ONLY_FULL_GROUP_BY` no MySQL.
- A area `/admin` bypassa o layout normal para usar uma shell propria de backoffice.
