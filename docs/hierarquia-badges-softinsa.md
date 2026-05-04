# Hierarquia de Badges Softinsa

Este documento guia a implementacao de CRUDs, dashboards, queries SQL e ecras que dependam da estrutura de badges.

## Estrutura Funcional

```txt
Learning Path
  -> Service Line
    -> Area
      -> Nivel
        -> Badge do nivel
          -> Requisitos
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
- Cada Nivel deve ter um Badge associado.
- Cada Badge contem varios Requisitos.
- Para obter um Badge de um Nivel, o consultor tem de cumprir/evidenciar todos os Requisitos associados ao Badge desse Nivel.
- O consultor pode candidatar-se diretamente a qualquer Nivel, mesmo sem possuir badges dos niveis anteriores.
- Um Badge pode ter, ou nao, regras temporais/validade. Esta regra nao e obrigatoria.
- Cada Requisito deve poder ser representado como um card com titulo, descricao e imagem.
- A descricao do Requisito deve explicar as evidencias necessarias.

## Regras de Criacao no Admin

- O Administrador so pode criar Service Lines se existir pelo menos um Learning Path.
- O Administrador so pode criar Areas se existir pelo menos uma Service Line.
- O Administrador so pode criar Niveis se existir pelo menos uma Area.
- O Administrador so pode criar Badges dentro de um Nivel. Nao existem Badges soltos.
- O Administrador cria e associa Requisitos no contexto de um Badge. Nao existem requisitos funcionais soltos no fluxo principal.
- Quando a entidade-pai obrigatoria nao existir, o frontend deve bloquear a abertura do formulario e apresentar uma mensagem de aviso clara.

## Mapeamento Atual da Base de Dados

Consultar sempre `api/database/schema.sql` antes de alterar queries ou ecras dependentes de dados.

Tabelas principais:

- `learning_path`
- `service_line` com `id_learning_path`
- `area` com `id_service_line`
- `nivel` com `id_area`
- `badge` com `id_nivel`, `titulo`, `descricao`, `imagem_url`, `tem_expiracao`, `validade_dias`
- `requisito` com dados base do requisito: `codigo_requisito`, `titulo`, `descricao`, `tipo_evidencia`, `imagem_url`
- `badge_requisito` associa cada Badge aos seus Requisitos, com `ordem` e `obrigatorio`
- `candidatura_badge` com `id_badge`
- `evidencia` com `id_requisito`

Nota: a tabela `requisito` pode manter `id_nivel` como compatibilidade tecnica, mas a fonte funcional para saber os requisitos de um Badge e `badge_requisito`. O backend deve consultar requisitos pelo Badge, nao diretamente pelo Nivel.

## Ordem Recomendada de Implementacao no Admin

1. Learning Paths
2. Service Lines
3. Areas
4. Niveis
5. Badges
6. Requisitos
7. Candidaturas/Aprovacoes

Ao criar ou editar um ecran administrativo, respeitar esta cadeia de dependencia para preencher dropdowns, filtros e validacoes.
