# PINT — Plataforma de Badges Softinsa

## Contexto
Plataforma de badges digitais similar ao Credly.com para a empresa Softinsa.
Projeto académico (PINT 2025).

## Estrutura do repositório
- /api — Backend Node.js + Express + MySQL
- /web — Frontend React + Vite + Tailwind (ainda a criar)

## Stack
- Backend: Node.js, Express, MySQL2, JWT, Bcryptjs, Multer
- Frontend: React 18, Vite, Tailwind CSS, Axios, React Query
- Base de dados: MySQL (Railway)
- Deploy: Railway

## API
- URL produção: https://pint-production.up.railway.app
- URL local: http://localhost:3000

## Base de dados
- Host Railway: nozomi.proxy.rlwy.net:15913
- BD: softinsa_badges
- 29 tabelas criadas (ver /api/src/db/connection.js)

## Perfis de utilizador
- Consultor — submete candidaturas a badges
- Talent Manager — valida evidências
- Service Line — validação final dos badges
- Administrador — gere toda a plataforma

## Workflow de candidatura
OPEN → SUBMITTED → IN_SERVICE_LINE_REVIEW → APPROVED/REJECTED

## Estado atual
- BD online no Railway com todas as tabelas ✅
- API base online no Railway ✅
- Autenticação JWT ainda não implementada
- React ainda não criado

## Convenções
- Código em português (variáveis, comentários, mensagens de erro)
- Respostas da API sempre em JSON
- Erros no formato { "erro": "mensagem" }
- Sucesso no formato { "mensagem": "texto", ...dados }