# PINT — Plataforma de Badges Softinsa

## Contexto

Plataforma de badges digitais para a Softinsa, inspirada em sistemas como o Credly.
Projeto académico PINT. Permite gerir a emissão, validação e partilha de badges por colaboradores,
seguindo uma hierarquia de Learning Paths, Service Lines, Áreas, Níveis e Badges.

---

## Estrutura do repositório

```
PINT/
├── api/                    # Backend Node.js + Express + MySQL
│   ├── src/
│   │   ├── controllers/    # Lógica de negócio por domínio
│   │   ├── routes/         # Definição de endpoints Express
│   │   ├── middleware/      # Auth JWT, autorização por perfil, upload
│   │   └── utils/          # Email, helpers
│   ├── database/
│   │   └── schema.sql      # Schema completo da BD (fonte de verdade)
│   ├── scripts/
│   │   └── criar-admin.js  # Bootstrap do primeiro administrador
│   └── uploads/            # Ficheiros carregados (evidências, imagens)
├── web/                    # Frontend React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── pages/          # Páginas por perfil (auth/, admin/, consultor/, etc.)
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── hooks/          # Custom hooks (React Query, auth, etc.)
│   │   ├── services/       # Clientes Axios por domínio
│   │   └── context/        # AuthContext, LanguageContext
└── docs/                   # Documentação do projeto
    ├── hierarquia-badges-softinsa.md
    ├── verificacao-requisitos-auth-perfis.md
    ├── verificacao-requisitos-dashboard-workflow-seguranca.md
    └── verificacao-requisitos-admin-gestor.md
```

---

## Stack tecnológica

### Backend (`/api`)

| Tecnologia | Versão | Uso |
|---|---|---|
| Node.js | LTS | Runtime |
| Express | 5.2.1 | Framework HTTP |
| mysql2 | 3.22.1 | Driver MySQL com Promises |
| jsonwebtoken | 9.0.3 | Autenticação JWT |
| bcryptjs | 3.0.3 | Hash de passwords |
| multer | 2.1.1 | Upload de ficheiros (evidências, imagens) |
| nodemailer | 8.0.5 | Envio de emails (SMTP ou stub dev) |
| speakeasy | 2.0.0 | Geração/verificação de TOTP (2FA) |
| qrcode | 1.5.4 | Geração de QR codes (2FA e badges públicos) |
| uuid | 13.0.0 | Geração de tokens únicos |
| dotenv | 17.4.2 | Variáveis de ambiente |
| cors | 2.8.6 | CORS para o frontend |
| nodemon | 3.1.14 | Hot reload em desenvolvimento |

### Frontend (`/web`)

| Tecnologia | Versão | Uso |
|---|---|---|
| React | 18.2.0 | Framework UI |
| Vite | 5.2.8 | Build tool e dev server |
| Tailwind CSS | 3.4.3 | Estilização utility-first |
| PostCSS | 8.4.38 | Processamento CSS |
| React Router DOM | 6.22.3 | Routing client-side |
| @tanstack/react-query | 5.28.0 | Cache e sincronização de dados server-side |
| axios | 1.6.8 | Cliente HTTP para a API |
| recharts | 3.8.1 | Gráficos (dashboards, KPIs) |
| lucide-react | 1.14.0 | Ícones SVG |
| react-hot-toast | 2.4.1 | Notificações toast UI |
| @vitejs/plugin-react | 4.2.1 | Plugin Vite para React |

### Base de dados

- **Motor:** MySQL (hospedado no Railway)
- **Base de dados:** `softinsa_badges`
- **Host Railway:** `nozomi.proxy.rlwy.net:15913`
- **Charset:** `utf8mb4`
- **Total de tabelas:** 33

---

## Como iniciar em desenvolvimento

Terminal 1 — Backend:
```bash
cd api
npm install
npm run dev
```

Terminal 2 — Frontend:
```bash
cd web
npm install
npm run dev
```

- API local: `http://localhost:3000`
- Frontend local: `http://localhost:5173`

---

## Base de dados

- Schema local para consulta: `api/database/schema.sql`.
- Ligação configurada via `api/.env`.
- **Rotina obrigatória:** antes de criar/alterar queries SQL, endpoints que leem/escrevem na BD, CRUDs, dashboards, gráficos ou designs que dependam de dados reais, consultar primeiro `api/database/schema.sql` para confirmar nomes de tabelas, colunas, chaves estrangeiras, tipos e relações.
- Se houver dúvida entre o código e o schema, validar o schema local primeiro e só depois recorrer à ligação Railway quando for mesmo necessário testar dados reais.
- A BD real no Railway tem colunas usadas pelo código atual, incluindo `url_slug`, `ultimo_login`, `totp_secret` e `totp_ativo`.
- Evitar commitar ficheiros `.env` com credenciais reais.

### Tabelas principais

| Tabela | Propósito |
|---|---|
| `utilizador` | Contas de utilizador (perfil, password_hash, totp_secret) |
| `utilizador_perfil` | Mapeamento utilizador → perfil |
| `learning_path` | Nível de topo da hierarquia |
| `service_line` | Departamento/equipa (ref. learning_path) |
| `area` | Sub-área (ref. service_line) |
| `nivel` | Nível de proficiência A–E (ref. area) |
| `badge` | Badge/certificação (ref. nivel) |
| `requisito` | Requisito genérico com tipo de evidência |
| `badge_requisito` | Associação badge ↔ requisito (ordem, obrigatorio) |
| `candidatura_badge` | Candidatura de um consultor a um badge |
| `evidencia` | Ficheiro de evidência carregado (ref. candidatura, requisito) |
| `avaliacao_candidatura` | Registo de avaliação (Talent Manager ou Service Line) |
| `historico_candidatura` | Auditoria de transições de estado |
| `badge_atribuido` | Badge emitido (token_publico, codigo_publico) |
| `certificado` | Certificado PDF associado a badge atribuído |
| `notificacao` | Notificações internas por utilizador |
| `preferencia_notificacao` | Preferências de notificação por utilizador |
| `consentimento_rgpd` | Registo de consentimento RGPD |
| `politica_rgpd` | Políticas RGPD versionadas/configuráveis pelo admin |
| `sla_config` | Regras de SLA por fase (TALENT_REVIEW, SERVICE_LINE_REVIEW) |
| `conquista_especial` | Conquistas especiais com critérios e pontos |
| `evento_especial` | Eventos especiais com prazo e badge associado |
| `lembrete` | Lembretes pessoais do consultor |
| `timeline_objetivo` | Objetivos pessoais do consultor |
| `aviso_informacao` | Avisos/comunicados (INFO/AVISO/PEDIDO) |
| `consultor_area` | Associação consultor ↔ área |
| `service_line_responsavel` | Responsável de Service Line |
| `template_assinatura_email` | Templates de assinatura de email |
| `config_notificacao` | Configuração global de notificações (toggles de eventos + canais; linha única) |

---

## Hierarquia de badges

- Documento guia: `docs/hierarquia-badges-softinsa.md`.
- **Rotina obrigatória:** antes de implementar CRUDs, dashboards, filtros, dropdowns ou validações de Learning Paths, Service Lines, Áreas, Níveis, Requisitos, Badges, Candidaturas ou Evidências, consultar `docs/hierarquia-badges-softinsa.md` e depois confirmar colunas/relações em `api/database/schema.sql`.
- Regra funcional: `Learning Path → Service Line → Área → Nível → Badge → Requisitos`.
- O admin não pode criar entidades filhas sem a entidade-pai existir.
- Os requisitos de um Badge vêm de `badge_requisito` — não diretamente de `requisito.id_nivel`.

---

## Perfis de utilizador

| Perfil | Responsabilidades |
|---|---|
| `Consultor` | Submete candidaturas a badges, carrega evidências, acompanha estado |
| `Talent Manager` | Valida evidências e encaminha para Service Line |
| `Service Line` | Faz a validação final e aprova/rejeita candidaturas |
| `Administrador` | Gere plataforma, utilizadores, badges, hierarquia, SLA, avisos e configurações |

---

## Autenticação e conta admin

Autenticação JWT implementada.

Fluxos existentes:
- Registo público (apenas Consultor, Talent Manager, Service Line).
- Confirmação de email.
- Completar perfil.
- Login com opção "Guardar login" (localStorage vs sessionStorage).
- Recuperação e redefinição de password por email.
- Alteração obrigatória de password no primeiro login.
- Verificação 2FA/TOTP (backend pronto, frontend a implementar).
- Rota `GET /api/auth/eu`.

Para criar/bootstrap do primeiro admin:
```bash
cd api
npm run admin:create -- "Nome" "email@dominio.pt" "PasswordTemporaria123"
# ou com reset explícito:
node scripts/criar-admin.js --reset-password "Nome" "email@dominio.pt" "PasswordTemporaria123"
```

---

## Workflow de candidatura

```
OPEN → SUBMITTED → IN_TALENT_REVIEW → IN_SERVICE_LINE_REVIEW → APPROVED / REJECTED
                                    ↘ SENT_BACK (devolvido ao consultor)
                                    ↘ CLOSED
```

Todas as transições registam auditoria em `historico_candidatura` e/ou `avaliacao_candidatura`.

---

## Estado de implementação

### Completo (backend + frontend)

- Auth: login, registo, confirmação email, completar perfil, recuperar/redefinir password, primeiro login.
- Gestão de utilizadores pelo admin (listar, filtrar, criar, editar, ativar/desativar, repor password, exportar).
- CRUD completo: Learning Paths, Service Lines, Áreas, Níveis.
- CRUD de Badges (falta upload real de imagem).
- CRUD de Requisitos e associação `badge_requisito`.
- CRUD de Eventos Especiais (falta upload de imagem e CRUD completo de requisitos especiais).
- Candidaturas: criar, submeter, cancelar, evidências, avaliação Talent Manager, avaliação Service Line.
- Badges atribuídos: emissão, partilha pública, QR code, certificado, LinkedIn, assinatura de email.
- Dashboard admin: KPIs, gráficos, pedidos recentes, controlo SLA, avisos, auditoria.
- Estatísticas: gestor, ranking, consultor.
- Notificações internas: listar, marcar lida, arquivar.
- Conquistas/gamificação: consultor e global.
- Exportação CSV/PDF nos CRUDs de Utilizadores, Learning Paths, Service Lines, Áreas, Níveis, Eventos Especiais, Requisitos.

### Concluído recentemente (admin) — rev. 2026-06-17

- Gestão de Avisos (CRUD), Gestão de SLA (config + notificar equipa por email), Gestão de Candidaturas (filtros/detalhe/avaliação/auditoria).
- Configuração de Notificações global (`config_notificacao`: 6 toggles + 3 canais) **ligada ao envio real** de emails/notificações (authController, candidaturasController, slaController via `utils/configNotificacao.js`).
- Perfil do Admin (`/admin/perfil`) com UI de 2FA ativar/desativar (modais partilhados em `components/PerfilSeguranca.jsx`).
- Relatórios e Exportações (`/admin/relatorios`): hub Excel/PDF para 11 entidades, incl. Badges, SLA e Candidaturas (via `lib/exportar.js`).
- Configuração de políticas RGPD (`/admin/rgpd`) com tabela `politica_rgpd`, endpoints `GET/POST/PUT/DELETE /api/rgpd/politicas` e modal do consultor ligado à política ativa.

### Parcial / em aberto

| Funcionalidade | Estado | Em falta no frontend |
|---|---|---|
| Lembretes | `[~]` | UI para consultor gerir lembretes pessoais |
| Timeline/Objetivos | `[~]` | UI para consultor gerir objetivos |
| Templates de email | `[~]` | Ecrã admin para gerir templates |
| Requisitos especiais de Eventos | `[~]` | Criação/edição completa de requisitos especiais no modal de Eventos |

### Não implementado

- Notificações push/browser push reais (existe notificação interna na plataforma).

---

## Dashboard de administrador

O admin tem uma experiência própria em `/admin`, separada do layout normal da app (shell própria de backoffice).

Inclui:
- Sidebar de backoffice com navegação por módulo.
- Topbar com saudação, idioma, notificações e perfil.
- KPIs gerais, gráficos (badges por Learning Path, nível, evolução mensal).
- Controlo SLA, gamificação global, pedidos recentes, avisos, bloco de auditoria.

Endpoints usados pelo dashboard:
- `GET /api/estatisticas/gestor`
- `GET /api/estatisticas/ranking`
- `GET /api/candidaturas`
- `GET /api/sla`
- `GET /api/sla/fora-prazo`
- `GET /api/avisos/todos`

Administradores são redirecionados automaticamente para `/admin` após login e quando acedem a `/`.

---

## Endpoints da API (resumo)

| Grupo | Prefixo | Notas |
|---|---|---|
| Auth | `/api/auth` | Registo, login, JWT, 2FA, password |
| Utilizadores | `/api/utilizadores` | CRUD admin + perfis |
| Learning Paths | `/api/learning-paths` | CRUD (admin) |
| Service Lines | `/api/service-lines` | CRUD (admin) |
| Áreas | `/api/areas` | CRUD (admin) |
| Níveis | `/api/niveis` | CRUD (admin) |
| Badges | `/api/badges` | CRUD (admin) + listagem pública |
| Requisitos | `/api/requisitos` | CRUD (admin) + badge_requisito |
| Candidaturas | `/api/candidaturas` | Fluxo completo + avaliações |
| Badges Atribuídos | `/api/badges-atribuidos` | Emissão, partilha, QR |
| Notificações | `/api/notificacoes` | Listar, marcar lida, arquivar |
| Estatísticas | `/api/estatisticas` | gestor, ranking, consultor |
| SLA | `/api/sla` | Config + fora de prazo |
| Avisos | `/api/avisos` | CRUD + listar ativos |
| Conquistas | `/api/conquistas` | Listagem + detalhe |
| Eventos Especiais | `/api/eventos` | CRUD (admin) |
| Preferências | `/api/preferencias` | Notificações por utilizador |
| Config Notificações | `/api/config-notificacao` | Config global de notificações (admin) + envio de teste |
| Lembretes | `/api/lembretes` | CRUD por consultor |
| Timeline | `/api/timeline` | CRUD objetivos por consultor |
| RGPD | `/api/rgpd` | Consentimentos + políticas RGPD versionadas |
| TOTP | `/api/totp` | 2FA setup e verificação |
| Ficheiros | `/api/ficheiros` | Gestão de uploads |
| Público | `/publico` | Verificação de badges sem autenticação |

---

## Upload de ficheiros

- Directório: `api/uploads/`
- Servido via: `/uploads/` (rota estática Express)
- Tamanho máximo: 10 MB (configurável via `MAX_FILE_SIZE_MB` em `.env`)
- Middleware: `api/src/middleware/upload.js` (multer)

---

## Convenções

- Código e mensagens em português.
- Respostas da API sempre em JSON.
- Erros: `{ "erro": "mensagem" }`.
- Sucesso: `{ "mensagem": "texto", ...dados }`.
- Preferir reutilizar controladores/rotas existentes antes de criar novos endpoints.
- Manter frontend ligado a dados reais da API, sem mock data permanente.
- Ao criar ecrãs admin, seguir a cadeia Learning Path → Service Line → Área → Nível → Badge para dropdowns e validações.

---

## Notas técnicas

- Cancelar candidatura usa `DELETE /api/candidaturas/:id`.
- Notificações usam `POST /api/notificacoes/:id/ler` e `POST /api/notificacoes/ler-todas`.
- Query de estatísticas corrigida para compatibilidade com `ONLY_FULL_GROUP_BY` no MySQL.
- A área `/admin` bypassa o layout normal para usar uma shell própria de backoffice.
- A fonte funcional para requisitos de um badge é `badge_requisito`, não `requisito.id_nivel`.
- Exportação atual: CSV (Excel) implementado como CSV; PDF usa impressão de tabela em janela.
