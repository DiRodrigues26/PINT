# Verificacao de Requisitos - Perfil Administrador/Gestor

Data de referencia: 2026-04-30

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

- [~] Backend implementado.
  - `api/src/controllers/badgesController.js`
  - `api/src/routes/badgesRoutes.js`

- [ ] Frontend admin ainda nao implementado.
  - Existe item no menu `Gestao de Badges`.
  - Falta ecran CRUD admin.

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

- [~] Requisitos.
  - Backend: `requisitosController.js`
  - Frontend: falta ecran CRUD admin.
  - Existe item no menu.

### 5. Exportacao de dados para Excel/PDF

- [x] Implementado nos CRUDs ja feitos:
  - Utilizadores
  - Learning Paths
  - Service Lines
  - Areas
  - Niveis

- [~] Falta aplicar aos proximos ecras:
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

- [~] Backend implementado.
  - `badgesController.js` suporta pontos, expiracao e validade.
  - `badgeAtribuidoController.js` suporta badges atribuidos e proximos de expiracao.

- [ ] Frontend admin ainda nao implementado.

### 7. Configuracao de notificacoes

- [~] Backend implementado para preferencias do utilizador.
  - `preferenciasController.js`
  - `notificacoesController.js`

- [ ] Frontend admin de configuracao global ainda nao implementado.
  - Existe item no menu `Notificacoes`.
  - Falta ecran admin.

Notas:

- Existem notificacoes internas na plataforma.
- Preferencias atuais sao por utilizador, nao uma configuracao global admin completa.

### 8. Configuracao de politicas RGPD

- [~] Backend parcial.
  - `rgpdController.js` lista e regista consentimentos.
  - `badgeAtribuidoController.js` verifica consentimento antes de publicar badge.

- [ ] Frontend admin ainda nao implementado.
  - Existe item no menu `Configuracao RGPD`.

Notas:

- Falta ecran para gerir textos/versoes de politicas RGPD.
- A tabela atual regista consentimentos, mas nao parece existir tabela dedicada para configurar politicas globais/versionadas alem de `versao_politica` no consentimento.

### 9. Consultar e gerir todos os pedidos de badges

- [~] Backend implementado.
  - `candidaturasController.js`
  - Admin consegue listar candidaturas e avaliar.
  - Historico e avaliacoes sao auditaveis.

- [~] Frontend parcial.
  - Dashboard admin mostra pedidos recentes.
  - Falta ecran admin completo para consultar, filtrar, abrir detalhe e gerir todos os pedidos.

### 12. Informacoes genericas e avisos ativos/inativos

- [~] Backend implementado.
  - `avisosController.js`
  - Permite listar ativos, listar todos, criar, atualizar e eliminar.

- [~] Frontend parcial.
  - Dashboard admin mostra avisos ativos/inativos.
  - Falta CRUD admin completo para gerir avisos.

## Bonus Gestor

### 1. Notificar por email equipa de Talent ou Service Line caso SLA seja ultrapassado

- [~] Backend parcial.
  - `slaController.js` identifica candidaturas fora de SLA.
  - `email.js` suporta envio real via SMTP ou stub em desenvolvimento.

- [ ] Falta endpoint/acao especifica para notificar equipa quando SLA e ultrapassado.
- [ ] Falta frontend para acionar notificacao por equipa.

### 10. Definir e gerir SLA da equipa Talent e Service Line

- [~] Backend implementado.
  - `slaController.js`
  - `GET /api/sla`
  - `PUT /api/sla/:fase`
  - `GET /api/sla/fora-prazo`

- [~] Frontend parcial.
  - Dashboard mostra controlo SLA.
  - Falta ecran CRUD/configuracao SLA completo.

### 11. Notificacao PUSH de SLA ultrapassados na plataforma

- [~] Backend parcial.
  - Existe sistema de notificacoes internas na tabela `notificacao`.
  - Existe endpoint para listar/marcar notificacoes.
  - Existe endpoint para detectar candidaturas fora de SLA.

- [ ] Falta automatismo/job para criar notificacoes quando SLA e ultrapassado.
- [ ] Falta push real/browser push.
- [ ] Falta frontend de notificacoes SLA no admin.

## Resumo Executivo

Cumprido no frontend admin:

- Dashboard admin.
- Gestao de utilizadores/perfis.
- Gestao de Learning Paths.
- Gestao de Service Lines.
- Gestao de Areas.
- Gestao de Niveis.
- Exportacao nos CRUDs ja criados.

Backend ja preparado, mas falta frontend admin:

- Badges.
- Requisitos.
- SLA completo.
- Avisos completo.
- RGPD configuravel.
- Notificacoes configuraveis.
- Gestao completa de pedidos/candidaturas.

Prioridade recomendada para continuar:

1. Gestao de Requisitos.
2. Gestao de Badges.
3. Gestao completa de Pedidos/Candidaturas.
4. Gestao de SLA.
5. Avisos.
6. Notificacoes.
7. RGPD.
