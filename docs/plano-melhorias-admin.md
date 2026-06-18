# Plano de Melhorias do Admin — feedback de colegas e professores

Data: 2026-06-16
Fonte: tabela de feedback (19 pontos), organizada por prioridade.

## Estado atualizado — 2026-06-18

### Feito em código
- **P3** — Dashboard com estados de candidaturas em PT.
- **P4** — Dashboard com títulos/subtítulos mais explícitos nos KPIs e gráficos.
- **P5** — Sino de notificações deixou de ter ponto fixo, passou a usar contagem real de não lidas e atualiza após ações de leitura/remoção.
- **P6** — "Ver Processo" abre o detalhe da candidatura específica.
- **P7** — Overlays dos modais admin normalizados para cobrir a shell com `z-50`.
- **P8** — Filtro de estado em Pedidos de Badges uniformizado em PT.
- **P14** — Botão/modal de utilizador usa "Desativar" em vez de "Eliminar".
- **P16** — Opção inválida de badge especial removida do fluxo normal de criação de badges.
- **P17** — Secção de badge removida do formulário de Nível.
- **P18** — Campo Descrição adicionado ao formulário de Badge e enviado no payload.
- **P19** — Select de Nível limitado à Área escolhida; escolher nível já não altera Área/Service Line.

### Validado end-to-end / API
- **P10** — Validado com candidatura fechada real `#31` (`APPROVED`) com 3 evidências no detalhe.
- **P11** — Validado que o Administrador passa autorização nos endpoints Talent e Service Line; teste não destrutivo devolveu `404` para candidatura inexistente em vez de `401/403`.
- **P15** — Reset de password validado com utilizador temporário; token de recuperação gravado e email gerado em stub.
- **P20** — Criação de utilizador validada com utilizador temporário; token de confirmação gravado e email gerado em stub.

### Em aberto
- **P2** — Flags de idioma do admin.
- **P9** — Filtros de Pedidos de Badges só com valores que devolvem candidaturas.
- **P12** — Paginação partilhada/consistente nas tabelas admin.
- **P13** — Filtros de Utilizadores só com valores que devolvem utilizadores.

Legenda de prioridade:
- 🔴 **Importante** — bugs/funcionalidade em falta.
- 🧪 **É preciso testar** — funcionalidade que existe mas precisa de validação end-to-end.
- 🎨 **Estético** — UX/consistência visual e textual.
- ⭐ **Bónus** — melhoria opcional de maior esforço.

Cada ponto tem: **Problema**, **Causa** (ficheiro:linha), **Implementação proposta**, **Esforço** e notas/dúvidas.

---

## 🔴 Importante

### P10 — Pedidos de Badges: não dá para ver evidências de processos já feitos
- **Problema:** no detalhe de uma candidatura já concluída (APPROVED/CLOSED/REJECTED), as evidências submetidas não aparecem.
- **Causa:** `DetalheCandidatura` em [AdminCandidaturas.jsx](../web/src/pages/admin/AdminCandidaturas.jsx) lista evidências por requisito, mas é preciso confirmar se: (a) o endpoint de detalhe devolve as evidências para estados fechados, ou (b) o frontend só as mostra em estados ativos. Verificar `GET /api/candidaturas/:id` no `candidaturasController`.
- **Implementação:**
  1. Confirmar que o detalhe (`/api/candidaturas/:id`) devolve `evidencias` independentemente do estado. Se não, ajustar a query para não filtrar por estado.
  2. No frontend, garantir que a secção "Requisitos e Evidências" renderiza as evidências sempre (incl. botão de ver/descarregar o ficheiro) mesmo quando o processo está fechado.
- **Esforço:** Médio (backend + frontend).

### P11 — Pedidos de Badges: admin não consegue aprovar/rejeitar
- **Problema:** o admin não vê ações de aprovar/rejeitar no detalhe de uma candidatura.
- **Causa:** o **backend já autoriza** o admin ([candidaturasRoutes.js:27-35](../api/src/routes/candidaturasRoutes.js) — `autorizarPerfis('Talent Manager','Administrador')` e `('Service Line','Administrador')`). É só **frontend**: `DetalheCandidatura` mostra "Este processo está em modo de consulta. As ações só ficam disponíveis nos estados Submitted/Em revisão Talent ou Em validação Service Line." e não expõe os botões ao admin.
- **Implementação:**
  1. No `DetalheCandidatura`, quando o utilizador é Administrador, mostrar as ações conforme a fase do processo:
     - Estados `SUBMITTED`/`IN_TALENT_REVIEW` → avaliação Talent (Aprovar/Enviar para Service Line, Devolver) → `POST /api/candidaturas/:id/avaliar-talent`.
     - Estado `IN_SERVICE_LINE_REVIEW` → avaliação final (Aprovar, Rejeitar, Send Back) → `POST /api/candidaturas/:id/avaliar-service-line`.
  2. Reutilizar os endpoints existentes; registar comentário (auditável em `historico_candidatura`).
- **Esforço:** Médio (só frontend; reaproveita endpoints).
- **Dúvida:** confirmas que o admin deve mesmo poder agir como override do fluxo Talent→Service Line? (O backend já o permite, e o requisito #9 diz "gerir todos os pedidos", por isso assumo que **sim**.)

### P18 — Criar badge: não dá para meter descrição
- **Problema:** o formulário de criar/editar badge não tem campo para a descrição do badge.
- **Causa:** `FORM_INICIAL` em [AdminBadges.jsx:52](../web/src/pages/admin/AdminBadges.jsx) **não tem** `descricao` (só `novoRequisito.descricao`). O `prepararPayload` (linhas 250-260) também **não envia** `descricao`. A descrição existe na BD e é mostrada na vista de detalhe (linha 1310), mas nunca é editável.
- **Implementação:**
  1. Adicionar `descricao: ''` ao `FORM_INICIAL` e carregar no `abrirEdicao`.
  2. Adicionar uma `<textarea>` "Descrição" no formulário (junto ao título).
  3. Incluir `descricao: form.descricao?.trim() || null` no `prepararPayload`.
  4. Confirmar que `badgesController.criar`/`atualizar` aceitam e gravam `descricao` (a coluna existe).
- **Esforço:** Baixo.

### P19 — Criar badge: mudar de nível muda a área e service line
- **Problema:** ao escolher um nível, a Área e a Service Line mudam — comportamento percecionado como bug.
- **Causa:** a cascata em [AdminBadges.jsx:360-413](../web/src/pages/admin/AdminBadges.jsx): selecionar `id_nivel` preenche `id_area`/`id_service_line` a partir do nível. Como um nível **pertence** a uma área (e esta a uma SL), tecnicamente é correto — mas se o utilizador já tinha escolhido Área/SL e depois escolhe um nível de outra área (o dropdown de níveis não está limitado à área escolhida), a Área/SL "saltam".
- **Implementação (recomendado):**
  1. Limitar o dropdown de **Nível** aos níveis da Área selecionada (já existe `niveisFiltrados`, linha 311) — assim, escolher um nível nunca muda a Área.
  2. Em alternativa/complemento: quando uma Área está escolhida, mostrar Área/SL como **derivadas** (read-only) e deixar só o Nível editável.
  3. Garantir a ordem natural Learning Path → Service Line → Área → Nível.
- **Esforço:** Baixo-Médio.
- **Dúvida:** preferes (a) limitar os níveis à área escolhida, ou (b) deixar escolher o nível diretamente e auto-preencher Área/SL? Recomendo (a).

### P16 — Criar badge: "Badge especial" é inválido
- **Problema:** criar um badge ao nível "Especial" dá erro/é inválido.
- **Causa:** existe o conceito "Especial" no mapa de níveis ([AdminBadges.jsx:47](../web/src/pages/admin/AdminBadges.jsx) `Especial: 'Especial'`), mas o filtro de requisitos **exclui** "Especial" (linha 681) e o `prepararPayload` faz `niveis.find(...)` por `id_nivel`; se não há nível "Especial" para a área, `nivel` fica `undefined` → erro "inválido".
- **Implementação:** depende do modelo pretendido (ver dúvida). Duas hipóteses:
  - **(a)** Se badges especiais/conquistas **não** se criam neste ecrã (são geridos em Eventos Especiais/Conquistas) → **remover** a opção "Especial" do formulário de badges para não permitir um estado inválido.
  - **(b)** Se devem ser criáveis aqui → definir como se representa um badge "Especial" na hierarquia (existe um nível "Especial" por área na BD? ou é um flag `is_conquista_especial`?) e tratar o caso no `prepararPayload`/backend.
- **Esforço:** Baixo (a) / Médio (b).
- **Dúvida importante:** como devem funcionar os badges "especiais/conquista especial"? São criados neste ecrã ou noutro (Eventos Especiais/Conquistas)? Sem isto, vou pela hipótese (a) — remover a opção inválida.

---

## 🧪 É preciso testar

### P15 — Gestão de Utilizadores: email de reset de password
- **Problema:** confirmar que "Repor password" envia email ao utilizador.
- **Causa:** o reset do admin gera/define password; falta confirmar se dispara email. Em dev não há SMTP (envio em *stub* no log), por isso "funciona" mas não chega email real.
- **Implementação/teste:**
  1. Verificar o endpoint de repor password no `utilizadoresController` — se envia email (e respeita `config_notificacao`).
  2. Se não envia, adicionar envio (template "password reposta pelo administrador") via `utils/email.js`.
  3. Testar end-to-end: em dev confirmar o stub no log; em produção, com SMTP configurado, confirmar a chegada.
- **Esforço:** Baixo-Médio (depende se já envia).

### P20 — Gestão de Utilizadores: email ao criar uma conta
- **Problema:** confirmar que criar um utilizador envia email (confirmação/boas-vindas).
- **Causa:** semelhante ao P15 — verificar o fluxo de criação no `utilizadoresController` e o `config_notificacao` (`email_confirmacao_registo`).
- **Implementação/teste:**
  1. Verificar se a criação pelo admin envia email de confirmação/definição de password.
  2. Garantir que respeita a config global de notificações.
  3. Testar em dev (stub) e documentar para produção (SMTP).
- **Esforço:** Baixo-Médio.

> Nota: P15 e P20 dependem de SMTP real para validação final. Em dev valida-se pelo *stub* nos logs. Convém configurar `SMTP_*` no Railway para teste real.

---

## 🎨 Estético

### P3 — Dashboard: "Candidaturas por Estado" com idioma inconsistente
- **Causa:** em [AdminDashboard.jsx](../web/src/pages/admin/AdminDashboard.jsx) o `estadosResumo` mistura inglês e português: `Open`, `Submitted` (EN) com `Em Validação`, `Fechado` (PT).
- **Implementação:** uniformizar para PT: `Em preparação`, `Submetida`, `Em validação`, `Fechada` (reutilizar o helper `estadoCandidatura` de `lib/formatar.js`, que já tem labels PT).
- **Esforço:** Trivial.

### P8 — Pedidos de Badges: primeiro filtro com idioma inconsistente
- **Causa:** o filtro de estado em `AdminCandidaturas` apresenta algumas opções em inglês e o estado mostrado está em PT.
- **Implementação:** usar o mesmo dicionário de labels PT (`estadoCandidatura`) nas opções do filtro, mantendo os **valores** internos em EN (`SUBMITTED`, etc.) mas **mostrando** PT. Alinhar com a tabela (que já mostra PT).
- **Esforço:** Trivial.

### P4 — Dashboard: secções pouco explícitas ("Evolução Mensal", "% Badges Atribuídos")
- **Causa:** títulos sem contexto do que medem.
- **Implementação:** adicionar subtítulos/legendas:
  - "% Badges Atribuídos" → subtítulo "Badges emitidos vs. badges ativos".
  - "Evolução Mensal" → "Badges atribuídos por mês (últimos 12 meses)".
  - Onde fizer sentido, adicionar tooltip/legenda nos eixos.
- **Esforço:** Baixo.

### P5 — Navbar: sino com bolinha vermelha mas sem notificações
- **Causa:** em [AppShell.jsx](../web/src/components/AppShell.jsx) (`AppTopbar`) o ponto vermelho do sino é **estático** (`<span ... bg-rose-500 />`), sempre visível.
- **Implementação:** buscar contagem de não lidas (`GET /api/notificacoes` → `nao_lidas`) e mostrar o ponto **só** quando `nao_lidas > 0` (idealmente com o número). Partilhar com o ecrã de notificações.
- **Esforço:** Baixo.

### P6 — Dashboard: "Pedidos Recentes" → "Ver Processo" abre o processo específico
- **Causa:** em `AdminDashboard`, "Ver Processo" liga a `/admin/candidaturas` (lista toda) em vez do detalhe.
- **Implementação:** navegar para o detalhe da candidatura específica — `navigate('/admin/candidaturas', { state: { abrirCandidaturaId: c.id_candidatura } })` e o `AdminCandidaturas` abre o `DetalheCandidatura` desse id ao carregar (padrão já usado no AdminPontos→AdminBadges com `state`).
- **Esforço:** Baixo.

### P7 — Pop-ups: o escuro atrás não cobre o ecrã todo
- **Causa:** a investigar — confirmar qual modal. Os modais usam `fixed inset-0 ... bg-black/60`, que deve cobrir o ecrã; possível causa é z-index abaixo da sidebar (`z-20`)/nav mobile (`z-30`) num modal específico, ou um overlay que não usa `fixed inset-0`.
- **Implementação:** auditar todos os overlays de modal e **uniformizar**: `fixed inset-0 z-50 bg-black/60`. Idealmente extrair um componente `<ModalOverlay>` partilhado (relacionado com P12 — consistência).
- **Esforço:** Baixo-Médio (auditoria).

### P9 — Pedidos de Badges: filtros só com dados que têm candidaturas
- **Causa:** os dropdowns (Service Line, Área, Badge, Consultor) mostram **todas** as opções, mesmo as que não devolvem candidaturas.
- **Implementação:** derivar as opções dos filtros a partir dos dados realmente existentes nas candidaturas (valores distintos presentes), em vez de listar todas as entidades. Aplicar lazy/dependência entre filtros (Área depende da SL escolhida, etc.).
- **Esforço:** Médio.

### P13 — Gestão de Utilizadores: filtros só com dados que têm utilizadores
- **Causa:** igual ao P9, mas em `AdminUtilizadores` (ex.: filtro de Service Line mostra SLs sem utilizadores).
- **Implementação:** derivar as opções dos filtros dos utilizadores existentes.
- **Esforço:** Médio. (P9 e P13 podem partilhar a mesma abordagem/util.)

### P14 — Gestão de Utilizadores: botão "Desativar" diz "Eliminar"
- **Causa:** [AdminUtilizadores.jsx:536](../web/src/pages/admin/AdminUtilizadores.jsx) — o botão do modal de desativar tem texto "Eliminar" e "A eliminar...".
- **Implementação:** trocar para "Desativar" / "A desativar...". Confirmar a cor (deixar de parecer destrutivo/vermelho se for só desativar — talvez laranja como nos outros "desativar").
- **Esforço:** Trivial.

### P17 — Criar Nível: remover a parte do badge (não usada neste ecrã)
- **Causa:** o modal de criar nível em `AdminNiveis` tem secção/botões de badge que não se usam ali.
- **Implementação:** remover a UI de badge do formulário de criar/editar nível (mantendo a relação nível↔badge gerida no ecrã de Badges).
- **Esforço:** Baixo.

### P12 — Todas as tabelas: botões de paginação inconsistentes
- **Causa:** cada ecrã tem o seu rodapé de paginação, com pequenas diferenças.
- **Implementação:** extrair um componente partilhado `<Paginacao pagina total porPagina onMudar />` e usá-lo em todos os CRUDs (Utilizadores, LP, SL, Áreas, Níveis, Badges, Requisitos, Eventos, Candidaturas, Notificações, Avisos). Uniformiza estilo e comportamento.
- **Esforço:** Médio (toca em muitos ecrãs, mas mecânico — semelhante à migração de exportações já feita).

---

## ⭐ Bónus

### P2 — Navbar: mudança de idiomas não funciona
- **Problema:** clicar nas bandeiras (PT/EN/ES) não muda o idioma do admin.
- **Causa:** em [AppShell.jsx](../web/src/components/AppShell.jsx) as bandeiras do `AppTopbar` são **estáticas** (não chamam `mudarIdioma`); e os ecrãs admin estão **hardcoded em PT** (não usam `t()` do `LanguageContext`). O `LanguageContext` já existe e o consultor usa-o.
- **Implementação (faseada):**
  1. **Mínimo:** ligar as bandeiras ao `LanguageContext.mudarIdioma` e destacar o idioma ativo (já persiste a preferência).
  2. **Completo (Bónus):** internacionalizar os ecrãs admin — substituir strings por `t('chave')` e adicionar as traduções (PT/EN/ES) ao `LanguageContext`. É um esforço grande (muitos ecrãs e strings).
- **Esforço:** Baixo (passo 1) / Alto (passo 2, i18n completo do admin).

---

## Resumo de esforço / ordem sugerida

1. **Triviais primeiro** (alto impacto, baixo custo): P14, P3, P8, P5, P6, P4, P17.
2. **Importantes**: P18 (descrição), P11 (aprovar/rejeitar), P19 (cascata nível), P10 (evidências), P16 (badge especial — depende de dúvida).
3. **Testes**: P15, P20 (idealmente com SMTP no Railway).
4. **Médios/transversais**: P7 (overlays), P9+P13 (filtros por dados), P12 (paginação partilhada).
5. **Bónus**: P2 (i18n do admin) — por último, faseado.

## Dúvidas a confirmar antes de implementar
1. **P16:** como devem funcionar os badges "especiais/conquista especial"? Criam-se no ecrã de Badges ou noutro (Eventos Especiais/Conquistas)?
2. **P11:** confirmas que o admin deve poder aprovar/rejeitar diretamente (override do fluxo)? (Backend já permite.)
3. **P19:** preferes limitar o dropdown de Nível à Área escolhida (recomendado), ou manter a auto-seleção de Área/SL ao escolher o Nível?
4. **P9/P13:** os filtros devem mostrar **apenas** valores com dados, ou manter todos mas desativar/assinalar os vazios?
