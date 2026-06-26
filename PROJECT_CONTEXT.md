# PROJECT_CONTEXT - PINT / Softinsa Badges

Este documento reúne contexto funcional, técnico e de decisão do projeto PINT / Softinsa Badges. Foi escrito para apoiar relatório final, microsite, manutenção futura e onboarding de novos programadores.

Sempre que uma afirmação depende diretamente do código, ela é tratada como confirmada. Pontos não codificados, mas razoavelmente deduzidos pelo contexto do projeto, são assinalados como inferidos. Pontos de evolução são assinalados como melhoria futura.

## 1. Identificação do Projeto

| Campo | Descrição |
|---|---|
| Nome | PINT - Plataforma de Badges Softinsa |
| Domínio | Gestão de badges digitais, certificações internas e progressão de competências |
| Contexto | Projeto académico PINT aplicado ao contexto Softinsa |
| Público-alvo | Consultores, Talent Managers, responsáveis de Service Line e Administradores |
| Repositório | `DiRodrigues26/PINT` |
| Arquitetura | Monorepo com API Express e frontend React/Vite |

O objetivo da plataforma é permitir que colaboradores acompanhem e demonstrem competências através de badges digitais. O sistema organiza badges numa hierarquia de aprendizagem, permite candidaturas com evidências, suporta validação por perfis responsáveis e atribui badges verificáveis publicamente quando existe consentimento RGPD.

## 2. Visão Geral Funcional

A plataforma gere o ciclo de vida de badges digitais:

1. O Administrador configura a hierarquia de aprendizagem.
2. O Administrador cria requisitos, badges, eventos, SLAs, avisos e políticas RGPD.
3. O Consultor consulta o catálogo e candidata-se a badges.
4. O Consultor carrega evidências associadas aos requisitos.
5. O Talent Manager valida as evidências.
6. A Service Line faz a validação final.
7. Se aprovado, o badge é atribuído ao Consultor.
8. O Consultor pode publicar o badge, gerar certificado, partilhar no LinkedIn e usar assinatura de email.
9. A plataforma notifica intervenientes por notificações internas, email e, quando configurado, push mobile.
10. Dashboards e estatísticas permitem acompanhar progresso, SLAs, rankings e atividade.

## 3. Arquitetura Técnica

O projeto está dividido em duas aplicações dentro do mesmo repositório:

- `api/`: backend Node.js + Express.
- `web/`: frontend React + Vite.

A API concentra regras de negócio, autenticação, autorização, persistência em MySQL, uploads, notificações, emails, push mobile, geração de certificados e endpoints públicos.

O frontend consome a API através de Axios e usa React Query para cache e sincronização de dados server-side. A navegação é feita com React Router e a interface é construída com Tailwind CSS, lucide-react e Recharts.

Em desenvolvimento, API e web correm em processos separados. Em produção, o comando de build da raiz gera `web/dist`, e o Express serve esse build como SPA quando a pasta existe.

## 4. Stack Detalhada

### Backend

- **Express**: framework HTTP e routing da API.
- **mysql2**: driver MySQL com queries parametrizadas.
- **jsonwebtoken**: emissão e verificação de JWT.
- **bcryptjs**: hashing de passwords.
- **multer**: upload de evidências e imagens.
- **firebase-admin**: envio de notificações push para app mobile via Firebase Cloud Messaging.
- **@sendgrid/mail**: envio de emails via SendGrid.
- **nodemailer**: fallback SMTP para envio de emails.
- **pdfkit**: geração de certificados PDF.
- **qrcode**: geração de QR Codes para certificados e TOTP.
- **speakeasy**: geração/verificação de códigos TOTP.
- **uuid**: geração de identificadores/tokens quando necessário.
- **dotenv**: leitura de variáveis de ambiente.
- **cors**: controlo de origens permitidas.

### Frontend

- **React**: construção da interface.
- **Vite**: desenvolvimento e build.
- **React Router DOM**: routing client-side.
- **TanStack React Query**: fetching, cache, mutations e invalidação.
- **Axios**: cliente HTTP com interceptor de JWT.
- **Tailwind CSS**: sistema visual por utility classes.
- **lucide-react**: ícones.
- **Recharts**: gráficos em dashboards e relatórios.
- **react-hot-toast**: feedback visual de ações.
- **jsPDF + jspdf-autotable**: exportações PDF no frontend.

## 5. Modelo de Domínio

Entidades confirmadas no schema:

- **utilizador**: conta do utilizador, email, password hash, idioma, estado, tokens, TOTP e slug público.
- **perfil**: perfis funcionais como Consultor, Administrador, Talent Manager e Service Line.
- **utilizador_perfil**: associação muitos-para-muitos entre utilizadores e perfis.
- **learning_path**: topo da hierarquia de aprendizagem.
- **service_line**: unidade/equipa dentro de um Learning Path.
- **area**: área funcional dentro de uma Service Line.
- **nivel**: nível de proficiência dentro de uma área.
- **badge**: certificação digital associada a um nível.
- **requisito**: requisito de evidência.
- **badge_requisito**: associação funcional entre badge e requisito.
- **candidatura_badge**: pedido de obtenção de badge por um consultor.
- **evidencia**: ficheiro carregado para comprovar um requisito.
- **avaliacao_candidatura**: decisão feita por Talent Manager ou Service Line.
- **historico_candidatura**: histórico/auditoria de transições.
- **badge_atribuido**: badge emitido após aprovação.
- **certificado**: certificado associado a um badge atribuído.
- **notificacao**: notificações internas da plataforma.
- **preferencia_notificacao**: preferências individuais.
- **config_notificacao**: configuração global de canais e eventos.
- **conquista_especial**: conquistas e gamificação.
- **utilizador_conquista**: conquistas obtidas por utilizador.
- **aviso_informacao**: avisos e comunicações.
- **sla_config**: configuração de SLA por fase.
- **lembrete**: lembretes pessoais.
- **timeline_objetivo**: objetivos pessoais.
- **consentimento_rgpd**: consentimentos prestados por utilizadores.
- **politica_rgpd**: políticas RGPD versionadas.
- **evento_especial**: eventos especiais associados a níveis/badges.
- **evento_especial_requisito**: requisitos específicos de eventos.
- **consultor_area**: associação de consultor a área.
- **service_line_responsavel**: associação de responsável a Service Line.
- **template_assinatura_email**: templates de assinatura de email.

Entidade criada dinamicamente pelo código:

- **device_token**: tokens de dispositivos mobile para push Firebase, criada por `utils/push.js` quando necessário.

## 6. Módulos Backend

### Auth - `/api/auth`

Responsabilidade: autenticação, registo, confirmação de email, completar perfil, login, 2FA, recuperação/redefinição de password e utilizador atual.

Endpoints principais:

- `POST /registo`
- `POST /confirmar-email`
- `POST /completar-perfil`
- `POST /login`
- `POST /verificar-2fa`
- `POST /recuperar-password`
- `POST /redefinir-password`
- `POST /primeiro-login`
- `GET /eu`

Perfis: endpoints iniciais são públicos; `primeiro-login` e `eu` exigem JWT.

Dependências: `bcryptjs`, `jsonwebtoken`, `speakeasy`, `email`, `validacao`, `rateLimit`.

### Utilizadores - `/api/utilizadores`

Responsabilidade: perfil próprio e gestão administrativa de contas.

Endpoints próprios:

- `GET /eu/perfil`
- `GET /eu/perfil-completo`
- `PUT /eu/perfil`
- `PUT /eu/password`

Endpoints administrativos:

- `GET /`
- `POST /`
- `GET /:id`
- `PUT /:id`
- `DELETE /:id`
- `PUT /:id/perfis`
- `POST /:id/repor-password`

Perfis: perfil próprio exige autenticação; gestão global exige Administrador.

Dados manipulados: nome, email, idioma, estado ativo, perfis, área, service line, password e tokens de recuperação.

### Hierarquia - `/api/learning-paths`, `/api/service-lines`, `/api/areas`, `/api/niveis`

Responsabilidade: gestão da estrutura Learning Path -> Service Line -> Área -> Nível.

Perfis: leitura autenticada; mutações administrativas.

Dados manipulados: nomes, descrições, relações parent/child e estado ativo.

Importância: a hierarquia define o contexto de badges, requisitos, consultores, relatórios e permissões de Service Line.

### Requisitos - `/api/requisitos`

Responsabilidade: gestão de requisitos e associação ao badge.

Perfis: leitura autenticada; mutações administrativas.

Dados manipulados: requisito, tipo de evidência, imagem, ordem, obrigatório, ativo e associação `badge_requisito`.

Tipos de evidência atualmente suportados:

- `Certificado`
- `Curso`
- `Documento`
- `Outro`

Decisão recente confirmada: a opção `Badge` foi removida dos formulários administrativos e rejeitada no backend. O motivo é que "ter outro badge como requisito" não existe no modelo relacional atual. Implementar essa regra exigiria uma relação nova entre badges, validação de ciclos, regras de elegibilidade, adaptação do fluxo de candidatura e UI própria para o consultor. Como não era requisito da empresa, foi preferido remover a opção para evitar uma funcionalidade aparente mas incompleta.

### Badges - `/api/badges`

Responsabilidade: catálogo, detalhe, recomendações e CRUD administrativo.

Endpoints principais:

- `GET /recomendacoes`
- `GET /`
- `GET /:id`
- `POST /`
- `PUT /:id`
- `DELETE /:id`

Perfis: leitura autenticada; mutações administrativas.

Dados manipulados: título, descrição, nível, pontos, imagem, expiração, competências, requisitos e estado.

### Candidaturas - `/api/candidaturas`

Responsabilidade: gerir candidatura a badge e workflow de validação.

Endpoints principais:

- `POST /`
- `GET /`
- `GET /:id`
- `GET /:id/historico`
- `POST /:id/submeter`
- `DELETE /:id`
- `GET /:id/evidencias`
- `POST /:id/evidencias`
- `POST /:id/evidencias/reutilizar`
- `DELETE /:id/evidencias/:idEvidencia`
- `POST /:id/iniciar-validacao-talent`
- `POST /:id/avaliar-talent`
- `POST /:id/avaliar-service-line`

Perfis:

- Consultor cria, edita e submete as próprias candidaturas.
- Talent Manager valida evidências.
- Service Line faz validação final dentro da sua Service Line.
- Administrador tem capacidade de gestão/consulta conforme endpoints.

Estados confirmados:

```text
OPEN -> SUBMITTED -> IN_TALENT_REVIEW -> IN_SERVICE_LINE_REVIEW -> APPROVED
                                      -> REJECTED
                                      -> SENT_BACK / OPEN
```

### Evidências

Responsabilidade: upload, listagem, remoção e reutilização de ficheiros de prova.

Implementação: endpoints dentro de `/api/candidaturas/:id/evidencias`, com upload via multer.

Dados manipulados: ficheiro, requisito, candidatura, descrição, URL do ficheiro e tipo MIME.

Melhoria futura: proteger evidências através de endpoint autenticado em vez de exposição static direta da pasta de uploads.

### Badges Atribuídos - `/api/badges-atribuidos` e `/api/badge-atribuido`

Responsabilidade: badges emitidos, publicação, certificados e partilha.

Endpoints:

- `GET /meus`
- `GET /proximos-expiracao`
- `GET /consultor/:id`
- `GET /:id/certificado`
- `POST /:id/publicar`
- `POST /:id/despublicar`
- `POST /:id/linkedin`

Dependências: `utils/certificado.js`, PDFKit e QRCode.

### Público - `/api/publico` e `/publico`

Responsabilidade: verificação pública de badges e perfis públicos.

Endpoints:

- `GET /badges/:token`
- `GET /perfis/:slug`
- `GET /service-lines`
- `GET /areas`

Nota: endpoints públicos não exigem autenticação. A publicação depende de consentimentos RGPD e do token/slug.

### Notificações - `/api/notificacoes`

Responsabilidade: notificações internas, marcação como lida, arquivo, remoção e tokens mobile.

Endpoints:

- `GET /`
- `POST /registar-token`
- `POST /remover-token`
- `POST /testar-push`
- `POST /ler-todas`
- `POST /arquivar-lidas`
- `POST /apagar-lidas`
- `POST /:id/ler`
- `DELETE /:id`

Dependência: `utils/push.js` para Firebase mobile.

### SLA - `/api/sla`

Responsabilidade: configuração de SLA, listagem de candidaturas fora do prazo e notificações.

Endpoints:

- `GET /`
- `GET /fora-prazo`
- `PUT /:fase`
- `POST /:idCandidatura/notificar`

Job automático: `api/src/jobs/slaAlertas.js`, com intervalo configurável por `SLA_JOB_INTERVAL_MIN`.

### RGPD - `/api/rgpd`

Responsabilidade: consentimentos do utilizador e políticas RGPD.

No contexto deste projeto, RGPD representa o conjunto de controlos usados para respeitar a privacidade do utilizador quando a plataforma trata, publica ou partilha dados pessoais associados a badges. Não é um motor jurídico completo; é uma implementação funcional dos consentimentos e textos de política necessários para controlar a exposição pública de badges.

Há duas partes diferentes:

1. **Políticas RGPD**
   - Geridas pelo Administrador no ecrã `AdminRGPD`.
   - Guardadas na tabela `politica_rgpd`.
   - Têm tipo, versão, título, conteúdo, estado ativo/inativo, data de publicação e autor/atualizador.
   - Servem para mostrar ao utilizador o texto legal/explicativo da política em vigor.
   - Apenas uma política ativa por tipo deve estar publicada.

2. **Consentimentos RGPD**
   - Prestados pelo utilizador autenticado.
   - Guardados na tabela `consentimento_rgpd`.
   - Registam tipo de consentimento, se foi aceite, data de aceitação e versão da política.
   - São usados como regra de negócio antes de permitir exposição pública ou partilha.

Tipos de política suportados no backend:

- `GERAL`: política geral de privacidade/RGPD.
- `PUBLICACAO_BADGE`: texto específico para publicação pública de badges.
- `PARTILHA_LINKEDIN`: texto específico para partilha em LinkedIn.

Consentimentos usados no frontend/backend:

- `publicacao_badge`: controla se os badges/perfil público podem ser publicados e verificados publicamente.
- `partilha_linkedin`: controla se o consultor pode marcar/usar partilha LinkedIn.
- `partilha_auto_linkedin`: preferência/consentimento de partilha automática no frontend.
- `tratamento_dados`: consentimento geral de tratamento de dados no perfil do consultor.

O que o RGPD controla na prática:

- Se um badge atribuído pode ser publicado pelo consultor.
- Se uma página pública de verificação por token pode devolver os dados do badge.
- Se o perfil público por slug mostra badges ou fica vazio por falta de consentimento.
- Se a partilha no LinkedIn pode ser registada.
- Que texto de política é apresentado ao consultor quando consulta a política RGPD.

O que o RGPD não controla diretamente:

- Não decide aprovação/rejeição de candidaturas.
- Não altera pontuações, níveis, requisitos ou badges.
- Não substitui permissões de autenticação/autorização.
- Não torna evidências privadas por si só; a privacidade de ficheiros depende do módulo de uploads/servidor.

Endpoints:

- `GET /politica-ativa`
- `GET /politicas`
- `POST /politicas`
- `PUT /politicas/:id`
- `DELETE /politicas/:id`
- `GET /`
- `POST /`

Perfis: políticas geridas por Administrador; consentimentos por utilizador autenticado.

Locais de uso confirmados:

- Admin: `web/src/pages/admin/AdminRGPD.jsx`.
- Consultor: modal de política em `web/src/pages/consultor/CandidaturaDetalhe.jsx`.
- Consultor: preferências/consentimentos em `web/src/pages/consultor/Perfil.jsx`.
- Consultor: botões de publicação/partilha em `web/src/pages/consultor/MeusBadges.jsx`.
- Público/backend: `api/src/controllers/badgeAtribuidoController.js` bloqueia publicação, verificação pública, perfil público e LinkedIn quando falta consentimento.

### Restantes módulos

- **Conquistas**: gamificação, conquistas e progresso.
- **Avisos**: avisos ativos e gestão administrativa de comunicações. A listagem simples de avisos ativos exige utilizador autenticado; a listagem total, criação, edição e eliminação são de Administrador.
- **Preferências**: preferências de notificação do utilizador.
- **Configuração de notificações**: toggles globais de canais/eventos, apenas Administrador.
- **Lembretes**: lembretes pessoais do utilizador.
- **Timeline**: objetivos pessoais, com suporte a gestão de consultores por perfis autorizados.
- **Eventos**: eventos especiais e requisitos associados.
- **Estatísticas**: dashboards, ranking, pontos, relatórios e atividade por perfil.
- **Ficheiros**: upload administrativo, com suporte opcional a Cloudinary.
- **TOTP**: setup, ativação, estado e desativação de 2FA.

## 7. Módulos Frontend

### Autenticação

Páginas confirmadas:

- `Login`
- `Registo`
- `VerificarEmail`
- `ConfirmarEmail`
- `CompletarPerfil`
- `RecuperarPassword`
- `NovaPassword`
- `AlterarPasswordInicial`

O token é guardado em `localStorage` ou `sessionStorage`, conforme opção de login. O interceptor Axios injeta `Authorization: Bearer <token>`.

### Rotas e proteção

`RotaProtegida` valida se existe utilizador carregado e se o perfil local permite aceder à rota. Esta proteção é de UX; a autorização real deve estar sempre no backend.

Perfis com UI própria:

- Administrador: `/admin/*`
- Consultor: `/dashboard`, `/badges`, `/candidaturas`, `/meus-badges`, `/assinatura-email`, `/conquistas`, `/notificacoes`, `/perfil`
- Service Line: `/sl/*`
- Talent Manager: `/tm/*`

Rotas públicas adicionais:

- Microsite do projeto: `/microsite`
- Alias do microsite: `/projeto`
- Verificação pública de badge: `/verificar/:token`
- Perfil público de consultor: `/perfil-publico/:slug`

### Microsite público

Página: `web/src/pages/publico/Microsite.jsx`.

Responsabilidade: apresentar o projeto de forma resumida, visual e interativa para entrega final, relatório, demonstração e eventual microsite público.

Conteúdo incluído:

- Visão geral do PINT / Softinsa Badges.
- Perfis de utilizador: Administrador, Consultor, Talent Manager e Service Line.
- Funcionalidades principais por categoria: plataforma, candidaturas, gestão e mobile.
- Workflow interativo da candidatura ao badge público.
- Área de demonstração preparada para dois vídeos futuros: web e mobile.
- Área de acesso com website em produção, download APK e contas de teste por perfil.
- Lista dos criadores e números mecanográficos.

Notas de configuração:

- O link de produção e o link do APK ficam centralizados no objeto `LINKS` dentro do componente.
- URL de produção configurado no microsite: `https://pint-production.up.railway.app/`.
- O link do APK ainda fica como `#` até a equipa disponibilizar o ficheiro final.
- As credenciais de teste estão estruturadas por perfil, mas com valores "A preencher" até a equipa definir contas finais de demonstração.
- A secção de demonstração está preparada para dois vídeos: aplicação web e aplicação mobile, com duração máxima recomendada de 90 segundos por vídeo.

### Administrador

Páginas principais:

- Dashboard
- Candidaturas
- Utilizadores
- Learning Paths
- Service Lines
- Áreas
- Níveis
- Badges
- Requisitos
- Eventos especiais
- Pontos
- SLA
- Notificações
- Definições de notificações
- Relatórios
- Avisos
- RGPD
- Perfil

Responsabilidade: gestão global da plataforma, configuração, relatórios, políticas e administração da hierarquia.

### Consultor

Páginas principais:

- Dashboard
- Catálogo de badges
- Detalhe de badge
- Candidaturas
- Detalhe de candidatura
- Meus badges
- Assinatura de email
- Conquistas
- Notificações
- Perfil

Responsabilidade: candidatura a badges, upload de evidências, acompanhamento de progresso, publicação/partilha de badges e preferências pessoais.

### Service Line

Páginas principais:

- Dashboard
- Perfil
- Notificações
- Pedidos
- Detalhe de pedido
- Badges
- Detalhe de badge
- Consultores
- Perfil de consultor
- Relatórios
- Ranking
- Histórico
- Conquistas

Responsabilidade: validação final de candidaturas, acompanhamento da sua Service Line e relatórios.

### Talent Manager

Páginas principais:

- Dashboard
- Candidaturas
- Badges
- Detalhe de badge
- Relatórios
- Notificações
- Perfil

Responsabilidade: validação de evidências, monitorização global de candidaturas e acompanhamento de consultores.

### Bibliotecas frontend internas

- `web/src/lib/api.js`: cliente Axios e gestão de token.
- `web/src/lib/exportar.js`: exportações CSV e impressão em tabela.
- `web/src/lib/exportUtils.js`: exportações CSV/PDF com jsPDF.
- `web/src/lib/formatar.js`: formatação de datas/estados.
- `web/src/lib/validacao.js`: validações client-side.
- `web/src/context/LanguageContext.jsx`: i18n PT/EN/ES.
- `web/src/context/AuthContext.jsx`: sessão e utilizador autenticado.

## 8. Fluxos Principais

### Registo e confirmação de email

1. Utilizador regista email/password.
2. Backend valida email, password e idioma.
3. Backend cria utilizador temporário e token de confirmação.
4. Email de confirmação é enviado quando email está configurado.
5. Utilizador confirma email.
6. Se faltar perfil, frontend encaminha para completar perfil.
7. Registo público confirmado no código: apenas Consultor.

### Login

1. Utilizador envia email e password.
2. Backend valida credenciais e estado da conta.
3. Se 2FA estiver ativo, devolve `pre_auth_token`.
4. Se não houver 2FA, devolve JWT e dados do utilizador.
5. Frontend guarda token em localStorage/sessionStorage.

### 2FA/TOTP

1. Utilizador autenticado inicia setup.
2. Backend gera segredo TOTP e QR Code.
3. Utilizador confirma código.
4. Backend ativa 2FA.
5. No login seguinte, password correta exige código TOTP.

### Recuperação de password

1. Utilizador pede recuperação por email.
2. Backend gera token com expiração.
3. Email de recuperação é enviado se o endereço existir.
4. Utilizador define nova password.
5. Backend atualiza hash e limpa token.

### Candidatura a badge

1. Consultor abre badge no catálogo.
2. Cria candidatura.
3. Carrega evidências por requisito.
4. Submete candidatura.
5. Talent Manager valida evidências.
6. Service Line aprova, rejeita ou devolve.
7. Se aprovado, badge é atribuído e pode gerar certificado.

### Publicação e verificação pública

1. Consultor aceita consentimento RGPD aplicável.
2. Publica badge ou perfil.
3. Plataforma disponibiliza link público por token/slug.
4. Certificado inclui QR Code para verificação pública.

### SLA

1. Administrador configura SLA por fase.
2. Plataforma lista candidaturas fora de SLA.
3. Administrador pode notificar manualmente.
4. Job automático pode criar alertas internos, emails e push mobile conforme configuração.

### Exportações e ficheiros

O frontend gera exportações CSV e PDF em vários módulos administrativos e perfis operacionais. O backend gera certificado PDF do badge atribuído com PDFKit e QRCode.

## 9. Segurança e Permissões

### Autenticação

A autenticação é baseada em JWT. O middleware `autenticar`:

- lê o token Bearer;
- verifica a assinatura;
- carrega utilizador e perfis;
- bloqueia contas inativas;
- força alteração de password quando `primeiro_login_pendente` está ativo.

### Autorização

O middleware `autorizarPerfis` restringe endpoints por perfil. Além disso, alguns controllers aplicam ownership:

- Consultor vê apenas as próprias candidaturas e evidências.
- Service Line vê candidaturas associadas à sua Service Line.
- Talent Manager e Administrador têm escopos mais amplos conforme regra funcional.
- Endpoints `/eu` usam o utilizador autenticado como fonte de verdade.

### Rate limit

Há rate limit em endpoints sensíveis de autenticação:

- registo;
- login;
- confirmação/completar perfil por token;
- recuperação/redefinição de password;
- 2FA.

Melhoria futura: usar store partilhado, como Redis, em ambientes multi-instância.

### CORS e HTTPS

O CORS usa `FRONTEND_URL` como lista de origens permitidas. Em desenvolvimento, localhost é permitido. Em produção, há redirect HTTPS quando `NODE_ENV=production`, exceto se `DISABLE_HTTPS_REDIRECT=true`.

### Uploads

Uploads usam multer com limites por variável de ambiente e filtros por MIME/extensão.

Melhoria futura importante:

- validar conteúdo real do ficheiro por magic bytes;
- separar ficheiros públicos de evidências privadas;
- servir evidências por endpoint autenticado com verificação de ownership.

### Segredos

Credenciais de BD, JWT, email, Firebase e Cloudinary devem estar apenas em variáveis de ambiente. Não devem ser commitadas.

## 10. Deploy e Infraestrutura

### Desenvolvimento local

- API: `cd api && npm run dev`
- Web: `cd web && npm run dev`
- Health check: `GET /health`

### Produção

Na raiz:

```bash
npm run build
npm start
```

O build gera `web/dist`. A API Express serve esta pasta se ela existir.

### Deploy num único serviço

Confirmado no código:

- `package.json` da raiz tem `build` para a web.
- `package.json` da raiz tem `start` para a API.
- `api/src/index.js` serve `web/dist`.
- Rotas de API e públicas continuam separadas do fallback SPA.

### Base de dados

O projeto usa MySQL. O schema principal está em `api/database/schema.sql`. Existem migrations adicionais em `api/database/migrations`.

### Uploads em produção

Os uploads locais dependem do filesystem do serviço. Em plataformas com filesystem efémero, deve ser usado storage externo ou uma estratégia persistente.

O backend inclui suporte opcional a Cloudinary para upload administrativo quando `CLOUDINARY_*` está configurado.

### Email

O email usa SendGrid quando `SENDGRID_API_KEY` existe. Se não existir, tenta SMTP/Nodemailer. Sem configuração, o código usa stub em logs.

### Firebase

O push mobile usa Firebase Admin quando `FIREBASE_SERVICE_ACCOUNT` está configurado. A variável pode conter JSON direto ou base64.

## 11. Decisões Técnicas

### Express

Express foi escolhido por simplicidade, controlo direto de rotas/middlewares e boa adequação a APIs REST académicas/profissionais.

### React + Vite

React permite construir interfaces por perfil com componentes reutilizáveis. Vite oferece desenvolvimento rápido e build simples para SPA.

### MySQL

MySQL adequa-se ao domínio relacional do projeto: utilizadores, perfis, hierarquia, candidaturas, evidências, avaliações e histórico.

### JWT

JWT permite autenticação stateless entre frontend e API. O token é enviado pelo frontend no header `Authorization`.

### Monorepo

O monorepo simplifica desenvolvimento, entrega, build e deploy de uma plataforma composta por API e frontend.

### Frontend servido pela API

Servir `web/dist` pelo Express reduz complexidade de deploy, permitindo publicar frontend e backend no mesmo serviço.

### Middleware próprio

Os middlewares `autenticar` e `autorizarPerfis` concentram autenticação e autorização, evitando lógica repetida nos controllers.

### Validação no backend

O backend é tratado como fonte de verdade. O frontend pode validar por UX, mas não deve ser considerado mecanismo de segurança.

## 12. Limitações Atuais

Confirmadas ou observadas por auditoria defensiva:

- Não há scripts de testes automatizados nos `package.json`.
- Não existe `.env.example`.
- Não existe documentação OpenAPI/Swagger.
- Uploads ainda devem ser alvo de hardening antes de produção rigorosa.
- Rate limit é em memória.
- Algumas validações administrativas dependem demasiado da BD/FK e podem ser centralizadas.
- Evidências usam URLs em `/uploads`; melhoria futura recomendada é servir ficheiros privados via endpoint autenticado.
- Documentação existente está dispersa e tem pelo menos uma divergência com o código: registo público atual limita a Consultor.

## 12.1. Validação Final do Admin - 2026-06-25

Validação manual assistida no browser local `http://localhost:5173/admin`.

Páginas admin verificadas:

- `/admin`
- `/admin/candidaturas`
- `/admin/utilizadores`
- `/admin/learning-paths`
- `/admin/service-lines`
- `/admin/areas`
- `/admin/niveis`
- `/admin/badges`
- `/admin/requisitos`
- `/admin/eventos`
- `/admin/pontos`
- `/admin/sla`
- `/admin/notificacoes`
- `/admin/notificacoes/definicoes`
- `/admin/relatorios`
- `/admin/avisos`
- `/admin/rgpd`
- `/admin/perfil`

Resultado observado:

- Todas as páginas carregaram autenticadas como Administrador.
- Não houve redirecionamento indevido para login.
- Não foram detetados erros de consola nas páginas testadas.
- Foram observados apenas avisos conhecidos do React Router sobre flags futuras da versão 7.
- Menus, topbar, idiomas, filtros, tabelas e botões principais apareceram nos módulos admin.
- O ecrã de RGPD carregou políticas, filtros por tipo/estado e ação de nova política.
- O ecrã de Avisos carregou avisos, filtros por tipo/estado e ação de criação.
- O ecrã de Requisitos mostrou tipos de evidência apenas como `Certificado`, `Curso`, `Documento` e `Outro`.
- O modal de criação de Badge abriu e o filtro/tipo de evidência deixou de apresentar `Badge` como opção.

Validações de build/código associadas:

- `npm run build` em `web/` passou.
- Carregamento de módulos backend `requisitosController` e `avisosRoutes` passou via Node.
- O aviso de chunk grande do Vite permanece como aviso conhecido, não erro.

Correções relevantes associadas a esta validação:

- Removida a opção `Badge` como tipo de evidência no admin.
- Backend passou a rejeitar tipos de evidência inválidos em requisitos.
- CRUD/listagem total de Avisos restringido a `Administrador`.

## 13. Melhorias Futuras

- Criar testes automatizados de API.
- Criar testes E2E para fluxos críticos.
- Adicionar `.env.example`.
- Adicionar OpenAPI/Swagger.
- Centralizar validação com biblioteca de schemas.
- Adicionar Helmet e security headers.
- Validar magic bytes nos uploads.
- Usar storage externo privado para evidências.
- Melhorar observabilidade e logs estruturados.
- Adicionar auditoria estruturada de ações administrativas.
- Criar pipeline CI/CD.
- Automatizar backups da base de dados.
- Rever constraints de BD para evitar duplicações por race condition.
- Documentar procedimentos de produção e recuperação.

## 14. Conteúdo Útil Para Relatório

### Resumo do projeto

O PINT / Softinsa Badges é uma plataforma web para gestão e validação de badges digitais. Permite estruturar competências numa hierarquia, candidatar consultores a badges, recolher evidências, validar candidaturas por perfis responsáveis e emitir badges/certificados verificáveis publicamente.

### Objetivos

- Digitalizar o processo de reconhecimento de competências.
- Tornar a progressão de competências visível e verificável.
- Permitir submissão e validação estruturada de evidências.
- Dar aos perfis responsáveis ferramentas de acompanhamento e decisão.
- Garantir consentimentos RGPD antes da publicação pública.
- Disponibilizar dashboards, relatórios e notificações.

### Tecnologias

O projeto combina uma API REST em Express, base de dados MySQL e frontend React/Vite. Usa JWT para autenticação, bcryptjs para passwords, multer para uploads, PDFKit/QRCode para certificados, Firebase para push mobile, SendGrid/Nodemailer para emails e React Query/Axios para comunicação frontend-backend.

### Metodologia

Inferido: o projeto evoluiu por módulos funcionais, começando pela autenticação/perfis, seguindo para hierarquia e badges, depois candidaturas/evidências, validações, dashboards e módulos complementares como RGPD, SLA, notificações e gamificação.

### Atividades realizadas

- Modelação da base de dados relacional.
- Implementação da API Express.
- Implementação de autenticação e perfis.
- Construção de frontend por perfis.
- Implementação de CRUDs administrativos.
- Implementação do fluxo de candidatura.
- Implementação de upload/reutilização de evidências.
- Implementação de validação por Talent Manager e Service Line.
- Implementação de badges atribuídos, certificados e QR Codes.
- Implementação de notificações, email e push mobile.
- Implementação de dashboards, relatórios e exportações.
- Implementação de RGPD, SLA, conquistas, eventos, lembretes e timeline.
- Revisões de segurança e documentação.

### Resultados

O resultado é uma plataforma funcional com separação clara de perfis, fluxo completo de candidatura a badges, validação multi-etapa, emissão de certificados e capacidade de deploy num único serviço.

### Dificuldades e desafios

- Manter autorização consistente entre perfis.
- Garantir que o backend é a fonte de verdade, mesmo com frontend alterável.
- Gerir ficheiros/evidências em ambiente web.
- Coordenar emails, notificações internas e push mobile.
- Manter documentação alinhada com evolução rápida do código.
- Cobrir regras de negócio e estados de candidatura.

### Trabalho futuro

- Hardening de segurança de uploads e headers.
- Testes automatizados e CI/CD.
- Documentação OpenAPI.
- Storage externo privado para evidências.
- Observabilidade em produção.
- Manual de operação/administração.
- Melhorias de performance e paginação em áreas com maior volume de dados.

## 15. Afirmações Confirmadas

- O projeto é um monorepo com `api/` e `web/`.
- A raiz tem scripts `postinstall`, `build` e `start`.
- A API serve `web/dist` quando existe.
- A API expõe `/health`.
- A autenticação usa JWT.
- Passwords usam bcryptjs.
- 2FA usa Speakeasy/TOTP e QRCode.
- Uploads usam multer.
- Certificados usam PDFKit e QRCode.
- O frontend usa React, Vite, Axios, React Query, React Router e Tailwind.
- Existem rotas e páginas para Administrador, Consultor, Talent Manager e Service Line.
- Existe microsite público em `/microsite`, com alias `/projeto`.
- Existe i18n PT/EN/ES no frontend.
- Existe suporte a email via SendGrid e SMTP/Nodemailer.
- Existe suporte a push mobile via Firebase Admin.
- Existe job automático de SLA.
- Existe schema SQL com entidades principais do domínio.

## 16. Afirmações Inferidas

- Railway foi usado ou considerado para deploy, com base em documentação interna, mas não há ficheiro de configuração Railway no repo.
- A app mobile é externa a este repositório; o backend apenas suporta push mobile e deep links.
- Cloudinary é opcional, pois depende de variáveis `CLOUDINARY_*`.
- O README será usado como peça pública de portefólio e o PROJECT_CONTEXT como base de relatório/microsite, conforme pedido do utilizador.

## 17. Pontos A Confirmar Com A Equipa

- Nome oficial dos autores/equipa/instituição a incluir nos materiais públicos.
- Se Railway deve ser mencionado explicitamente no README público.
- Se Cloudinary está ativo em produção ou apenas preparado.
- Estado final das melhorias de segurança identificadas em auditoria.
- Política final para evidências privadas e URLs de upload.
- Necessidade de documentação OpenAPI antes da entrega final.
