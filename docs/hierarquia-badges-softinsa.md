# Hierarquia de Badges Softinsa

Este documento guia a implementacao de CRUDs, dashboards, queries SQL e ecras que dependam da estrutura de badges.

## Estrutura Funcional

```txt
Learning Path
  -> Service Line
    -> Area
      -> Nivel
        -> Requisitos
      -> Badge do nivel
```

## Estrutura do Projeto PINT

Neste projeto, o Learning Path ativo para desenvolvimento e demonstracao e:

```txt
Jornada Tecnica
```

A base de dados deve continuar preparada para adicionar outros Learning Paths no futuro, incluindo o caso real da Softinsa:

```txt
Power Skills
```

## Exemplo de Hierarquia

```txt
Jornada Tecnica
  -> Hybrid Cloud
    -> LowCode / Outsystems
      -> A - Nivel Junior
        -> A1, A2, A3, ..., An
        -> Badge Junior em Outsystems
      -> B - Nivel Intermedio
        -> B1, B2, B3, ..., Bn
        -> Badge Intermedio em Outsystems
      -> C - Nivel Senior
      -> D - Nivel Especialista
      -> E - Nivel Lider de Conhecimento

  -> Application Operations
    -> DevSecOps & IT Automation / DevOps
      -> A, B, C, D, E

  -> Sourcing & Talent Management
    -> Sourcing & Talent Management / Talent Management
      -> A, B, C, D, E
```

## Regras de Negocio

- Um Learning Path pode conter varias Service Lines.
- Uma Service Line pode conter varias Areas.
- Uma Area contem varios Niveis.
- Cada Nivel contem varios Requisitos.
- Cada Nivel deve ter um Badge associado.
- Para obter um Badge de um Nivel, o consultor tem de cumprir/evidenciar todos os Requisitos desse Nivel.
- O consultor pode candidatar-se diretamente a qualquer Nivel, mesmo sem possuir badges dos niveis anteriores.
- Um Badge pode ter, ou nao, regras temporais/validade. Esta regra nao e obrigatoria.
- Cada Requisito deve poder ser representado como um card com titulo, descricao e imagem.
- A descricao do Requisito deve explicar as evidencias necessarias.

## Mapeamento Atual da Base de Dados

Consultar sempre `api/database/schema.sql` antes de alterar queries ou ecras dependentes de dados.

Tabelas principais:

- `learning_path`
- `service_line` com `id_learning_path`
- `area` com `id_service_line`
- `nivel` com `id_area`
- `requisito` com `id_nivel`, `codigo_requisito`, `titulo`, `descricao`, `imagem_url`
- `badge` com `id_nivel`, `titulo`, `descricao`, `imagem_url`, `tem_expiracao`, `validade_dias`
- `candidatura_badge` com `id_badge`
- `evidencia` com `id_requisito`

## Ordem Recomendada de Implementacao no Admin

1. Learning Paths
2. Service Lines
3. Areas
4. Niveis
5. Requisitos
6. Badges
7. Candidaturas/Aprovacoes

Ao criar ou editar um ecran administrativo, respeitar esta cadeia de dependencia para preencher dropdowns, filtros e validacoes.
