# Plano de Acao - Admin, Auth e Feedback

Documento de trabalho para fechar a revisao critica ao admin, login/registo e feedback dos colegas.

## Fase 1 - Seguranca critica

- [x] Bloquear auto-registo como Talent Manager ou Service Line.
  - Registo publico deve permitir apenas Consultor.
  - Perfis operacionais devem ser criados pelo Administrador.
- [x] Forcar alteracao de password temporaria tambem no backend.
  - Utilizadores com `primeiro_login_pendente = 1` so podem chamar `/api/auth/eu` e `/api/auth/primeiro-login`.
  - Frontend deve redirecionar sempre para `/alterar-password-inicial`.
- [x] Proteger evidencias e historico de candidaturas por permissao real.
  - Consultor ve apenas as suas candidaturas.
  - Service Line ve apenas candidaturas da sua service line.
  - Talent Manager e Administrador mantem acesso global.
- [x] Restringir upload generico.
  - Upload admin apenas para Administrador.
  - Validar mimetype e extensao em conjunto.
  - Upload de imagem admin limitado a PNG, JPG, JPEG e WEBP.

## Fase 2 - Hardening de autenticacao

- [x] Adicionar rate limiting a login, registo, recuperacao de password e verificacao 2FA.
- [x] Exigir password atual ou codigo TOTP para desativar/trocar 2FA.
- [x] Validar password minima tambem na criacao admin de utilizadores.
- [x] Adicionar expiracao ao token de confirmacao de email/perfil.

## Fase 3 - Feedback dos colegas

- [x] Corrigir "Voltar ao login" no ecra de 2FA.
  - Deve limpar `preAuthToken`, codigo 2FA, erro, password e qualquer token local antigo.
- [x] Uniformizar componentes visuais entre perfis.
  - Notificacoes, headers, botoes, badges de estado e paginas de perfil devem partilhar componentes sempre que fizer sentido.
- [x] Uniformizar assinatura de email em mobile e desktop.
  - Criar preview/copia unica e responsiva para evitar divergencias.

## Fase 4 - Revisao final

- [x] Corrigir mudanca repetida de area no perfil do consultor.
- [x] Rever escopos globais de Service Line em estatisticas e badges atribuidos.
- [x] Executar testes locais de regressao:
  - Registo publico apenas Consultor.
  - Password temporaria bloqueia navegacao ate ser alterada.
  - Evidencias/historico nao ficam acessiveis por IDs externos.
  - Upload rejeita extensoes/mimetypes inconsistentes.
  - Fluxos admin principais continuam funcionais.
- [x] Executar build final depois da Fase 4.
  - `npm run build` validado; o Vite manteve apenas o aviso conhecido de chunk grande.
