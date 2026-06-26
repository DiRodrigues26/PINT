# PINT - Plataforma de Badges Softinsa

Plataforma web para gestão de badges digitais no contexto Softinsa, inspirada em sistemas de certificação como o Credly.

O projeto permite gerir uma hierarquia de aprendizagem, publicar badges, receber candidaturas, validar evidências, atribuir certificados, notificar utilizadores e acompanhar progresso por perfil.

> Projeto académico PINT. A documentação evita credenciais, hosts privados e dados sensíveis.

## Funcionalidades Principais

- Autenticação com JWT, confirmação de email e recuperação de password.
- Primeiro login com alteração obrigatória de password.
- 2FA/TOTP com QR Code.
- Gestão de utilizadores, perfis e permissões.
- Hierarquia de badges: Learning Path -> Service Line -> Área -> Nível -> Badge -> Requisitos.
- Catálogo de badges para consultores.
- Candidaturas a badges.
- Upload, listagem, remoção e reutilização de evidências.
- Validação por Talent Manager e Service Line.
- Atribuição de badges e geração de certificado PDF com QR Code.
- Publicação de badges e perfil público com consentimento RGPD.
- Notificações internas na plataforma.
- Notificações push mobile via Firebase Cloud Messaging.
- Envio de emails via SendGrid ou SMTP/Nodemailer.
- Gestão de conquistas e pontos.
- Avisos/informações da plataforma.
- Gestão e alertas de SLA.
- Preferências de notificação por utilizador.
- Lembretes e timeline/objetivos pessoais.
- Configuração de políticas RGPD.
- Gestão de eventos especiais.
- Dashboards, estatísticas e relatórios por perfil.
- Exportações CSV/PDF no frontend.
- Upload administrativo de imagens/ficheiros, com suporte opcional a Cloudinary.
- Microsite público em `/microsite` para apresentação do projeto, perfis, funcionalidades, demos, acessos de teste e links de produção/APK.

## Stack Técnica

| Área | Tecnologia |
|---|---|
| Backend | Node.js, Express 5 |
| Frontend | React 18, Vite 5 |
| Base de dados | MySQL, mysql2 |
| Autenticação | JWT |
| Password hashing | bcryptjs |
| Uploads | multer |
| Email | SendGrid e Nodemailer/SMTP |
| Notificações | Notificações internas + Firebase Admin para push mobile |
| 2FA | Speakeasy/TOTP + QRCode |
| PDFs / QR Codes | PDFKit, QRCode, jsPDF, jspdf-autotable |
| UI | Tailwind CSS, lucide-react, Recharts |
| Estado server-side | TanStack React Query |
| Cliente HTTP | Axios |
| Build | Vite |
| Deploy | API Express pode servir o build `web/dist` num único serviço |

## Arquitetura

O repositório é um monorepo com duas aplicações principais:

- `api/`: API REST em Express, responsável por autenticação, regras de negócio, acesso à base de dados, uploads, emails, push mobile, certificados e dashboards.
- `web/`: frontend React/Vite, responsável pela experiência dos perfis Consultor, Talent Manager, Service Line, Administrador e pelo microsite público do projeto.

Em desenvolvimento, a API corre normalmente em `http://localhost:3000` e o frontend Vite em `http://localhost:5173`.

Em produção, depois de executar o build da web, a API deteta `web/dist` e serve a SPA diretamente pelo Express. Isto permite publicar API e frontend no mesmo serviço.

## Estrutura de Pastas

```text
PINT/
├── api/
│   ├── database/              # schema SQL, seeds e migrations
│   ├── scripts/               # scripts auxiliares, incluindo criação de admin
│   └── src/
│       ├── controllers/       # lógica de negócio por módulo
│       ├── db/                # ligação MySQL
│       ├── jobs/              # jobs automáticos, ex.: alertas SLA
│       ├── middleware/        # autenticação, autorização, uploads, rate limit
│       ├── routes/            # definição das rotas Express
│       └── utils/             # JWT, email, push, certificados, validação, etc.
├── docs/                      # documentação de requisitos e notas técnicas
├── web/
│   ├── dist/                  # build gerado pelo Vite, quando existe
│   └── src/
│       ├── components/        # componentes reutilizáveis
│       ├── context/           # AuthContext e LanguageContext
│       ├── lib/               # cliente API, exportações e helpers
│       └── pages/             # páginas por perfil e módulo
└── package.json               # scripts da raiz para instalação, build e produção
```

## Rotas Principais da API

| Módulo | Prefixo | Responsabilidade |
|---|---|---|
| Auth | `/api/auth` | Registo, login, confirmação de email, recuperação de password, 2FA e sessão atual |
| Utilizadores | `/api/utilizadores` | Perfil próprio e gestão administrativa de utilizadores |
| Learning Paths | `/api/learning-paths` | CRUD da hierarquia de topo |
| Service Lines | `/api/service-lines` | CRUD de service lines |
| Áreas | `/api/areas` | CRUD de áreas |
| Níveis | `/api/niveis` | CRUD de níveis |
| Requisitos | `/api/requisitos` | CRUD e associação de requisitos a badges |
| Badges | `/api/badges` | Catálogo, detalhe, recomendações e CRUD administrativo |
| Candidaturas | `/api/candidaturas` | Criação, submissão, evidências, histórico e avaliações |
| Badges atribuídos | `/api/badges-atribuidos` | Badges obtidos, certificados, publicação e LinkedIn |
| Alias badges atribuídos | `/api/badge-atribuido` | Alias mantido para compatibilidade com frontend |
| Notificações | `/api/notificacoes` | Notificações internas e tokens Firebase mobile |
| Conquistas | `/api/conquistas` | Gamificação e progresso |
| Avisos | `/api/avisos` | Avisos ativos e gestão de comunicações |
| SLA | `/api/sla` | Configuração, candidaturas fora de prazo e notificações |
| Preferências | `/api/preferencias` | Preferências de notificação do utilizador |
| Configuração de notificações | `/api/config-notificacao` | Toggles globais de canais/eventos |
| Lembretes | `/api/lembretes` | Lembretes pessoais |
| Timeline | `/api/timeline` | Objetivos pessoais e acompanhamento |
| RGPD | `/api/rgpd` | Consentimentos e políticas RGPD |
| Eventos | `/api/eventos` | Eventos especiais e requisitos associados |
| Estatísticas | `/api/estatisticas` | Dashboards, rankings e relatórios |
| Ficheiros | `/api/ficheiros` | Upload administrativo |
| TOTP | `/api/totp` | Estado, setup, ativação e desativação de 2FA |
| Público | `/api/publico` e `/publico` | Verificação pública de badges e perfil público |
| Health check | `/health` | Estado básico da API |

## Rotas Públicas do Frontend

| Rota | Objetivo |
|---|---|
| `/microsite` | Microsite informativo e interativo para apresentação final do projeto |
| `/projeto` | Alias que redireciona para `/microsite` |
| `/verificar/:token` | Verificação pública de badge atribuído |
| `/perfil-publico/:slug` | Perfil público do consultor, condicionado por consentimento RGPD |

URL de produção da aplicação web: `https://pint-production.up.railway.app/`.

O microsite inclui a área para dois vídeos de demonstração: aplicação web e aplicação mobile, com duração máxima recomendada de 90 segundos por vídeo.

## Setup Local

### Requisitos

- Node.js 18 ou superior.
- npm.
- MySQL acessível localmente ou remotamente.
- Variáveis de ambiente configuradas na API.

### Instalação

Na raiz do repositório:

```bash
npm install
```

O `postinstall` da raiz instala as dependências da web e da API.

Também é possível instalar manualmente:

```bash
cd api
npm install

cd ../web
npm install
```

### Configuração de ambiente

Criar `api/.env` com as variáveis necessárias. Não commitar ficheiros `.env`.

Exemplo mínimo para desenvolvimento:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=softinsa_badges

JWT_SECRET=trocar-por-um-segredo-forte
JWT_EXPIRES_IN=7d

UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
MAX_IMAGE_SIZE_MB=5
```

### Correr em desenvolvimento

Terminal 1:

```bash
cd api
npm run dev
```

Terminal 2:

```bash
cd web
npm run dev
```

Validar a API:

```bash
curl http://localhost:3000/health
```

## Variáveis de Ambiente

| Variável | Uso |
|---|---|
| `PORT` | Porta da API |
| `NODE_ENV` | Ambiente da aplicação |
| `FRONTEND_URL` | Origens permitidas e links enviados por email |
| `MOBILE_APP_URL` | Deep link opcional para fluxos mobile |
| `DB_HOST` | Host MySQL |
| `DB_PORT` | Porta MySQL |
| `DB_USER` | Utilizador MySQL |
| `DB_PASSWORD` | Password MySQL |
| `DB_NAME` | Nome da base de dados |
| `JWT_SECRET` | Segredo de assinatura JWT |
| `JWT_EXPIRES_IN` | Expiração do JWT |
| `JWT_REFRESH_SECRET` | Segredo para refresh token, se usado |
| `JWT_REFRESH_EXPIRES_IN` | Expiração do refresh token, se usado |
| `UPLOAD_DIR` | Pasta local de uploads |
| `MAX_FILE_SIZE_MB` | Limite de upload de evidências |
| `MAX_IMAGE_SIZE_MB` | Limite de upload de imagens |
| `SENDGRID_API_KEY` | Envio de email via SendGrid |
| `EMAIL_FROM` | Remetente de email |
| `SMTP_HOST` | Host SMTP fallback |
| `SMTP_PORT` | Porta SMTP |
| `SMTP_SECURE` | SMTP seguro |
| `SMTP_USER` | Utilizador SMTP |
| `SMTP_PASS` | Password SMTP |
| `SMTP_FROM` | Remetente SMTP |
| `FIREBASE_SERVICE_ACCOUNT` | Service account Firebase, JSON ou base64 |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary opcional |
| `CLOUDINARY_API_KEY` | Cloudinary opcional |
| `CLOUDINARY_API_SECRET` | Cloudinary opcional |
| `CLOUDINARY_FOLDER` | Pasta Cloudinary opcional |
| `SLA_JOB_INTERVAL_MIN` | Intervalo do job automático de SLA; `0` desativa |
| `SLA_ALERT_DEDUP_HOURS` | Janela para evitar alertas SLA repetidos |
| `DISABLE_HTTPS_REDIRECT` | Desativa redirect HTTPS em produção quando definido como `true` |

## Build e Produção

Na raiz:

```bash
npm run build
npm start
```

O comando `npm run build` compila o frontend para `web/dist`.

O comando `npm start` arranca a API com `node api/src/index.js`. Se `web/dist` existir, o Express serve a aplicação React como SPA e mantém as rotas `/api/*`, `/publico/*`, `/health` e uploads separadas.

Pontos críticos em produção:

- Definir `NODE_ENV=production`.
- Usar `JWT_SECRET` forte.
- Definir `FRONTEND_URL` com o domínio público real.
- Configurar MySQL com credenciais fora do repositório.
- Configurar email real apenas por variáveis de ambiente.
- Configurar Firebase apenas se a app mobile usar push.
- Rever persistência de uploads em plataformas com filesystem efémero.

## Segurança

O projeto usa:

- JWT para autenticação.
- bcryptjs para hash de passwords.
- Middleware `autenticar` para validar sessão e carregar perfis.
- Middleware `autorizarPerfis` para proteger endpoints por perfil.
- Rate limit em endpoints sensíveis de autenticação.
- CORS com lista de origens permitidas via `FRONTEND_URL`.
- Redirect HTTPS em produção quando aplicável.
- Validações backend para email, nome, idioma, password e vários fluxos críticos.
- multer para upload de ficheiros.
- 2FA/TOTP opcional por utilizador.
- Consentimentos RGPD antes de publicação/partilha pública de badges.

Melhorias futuras recomendadas:

- Adicionar Helmet e security headers.
- Validar magic bytes nos uploads.
- Proteger evidências por endpoint autenticado em vez de static público.
- Centralizar validações com schemas.
- Trocar rate limit em memória por store partilhado em produção multi-instância.
- Adicionar testes automatizados de autorização, ownership e validação.

## Testes e Validação

Não existem scripts de testes automatizados confirmados nos `package.json`.

Validações manuais recomendadas antes de entrega:

- `GET /health`.
- Login, logout e refresh de sessão.
- Registo, confirmação de email e completar perfil.
- Recuperação e redefinição de password.
- Primeiro login.
- Ativação e desativação de 2FA.
- Acesso admin a CRUDs principais.
- Acesso Consultor apenas às próprias candidaturas/evidências.
- Acesso Service Line apenas à sua service line.
- Fluxo completo de candidatura: criar -> carregar evidências -> submeter -> validar Talent -> validar Service Line -> emitir badge.
- Publicação/despublicação de badge e perfil público.
- Exportações CSV/PDF.
- Email em modo stub/desenvolvimento e envio real em produção.
- Push mobile Firebase, se configurado.

Checklist antes de produção:

- `.env` fora do Git.
- `NODE_ENV=production`.
- `FRONTEND_URL` correto.
- `JWT_SECRET` forte.
- Base de dados atualizada com `schema.sql` e migrations necessárias.
- Uploads e evidências revistos do ponto de vista de privacidade.
- CORS testado com origem autorizada e origem não autorizada.
- Utilizador administrador criado por script ou CRUD seguro.

## Estado do Projeto

### Implementado

- API Express e frontend React integrados no mesmo repositório.
- Autenticação, perfis, dashboards e CRUDs principais.
- Fluxo de candidatura com evidências e avaliações.
- Certificados PDF com QR Code.
- Notificações internas, email e push mobile.
- SLA, RGPD, conquistas, eventos, timeline e lembretes.
- Build de produção com frontend servido pela API.

### Em validação

- Hardening de segurança de uploads e evidências.
- Validações server-side mais consistentes nos CRUDs administrativos.
- Revisão final de produção em ambiente real.

### Melhorias futuras

- Testes automatizados.
- Documentação OpenAPI.
- CI/CD.
- Observabilidade e logs estruturados.
- Storage externo persistente para uploads privados.
- Backups e procedimentos operacionais de base de dados.

## Autores e Contexto

Projeto desenvolvido no âmbito académico PINT, com aplicação ao contexto de badges digitais da Softinsa.

Equipa/autores:

- Sérgio Costa - 27428
- Diogo Caçador - 27427
- Jaime Ribeiro - 27412
- Helder Albuquerque - 27409
- Francisco Pereira - 27422

