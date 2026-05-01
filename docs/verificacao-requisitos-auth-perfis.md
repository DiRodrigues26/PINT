# Verificacao de Requisitos - Auth e Perfis

Data de referencia: 2026-04-30

## Login

- [x] Formulario de login com campos obrigatorios `Email` e `Password`.
  - Frontend: `web/src/pages/auth/Login.jsx`
  - Backend: `POST /api/auth/login`

- [x] Validacao de campos vazios com identificacao visual a vermelho.
  - Email vazio fica vermelho.
  - Password vazia fica vermelha.

- [x] Validacao de email com formato invalido.
  - Email invalido fica vermelho antes de submeter ao backend.

- [x] Validacao de credenciais invalidas atraves dos servicos da plataforma.
  - Backend responde `401 Credenciais invalidas`.
  - Frontend marca email e password a vermelho e mostra mensagem.

- [x] Possibilidade de guardar login.
  - Se `Guardar login?` estiver ativo, o token fica em `localStorage`.
  - Se estiver inativo, o token fica em `sessionStorage` e termina ao fechar a sessao do browser.
  - O email guardado continua a preencher automaticamente o campo de email quando aplicavel.

## Recuperar Password

- [x] Acesso ao processo a partir da pagina de login.
  - Link: `Restaurar Password`

- [x] Formulario de recuperacao com campo obrigatorio `Email`.
  - Frontend: `web/src/pages/auth/RecuperarPassword.jsx`
  - Backend: `POST /api/auth/recuperar-password`

- [x] Validacao visual a vermelho para email vazio ou invalido.

- [x] Caso o email exista, o backend gera token e envia link de redefinicao.
  - Em desenvolvimento, sem SMTP configurado, o email aparece como `[EMAIL STUB]` no terminal.

- [x] Formulario de redefinicao com `Nova Password` e `Confirmar Password`.
  - Frontend: `web/src/pages/auth/NovaPassword.jsx`
  - Backend: `POST /api/auth/redefinir-password`

- [x] Validacao visual a vermelho para passwords vazias, curtas ou diferentes.

- [x] Mensagem final visivel: `A sua password foi redefinida com sucesso.`

- [x] Possibilidade de cancelar o processo.
  - `RecuperarPassword.jsx`: voltar ao login.
  - `NovaPassword.jsx`: cancelar e voltar ao login.

## Terminar Sessao

- [x] O utilizador visualiza a mensagem `Pretende terminar a sua sessao?`.
  - Implementado como popup/modal no admin, conforme decisao de UX do projeto.

- [x] Se confirmar, e feito logout.
  - Remove token de `localStorage` e `sessionStorage`.
  - Redireciona para `/login`.

- [x] Se cancelar, o modal fecha e a sessao continua ativa.

## Perfis de Utilizador

- [x] A plataforma suporta quatro perfis:
  - `Consultor`
  - `Administrador`
  - `Talent Manager`
  - `Service Line`

- [x] Backend valida permissao por perfil.
  - Middleware: `api/src/middleware/autorizar.js`

- [x] Admin pode criar utilizadores e atribuir os quatro perfis.
  - Frontend: `web/src/pages/admin/AdminUtilizadores.jsx`
  - Backend: `api/src/controllers/utilizadoresController.js`

- [x] Registo publico nao cria Administrador.
  - Backend limita registo publico a `Consultor`, `Service Line` e `Talent Manager`.
  - Administrador deve ser criado por bootstrap/script ou CRUD admin.
