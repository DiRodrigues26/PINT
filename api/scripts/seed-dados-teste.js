require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const crypto = require('crypto');
const mysql = require('mysql2/promise');

const VARS_BD_OBRIGATORIAS = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

const NIVEIS = [
  { codigo: 'A', nome: 'Júnior', ordem: 1, pontos: 100 },
  { codigo: 'B', nome: 'Intermédio', ordem: 2, pontos: 200 },
  { codigo: 'C', nome: 'Sénior', ordem: 3, pontos: 350 },
  { codigo: 'D', nome: 'Especialista', ordem: 4, pontos: 500 },
  { codigo: 'E', nome: 'Líder de Conhecimento', ordem: 5, pontos: 750 },
];

const TIPOS_EVIDENCIA = ['Certificado', 'Curso', 'Documento'];

function obterVariaveisEmFalta() {
  return VARS_BD_OBRIGATORIAS.filter((nome) => !process.env[nome]);
}

async function contar(conn, tabela) {
  const [[row]] = await conn.query(`SELECT COUNT(*) AS total FROM ${tabela}`);
  return Number(row.total || 0);
}

async function obterAdmin(conn) {
  const [rows] = await conn.query(
    `SELECT u.id_utilizador
       FROM utilizador u
       JOIN utilizador_perfil up ON up.id_utilizador = u.id_utilizador
       JOIN perfil p ON p.id_perfil = up.id_perfil
      WHERE p.nome_perfil = 'Administrador'
      ORDER BY u.id_utilizador
      LIMIT 1`
  );
  return rows[0]?.id_utilizador || null;
}

async function obterUtilizadoresPorPerfil(conn, perfil) {
  const [rows] = await conn.query(
    `SELECT u.id_utilizador, u.nome, u.email
       FROM utilizador u
       JOIN utilizador_perfil up ON up.id_utilizador = u.id_utilizador
       JOIN perfil p ON p.id_perfil = up.id_perfil
      WHERE p.nome_perfil = ? AND u.ativo = 1
      ORDER BY u.id_utilizador`,
    [perfil]
  );
  return rows;
}

async function obterOuCriarNivel(conn, area, nivel, resumo) {
  const [existentes] = await conn.query(
    'SELECT id_nivel FROM nivel WHERE id_area = ? AND codigo_nivel = ? LIMIT 1',
    [area.id_area, nivel.codigo]
  );
  if (existentes.length > 0) return existentes[0].id_nivel;

  const [result] = await conn.query(
    `INSERT INTO nivel (id_area, codigo_nivel, nome_nivel, ordem, descricao, ativo)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [
      area.id_area,
      nivel.codigo,
      nivel.nome,
      nivel.ordem,
      `${nivel.nome} na área ${area.nome}.`,
    ]
  );
  resumo.niveis_criados += 1;
  return result.insertId;
}

async function obterOuCriarRequisito(conn, idNivel, nivel, idx, area, resumo) {
  const codigo = `${nivel.codigo}${idx}`;
  const [existentes] = await conn.query(
    'SELECT id_requisito FROM requisito WHERE id_nivel = ? AND codigo_requisito = ? LIMIT 1',
    [idNivel, codigo]
  );
  if (existentes.length > 0) return existentes[0].id_requisito;

  const tipo = TIPOS_EVIDENCIA[(idx - 1) % TIPOS_EVIDENCIA.length];
  const [result] = await conn.query(
    `INSERT INTO requisito
       (id_nivel, codigo_requisito, titulo, descricao, tipo_evidencia, imagem_url, ordem, obrigatorio, ativo)
     VALUES (?, ?, ?, ?, ?, NULL, ?, 1, 1)`,
    [
      idNivel,
      codigo,
      `${codigo} - Evidência ${tipo} ${area.nome}`,
      `Submeter evidência de ${tipo.toLowerCase()} para o requisito ${codigo} da área ${area.nome}.`,
      tipo,
      idx,
    ]
  );
  resumo.requisitos_criados += 1;
  return result.insertId;
}

async function obterOuCriarBadge(conn, idNivel, nivel, area, resumo) {
  const [existentes] = await conn.query(
    'SELECT id_badge FROM badge WHERE id_nivel = ? LIMIT 1',
    [idNivel]
  );
  if (existentes.length > 0) return existentes[0].id_badge;

  const [result] = await conn.query(
    `INSERT INTO badge
       (id_nivel, titulo, descricao, imagem_url, pontos, tem_expiracao, validade_dias,
        intervalo_temporal_obtencao, is_conquista_especial, beneficios,
        competencias_certificadas, sobre_certificacao, ativo)
     VALUES (?, ?, ?, NULL, ?, 0, NULL, NULL, 0, ?, ?, ?, 1)`,
    [
      idNivel,
      `Badge ${nivel.nome} em ${area.nome}`,
      `Badge atribuído após validação dos requisitos do nível ${nivel.codigo} em ${area.nome}.`,
      nivel.pontos,
      `Reconhecimento interno do nível ${nivel.nome}.`,
      area.nome,
      `Certificação de competências para ${area.nome}.`,
    ]
  );
  resumo.badges_criados += 1;
  return result.insertId;
}

async function associarBadgeRequisito(conn, idBadge, idRequisito, ordem, resumo) {
  const [result] = await conn.query(
    `INSERT IGNORE INTO badge_requisito (id_badge, id_requisito, ordem, obrigatorio)
     VALUES (?, ?, ?, 1)`,
    [idBadge, idRequisito, ordem]
  );
  if (result.affectedRows > 0) resumo.badge_requisitos_criados += 1;
}

async function criarAvisosSeVazio(conn, idAdmin, resumo) {
  if (!idAdmin || await contar(conn, 'aviso_informacao') > 0) return;

  const avisos = [
    ['Novos badges disponíveis', 'Já estão disponíveis badges de teste para a Jornada Técnica.', 'AVISO'],
    ['Atualização de requisitos', 'Os requisitos de teste foram carregados para validação do workflow.', 'INFORMACAO'],
    ['Manutenção programada', 'Ambiente de testes pode sofrer alterações durante desenvolvimento.', 'AVISO'],
  ];

  for (const [titulo, conteudo, tipo] of avisos) {
    await conn.query(
      `INSERT INTO aviso_informacao (id_criador, titulo, conteudo, tipo, ativo, data_inicio)
       VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
      [idAdmin, titulo, conteudo, tipo]
    );
    resumo.avisos_criados += 1;
  }
}

async function criarConquistasSeVazio(conn, resumo) {
  if (await contar(conn, 'conquista_especial') > 0) return;

  const conquistas = [
    ['Primeiros 3 badges', 'Conquista atribuída ao obter 3 badges.', 'BADGES_TOTAL', 3, 50],
    ['Especialista da área', 'Conquista atribuída ao completar badges de uma área.', 'BADGES_AREA', 5, 100],
    ['Mil pontos', 'Conquista atribuída ao atingir 1000 pontos.', 'PONTOS', 1000, 150],
  ];

  for (const [nome, descricao, tipo, valor, pontos] of conquistas) {
    await conn.query(
      `INSERT INTO conquista_especial
         (nome, descricao, criterio, tipo_criterio, valor_objetivo, pontos_bonus, ativo)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [nome, descricao, descricao, tipo, valor, pontos]
    );
    resumo.conquistas_criadas += 1;
  }
}

async function criarEventoEspecialSeVazio(conn, resumo) {
  if (await contar(conn, 'evento_especial') > 0) return;

  const [niveis] = await conn.query(
    `SELECT n.id_nivel, b.id_badge
       FROM nivel n
       LEFT JOIN badge b ON b.id_nivel = n.id_nivel
      WHERE n.codigo_nivel = 'A'
      ORDER BY n.id_nivel
      LIMIT 1`
  );
  if (niveis.length === 0) return;

  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() + 90);

  const [result] = await conn.query(
    `INSERT INTO evento_especial (id_nivel, id_badge, titulo, descricao, data_limite, ativo)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [
      niveis[0].id_nivel,
      niveis[0].id_badge || null,
      'Semana de Cibersegurança',
      'Evento especial de teste para validar requisitos e badge especial.',
      dataLimite,
    ]
  );
  resumo.eventos_criados += 1;

  const requisitos = [
    ['Obter 5 badges em 1 semana', '5 badges em 1 semana'],
    ['Completar curso cibersegurança', 'Comprovativo de conclusão de curso temporário de cibersegurança'],
  ];

  for (const [idx, [titulo, descricao]] of requisitos.entries()) {
    await conn.query(
      `INSERT INTO evento_especial_requisito (id_evento, titulo, descricao, ordem)
       VALUES (?, ?, ?, ?)`,
      [result.insertId, titulo, descricao, idx + 1]
    );
    resumo.evento_requisitos_criados += 1;
  }
}

async function criarPreferenciasEmFalta(conn, resumo) {
  const [users] = await conn.query('SELECT id_utilizador FROM utilizador');
  for (const user of users) {
    const [result] = await conn.query(
      'INSERT IGNORE INTO preferencia_notificacao (id_utilizador) VALUES (?)',
      [user.id_utilizador]
    );
    if (result.affectedRows > 0) resumo.preferencias_criadas += 1;
  }
}

async function obterBadgesComContexto(conn, limite = 12) {
  const [badges] = await conn.query(
    `SELECT b.id_badge, b.titulo, b.tem_expiracao, b.validade_dias,
            n.id_nivel, n.codigo_nivel, a.id_area, a.nome AS nome_area,
            sl.id_service_line, sl.nome AS nome_service_line,
            lp.id_learning_path, lp.nome AS nome_learning_path
       FROM badge b
       JOIN nivel n ON n.id_nivel = b.id_nivel
       JOIN area a ON a.id_area = n.id_area
       JOIN service_line sl ON sl.id_service_line = a.id_service_line
       JOIN learning_path lp ON lp.id_learning_path = sl.id_learning_path
      WHERE b.ativo = 1
      ORDER BY a.id_area, n.ordem
      LIMIT ?`,
    [limite]
  );
  return badges;
}

async function criarEvidenciasParaBadge(conn, idCandidatura, idBadge, resumo) {
  const [requisitos] = await conn.query(
    `SELECT r.id_requisito, r.titulo
       FROM badge_requisito br
       JOIN requisito r ON r.id_requisito = br.id_requisito
      WHERE br.id_badge = ?
      ORDER BY br.ordem, r.ordem
      LIMIT 3`,
    [idBadge]
  );

  for (const requisito of requisitos) {
    await conn.query(
      `INSERT INTO evidencia
         (id_candidatura, id_requisito, ficheiro_url, nome_ficheiro, tipo_ficheiro, descricao)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        idCandidatura,
        requisito.id_requisito,
        `/uploads/evidencias/teste-${idCandidatura}-${requisito.id_requisito}.pdf`,
        `evidencia-${idCandidatura}-${requisito.id_requisito}.pdf`,
        'application/pdf',
        `Evidência de teste para ${requisito.titulo}.`,
      ]
    );
    resumo.evidencias_criadas += 1;
  }
}

async function inserirHistorico(conn, idCandidatura, idResponsavel, estadoOrigem, estadoDestino, acao, diasAtras) {
  await conn.query(
    `INSERT INTO historico_candidatura
       (id_candidatura, id_utilizador_responsavel, estado_origem, estado_destino, acao, comentario, data_evento)
     VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY))`,
    [
      idCandidatura,
      idResponsavel,
      estadoOrigem,
      estadoDestino,
      acao,
      'Registo de teste criado pelo seed.',
      diasAtras,
    ]
  );
}

async function criarCandidaturasDashboardSeVazio(conn, idAdmin, resumo) {
  if (await contar(conn, 'candidatura_badge') > 0) return;

  const consultores = await obterUtilizadoresPorPerfil(conn, 'Consultor');
  const talentManagers = await obterUtilizadoresPorPerfil(conn, 'Talent Manager');
  const serviceLines = await obterUtilizadoresPorPerfil(conn, 'Service Line');
  const responsavelTalent = talentManagers[0]?.id_utilizador || idAdmin;
  const responsavelServiceLine = serviceLines[0]?.id_utilizador || idAdmin;
  const badges = await obterBadgesComContexto(conn, 14);

  if (!idAdmin || consultores.length === 0 || badges.length === 0) return;

  const cenariosRecentes = [
    { estado: 'IN_SERVICE_LINE_REVIEW', dias: 1, submetida: true },
    { estado: 'SUBMITTED', dias: 2, submetida: true },
    { estado: 'OPEN', dias: 3, submetida: false },
    { estado: 'APPROVED', dias: 4, submetida: true },
    { estado: 'IN_TALENT_REVIEW', dias: 5, submetida: true },
  ];

  for (const [idx, cenario] of cenariosRecentes.entries()) {
    const consultor = consultores[idx % consultores.length];
    const badge = badges[idx % badges.length];
    const dataFechoSql = ['APPROVED', 'REJECTED', 'CLOSED'].includes(cenario.estado)
      ? 'DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY)'
      : 'NULL';
    const params = [
      consultor.id_utilizador,
      badge.id_badge,
      cenario.estado,
      cenario.dias + 1,
    ];
    if (cenario.submetida) params.push(cenario.dias);
    if (dataFechoSql !== 'NULL') params.push(Math.max(cenario.dias - 1, 0));
    params.push('Candidatura de teste para validar dashboard admin.');

    const [result] = await conn.query(
      `INSERT INTO candidatura_badge
         (id_consultor, id_badge, estado_atual, data_abertura, data_submissao, data_fecho, observacoes_consultor)
       VALUES (?, ?, ?, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY), ${cenario.submetida ? 'DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY)' : 'NULL'}, ${dataFechoSql}, ?)`,
      params
    );

    resumo.candidaturas_criadas += 1;
    await inserirHistorico(conn, result.insertId, consultor.id_utilizador, '-', 'OPEN', 'CRIACAO', cenario.dias + 1);

    if (cenario.submetida) {
      await criarEvidenciasParaBadge(conn, result.insertId, badge.id_badge, resumo);
      await inserirHistorico(conn, result.insertId, consultor.id_utilizador, 'OPEN', 'SUBMITTED', 'SUBMISSAO', cenario.dias);
    }

    if (['IN_TALENT_REVIEW', 'IN_SERVICE_LINE_REVIEW', 'APPROVED'].includes(cenario.estado)) {
      await inserirHistorico(conn, result.insertId, responsavelTalent, 'SUBMITTED', 'IN_TALENT_REVIEW', 'INICIO_REVISAO_TALENT', cenario.dias);
    }

    if (['IN_SERVICE_LINE_REVIEW', 'APPROVED'].includes(cenario.estado)) {
      await inserirHistorico(conn, result.insertId, responsavelTalent, 'IN_TALENT_REVIEW', 'IN_SERVICE_LINE_REVIEW', 'TALENT_CORRETO', Math.max(cenario.dias - 1, 0));
    }

    if (cenario.estado === 'APPROVED') {
      await inserirHistorico(conn, result.insertId, responsavelServiceLine, 'IN_SERVICE_LINE_REVIEW', 'APPROVED', 'SERVICE_LINE_APROVAR', Math.max(cenario.dias - 1, 0));
      const token = crypto.randomBytes(24).toString('hex');
      const expiraSql = badge.tem_expiracao && badge.validade_dias ? 'DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY)' : 'NULL';
      const badgeParams = [
        consultor.id_utilizador,
        badge.id_badge,
        result.insertId,
      ];
      if (expiraSql !== 'NULL') badgeParams.push(badge.validade_dias);
      badgeParams.push(token, `SB-${result.insertId}`);

      await conn.query(
        `INSERT INTO badge_atribuido
           (id_consultor, id_badge, id_candidatura, data_expiracao, publicado, token_publico, codigo_publico, url_publica)
         VALUES (?, ?, ?, ${expiraSql}, 1, ?, ?, CONCAT('/publico/badges/', ?))`,
        [...badgeParams, token]
      );
      resumo.badges_atribuidos_criados += 1;
    }
  }

  const badgesExtra = badges.slice(5, 14);
  for (const [idx, badge] of badgesExtra.entries()) {
    const consultor = consultores[idx % consultores.length];
    const dias = 20 + idx * 9;
    const [result] = await conn.query(
      `INSERT INTO candidatura_badge
         (id_consultor, id_badge, estado_atual, data_abertura, data_submissao, data_fecho, observacoes_consultor)
       VALUES (?, ?, 'APPROVED',
               DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY),
               DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY),
               DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY),
               'Candidatura aprovada de teste para estatísticas.')`,
      [consultor.id_utilizador, badge.id_badge, dias + 2, dias + 1, dias]
    );

    resumo.candidaturas_criadas += 1;
    await criarEvidenciasParaBadge(conn, result.insertId, badge.id_badge, resumo);
    await inserirHistorico(conn, result.insertId, consultor.id_utilizador, '-', 'OPEN', 'CRIACAO', dias + 2);
    await inserirHistorico(conn, result.insertId, consultor.id_utilizador, 'OPEN', 'SUBMITTED', 'SUBMISSAO', dias + 1);
    await inserirHistorico(conn, result.insertId, responsavelTalent, 'SUBMITTED', 'IN_SERVICE_LINE_REVIEW', 'TALENT_CORRETO', dias);
    await inserirHistorico(conn, result.insertId, responsavelServiceLine, 'IN_SERVICE_LINE_REVIEW', 'APPROVED', 'SERVICE_LINE_APROVAR', dias);

    const token = crypto.randomBytes(24).toString('hex');
    const expiraSql = badge.tem_expiracao && badge.validade_dias ? 'DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY)' : 'NULL';
    const badgeParams = [consultor.id_utilizador, badge.id_badge, result.insertId];
    if (expiraSql !== 'NULL') badgeParams.push(badge.validade_dias);
    badgeParams.push(token, `SB-${result.insertId}`);

    await conn.query(
      `INSERT INTO badge_atribuido
         (id_consultor, id_badge, id_candidatura, data_atribuicao, data_expiracao, publicado, token_publico, codigo_publico, url_publica)
       VALUES (?, ?, ?, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY), ${expiraSql}, 1, ?, ?, CONCAT('/publico/badges/', ?))`,
      [...badgeParams.slice(0, 3), dias, ...badgeParams.slice(3), token]
    );
    resumo.badges_atribuidos_criados += 1;
  }
}

async function atribuirConquistasSeVazio(conn, resumo) {
  if (await contar(conn, 'utilizador_conquista') > 0) return;

  const consultores = await obterUtilizadoresPorPerfil(conn, 'Consultor');
  const [conquistas] = await conn.query('SELECT id_conquista FROM conquista_especial WHERE ativo = 1 ORDER BY id_conquista LIMIT 3');
  if (consultores.length === 0 || conquistas.length === 0) return;

  for (const [idx, conquista] of conquistas.entries()) {
    const consultor = consultores[idx % consultores.length];
    const [result] = await conn.query(
      'INSERT IGNORE INTO utilizador_conquista (id_utilizador, id_conquista) VALUES (?, ?)',
      [consultor.id_utilizador, conquista.id_conquista]
    );
    if (result.affectedRows > 0) resumo.conquistas_atribuidas_criadas += 1;
  }
}

async function main() {
  const varsEmFalta = obterVariaveisEmFalta();
  if (varsEmFalta.length > 0) {
    throw new Error(`Variaveis em falta no .env: ${varsEmFalta.join(', ')}`);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
  });

  const resumo = {
    niveis_criados: 0,
    requisitos_criados: 0,
    badges_criados: 0,
    badge_requisitos_criados: 0,
    avisos_criados: 0,
    conquistas_criadas: 0,
    eventos_criados: 0,
    evento_requisitos_criados: 0,
    preferencias_criadas: 0,
    candidaturas_criadas: 0,
    evidencias_criadas: 0,
    badges_atribuidos_criados: 0,
    conquistas_atribuidas_criadas: 0,
  };

  await conn.beginTransaction();

  try {
    const [areas] = await conn.query(
      `SELECT a.id_area, a.nome, sl.nome AS nome_service_line, lp.nome AS nome_learning_path
         FROM area a
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         JOIN learning_path lp ON lp.id_learning_path = sl.id_learning_path
        WHERE a.ativo = 1
        ORDER BY lp.nome, sl.nome, a.nome`
    );

    for (const area of areas) {
      for (const nivel of NIVEIS) {
        const idNivel = await obterOuCriarNivel(conn, area, nivel, resumo);
        const requisitos = [];

        for (let idx = 1; idx <= 3; idx += 1) {
          requisitos.push(await obterOuCriarRequisito(conn, idNivel, nivel, idx, area, resumo));
        }

        const idBadge = await obterOuCriarBadge(conn, idNivel, nivel, area, resumo);
        for (const [idx, idRequisito] of requisitos.entries()) {
          await associarBadgeRequisito(conn, idBadge, idRequisito, idx + 1, resumo);
        }
      }
    }

    await criarPreferenciasEmFalta(conn, resumo);
    await criarAvisosSeVazio(conn, await obterAdmin(conn), resumo);
    await criarConquistasSeVazio(conn, resumo);
    await criarEventoEspecialSeVazio(conn, resumo);
    await criarCandidaturasDashboardSeVazio(conn, await obterAdmin(conn), resumo);
    await atribuirConquistasSeVazio(conn, resumo);

    await conn.commit();

    const contagens = {};
    for (const tabela of ['learning_path', 'service_line', 'area', 'nivel', 'requisito', 'badge', 'badge_requisito', 'candidatura_badge', 'historico_candidatura', 'evidencia', 'badge_atribuido', 'aviso_informacao', 'evento_especial', 'conquista_especial', 'utilizador_conquista']) {
      contagens[tabela] = await contar(conn, tabela);
    }

    console.log(JSON.stringify({ ok: true, resumo, contagens }, null, 2));
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
