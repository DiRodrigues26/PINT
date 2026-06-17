# Verificacao de Requisitos - Perfil Administrador/Gestor

Data de referencia: 2026-06-17

Legenda:

- `[x]` Cumprido no backend e no frontend admin.
- `[~]` Parcial: existe backend ou existe entrada no menu/dashboard, mas falta ecran completo ou alguma acao.
- `[ ]` Ainda nao implementado de forma utilizavel.

## Requisitos Administrador/Gestor

### 1. Gestao de utilizadores e permissoes

- [x] Backend implementado.
  - `api/src/controllers/utilizadoresController.js`
  - `api/src/routes/utilizadoresRoutes.js`
  - Permissoes por perfil via `api/src/middleware/autorizar.js`

- [x] Frontend admin implementado.
  - `web/src/pages/admin/AdminUtilizadores.jsx`

Notas:

- Permite listar, filtrar, criar, editar, ativar/desativar e repor password.
- Exporta dados filtrados.

### 2. Criar utilizadores e definir perfil

- [x] Backend implementado.
- [x] Frontend admin implementado.

Perfis suportados:

- `Consultor`
- `Administrador`
- `Talent Manager`
- `Service Line`

Notas:

- O formulario permite escolher perfil.
- Para `Service Line`, permite associar service line.
- Para `Consultor`, permite associar service line/area.

### 3. Acrescentar e eliminar badges

- [x] Backend implementado.
  - `api/src/controllers/badgesController.js`
  - `api/src/routes/badgesRoutes.js`

- [x] Frontend admin implementado.
  - `web/src/pages/admin/AdminBadges.jsx`
  - Implementado: listagem, filtros, exportacao, detalhe, criar, editar, ativar/desativar, eliminar e upload real de imagem.

Campos backend ja suportados:

- titulo
- descricao
- imagem_url
- pontos
- tem_expiracao
- validade_dias
- intervalo_temporal_obtencao
- conquista especial
- beneficios
- competencias certificadas
- sobre certificacao
- ativo

### 4. Acrescentar e eliminar Learning Paths / Service Lines / Areas / Niveis / Requisitos

- [x] Learning Paths.
  - Backend: `learningPathsController.js`
  - Frontend: `AdminLearningPaths.jsx`

- [x] Service Lines.
  - Backend: `serviceLinesController.js`
  - Frontend: `AdminServiceLines.jsx`

- [x] Areas.
  - Backend: `areasController.js`
  - Frontend: `AdminAreas.jsx`

- [x] Niveis.
  - Backend: `niveisController.js`
  - Frontend: `AdminNiveis.jsx`
  - Implementado: listagem, filtros, detalhe, criar, editar, ativar/desativar, eliminar e exportacao.
  - Nota: os botoes de criar/editar badge dentro do modal ficam preparados para o CRUD de Badges.

- [~] Eventos Especiais.
  - Backend: `eventosController.js`
  - Frontend: `AdminEventosEspeciais.jsx`
  - Implementado: listagem, filtros, exportacao, criar, editar, ativar/desativar, eliminar e upload real de imagem.
  - Em aberto: criação/edição completa de requisitos especiais diretamente no modal do evento.

- [x] Requisitos.
  - Backend: `requisitosController.js`
  - Frontend: `AdminRequisitos.jsx`
  - Implementado: listagem, filtros, detalhe, criar, editar, ativar/desativar, eliminar e exportacao.
  - Nota: `badge_requisito` e a fonte funcional para associar requisitos a badges. `requisito.id_nivel` fica apenas como compatibilidade tecnica.

### 5. Exportacao de dados para Excel/PDF

- [x] Implementado nos CRUDs e hub de relatorios:
  - Utilizadores
  - Learning Paths
  - Service Lines
  - Areas
  - Niveis
  - Eventos Especiais
  - Requisitos
  - Badges
  - SLA
  - Avisos
  - Candidaturas/Pedidos

Notas:

- A exportacao atual respeita os filtros aplicados.
- Excel esta implementado como CSV.
- PDF usa impressao de tabela em janela.

### 6. Gestao dos Badges: expiracao, pontos, etc.

- [x] Backend implementado.
  - `badgesController.js` suporta pontos, expiracao e validade.
  - `badgeAtribuidoController.js` suporta badges atribuidos e proximos de expiracao.

- [x] Frontend admin implementado.
  - `AdminBadges.jsx` suporta pontos, expiração, estado, requisitos associados e mudança de nível.
  - `AdminPontos.jsx` permite gerir pontuação de badges.

### 7. Configuracao de notificacoes

- [x] Backend implementado para preferencias do utilizador e configuração global.
  - `preferenciasController.js`
  - `notificacoesController.js`
  - `configNotificacaoController.js`

- [x] Frontend admin de configuracao global implementado.
  - `web/src/pages/admin/AdminNotificacoesDefinicoes.jsx`

Notas:

- Existem notificacoes internas na plataforma.
- Existem preferencias por utilizador e uma configuracao global admin com toggles de eventos/canais.

### 8. Configuracao de politicas RGPD

- [x] Backend implementado.
  - `rgpdController.js` lista e regista consentimentos.
  - `badgeAtribuidoController.js` verifica consentimento antes de publicar badge.
  - `politica_rgpd` guarda politicas versionadas por tipo.
  - `GET /api/rgpd/politica-ativa`
  - `GET/POST/PUT/DELETE /api/rgpd/politicas`

- [x] Frontend admin implementado.
  - `web/src/pages/admin/AdminRGPD.jsx`

Notas:

- Permite criar, editar, publicar/despublicar, eliminar versoes inativas, filtrar e exportar politicas.
- Publicar uma politica desativa automaticamente a politica ativa do mesmo tipo.
- O modal RGPD do consultor lê a politica ativa quando existe.
- Migration incremental: `api/database/migrations/2026-06-17-politicas-rgpd.sql`.

### 9. Consultar e gerir todos os pedidos de badges

- [x] Backend implementado.
  - `candidaturasController.js`
  - Admin consegue listar candidaturas e avaliar.
  - Historico e avaliacoes sao auditaveis.

- [x] Frontend implementado.
  - `AdminCandidaturas.jsx` permite consultar, filtrar, abrir detalhe, avaliar e ver auditoria.

### 12. Informacoes genericas e avisos ativos/inativos

- [x] Backend implementado.
  - `avisosController.js`
  - Permite listar ativos, listar todos, criar, atualizar e eliminar.

- [x] Frontend implementado.
  - `AdminAvisos.jsx` implementa CRUD, vigência, estado e exportação.

## Bonus Gestor

### 1. Notificar por email equipa de Talent ou Service Line caso SLA seja ultrapassado

- [x] Backend implementado.
  - `slaController.js` identifica candidaturas fora de SLA.
  - `email.js` suporta envio real via SMTP ou stub em desenvolvimento.
  - `POST /api/sla/:id/notificar` notifica responsaveis conforme configuração.

- [x] Frontend implementado.
  - `AdminSLA.jsx` permite acionar notificacao por candidatura fora de SLA.

### 10. Definir e gerir SLA da equipa Talent e Service Line

- [x] Backend implementado.
  - `slaController.js`
  - `GET /api/sla`
  - `PUT /api/sla/:fase`
  - `GET /api/sla/fora-prazo`

- [x] Frontend implementado.
  - `AdminSLA.jsx`

### 11. Notificacao PUSH de SLA ultrapassados na plataforma

- [~] Backend parcial.
  - Existe sistema de notificacoes internas na tabela `notificacao`.
  - Existe endpoint para listar/marcar notificacoes.
  - Existe endpoint para detectar candidaturas fora de SLA.

- [x] Existe job/automatismo para criar notificacoes internas quando SLA e ultrapassado.
- [ ] Falta push real/browser push.
- [x] Frontend admin mostra notificacoes e fora de prazo.

## Resumo Executivo (rev. 2026-06-17)

Estado de cada requisito do Administrador/Gestor (PDF pag. 11):

| # | Requisito | Estado |
|---|---|---|
| 1 | Gestao de utilizadores e permissoes | [x] AdminUtilizadores (listar/filtrar/criar/editar/ativar/repor password/exportar) |
| 2 | Criar utilizadores e definir perfil | [x] Form com perfil (Consultor/Admin/Talent Manager/Service Line) |
| 3 | Acrescentar e eliminar badges | [x] AdminBadges (CRUD + upload real de imagem) |
| 4 | CRUD Learning Paths/Service Lines/Areas/Niveis/Requisitos | [x] Ecras dedicados completos |
| 5 | Exportacao Excel/PDF | [x] Por CRUD + hub AdminRelatorios (11 entidades) |
| 6 | Gestao de Badges (expiracao, pontos) | [x] AdminBadges + AdminPontos |
| 7 | Configuracao de notificacoes | [x] AdminNotificacoesDefinicoes (toggles+canais) ligada ao envio real |
| 8 | Configuracao de politicas RGPD | [x] AdminRGPD + tabela `politica_rgpd` + endpoints de politicas versionadas |
| 9 | Consultar e gerir todos os pedidos (curso, atribuidos) | [x] AdminCandidaturas (filtros incl. APPROVED, detalhe, avaliacao, auditoria) |
| 12 | Informacoes Genericas e Avisos Ativos/Inativos | [x] AdminAvisos (CRUD + vigencia + export) |

Bonus Gestor:

| # | Requisito | Estado |
|---|---|---|
| 1 | Notificar por email equipa Talent/Service Line quando SLA ultrapassado | [x] AdminSLA botao "Notificar" -> POST /api/sla/:id/notificar (sujeito a config) |
| 10 | Definir e gerir SLA | [x] AdminSLA |
| 11 | Notificacao PUSH de SLA ultrapassados | [~] Cria notificacao interna na plataforma; falta push real de browser |

Conclusao: todos os requisitos principais do admin estao funcionais. O bonus #11 continua parcial apenas no sentido de nao existir push real de browser; a plataforma cria notificacoes internas e emails conforme configuracao.
