const { pool } = require('../db/connection');
const { gerarTokenAleatorio, gerarCodigoPublico } = require('../utils/tokens');
const { notificarMudancaEstadoCandidatura } = require('../utils/email');

const ESTADOS = {
  OPEN: 'OPEN',
  SUBMITTED: 'SUBMITTED',
  IN_TALENT_REVIEW: 'IN_TALENT_REVIEW',
  IN_SERVICE_LINE_REVIEW: 'IN_SERVICE_LINE_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SENT_BACK: 'SENT_BACK',
  CLOSED: 'CLOSED',
};

async function registarHistorico(conn, { id_candidatura, id_utilizador, estado_origem, estado_destino, acao, comentario }) {
  await conn.query(
    `INSERT INTO historico_candidatura
       (id_candidatura, id_utilizador_responsavel, estado_origem, estado_destino, acao, comentario)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id_candidatura, id_utilizador, estado_origem, estado_destino, acao || null, comentario || null]
  );
}

async function criarNotificacao(conn, { id_utilizador, tipo, categoria, titulo, mensagem, entidade_relacionada }) {
  await conn.query(
    `INSERT INTO notificacao (id_utilizador, tipo, categoria, titulo, mensagem, entidade_relacionada)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id_utilizador, tipo, categoria || 'CANDIDATURA', titulo, mensagem || null, entidade_relacionada || null]
  );
}

async function obterCandidaturaOuErro(idCandidatura) {
  const [linhas] = await pool.query(
    `SELECT cb.*, b.titulo AS titulo_badge, b.id_nivel, n.id_area, a.id_service_line
       FROM candidatura_badge cb
       JOIN badge b ON b.id_badge = cb.id_badge
       JOIN nivel n ON n.id_nivel = b.id_nivel
       JOIN area a  ON a.id_area  = n.id_area
      WHERE cb.id_candidatura = ?`,
    [idCandidatura]
  );
  return linhas[0] || null;
}

async function listar(req, res, next) {
  try {
    const {
      estado, id_badge, id_consultor, id_service_line, id_area,
      fechadas, pagina = 1, por_pagina = 20,
    } = req.query;

    const limit = Math.min(parseInt(por_pagina, 10) || 20, 100);
    const offset = (Math.max(parseInt(pagina, 10) || 1, 1) - 1) * limit;

    const where = [];
    const params = [];

    // aplicar scope conforme perfil
    const perfis = req.utilizador.perfis;
    if (perfis.includes('Consultor') && !perfis.includes('Administrador') &&
        !perfis.includes('Talent Manager') && !perfis.includes('Service Line')) {
      // consultor só vê as suas
      where.push('cb.id_consultor = ?');
      params.push(req.utilizador.id_utilizador);
    } else if (perfis.includes('Service Line') && !perfis.includes('Administrador') && !perfis.includes('Talent Manager')) {
      // service line leader só vê as da sua service line
      const [sl] = await pool.query(
        'SELECT id_service_line FROM service_line_responsavel WHERE id_utilizador = ?',
        [req.utilizador.id_utilizador]
      );
      if (sl.length > 0) {
        where.push('a.id_service_line = ?');
        params.push(sl[0].id_service_line);
      } else {
        return res.json({ dados: [], total: 0, pagina: Number(pagina), por_pagina: limit });
      }
    }
    // talent manager e admin veem tudo

    if (estado)           { where.push('cb.estado_atual = ?');   params.push(estado); }
    if (id_badge)         { where.push('cb.id_badge = ?');       params.push(id_badge); }
    if (id_consultor)     { where.push('cb.id_consultor = ?');   params.push(id_consultor); }
    if (id_service_line)  { where.push('a.id_service_line = ?'); params.push(id_service_line); }
    if (id_area)          { where.push('n.id_area = ?');         params.push(id_area); }
    if (fechadas === '1') { where.push('cb.data_fecho IS NOT NULL'); }
    if (fechadas === '0') { where.push('cb.data_fecho IS NULL'); }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [linhas] = await pool.query(
      `SELECT cb.id_candidatura, cb.estado_atual, cb.data_abertura, cb.data_submissao, cb.data_fecho,
              cb.id_consultor, u.nome AS nome_consultor, u.email AS email_consultor,
              cb.id_badge, b.titulo AS titulo_badge, b.imagem_url,
              n.codigo_nivel, n.nome_nivel,
              a.id_area, a.nome AS nome_area,
              sl.id_service_line, sl.nome AS nome_service_line
         FROM candidatura_badge cb
         JOIN utilizador u    ON u.id_utilizador = cb.id_consultor
         JOIN badge b         ON b.id_badge      = cb.id_badge
         JOIN nivel n         ON n.id_nivel      = b.id_nivel
         JOIN area a          ON a.id_area       = n.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         ${whereSQL}
         ORDER BY cb.data_abertura DESC
         LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM candidatura_badge cb
         JOIN utilizador u    ON u.id_utilizador = cb.id_consultor
         JOIN badge b         ON b.id_badge      = cb.id_badge
         JOIN nivel n         ON n.id_nivel      = b.id_nivel
         JOIN area a          ON a.id_area       = n.id_area
         ${whereSQL}`,
      params
    );

    res.json({ dados: linhas, total, pagina: Number(pagina), por_pagina: limit });
  } catch (err) { next(err); }
}

async function obter(req, res, next) {
  try {
    const candidatura = await obterCandidaturaOuErro(req.params.id);
    if (!candidatura) return res.status(404).json({ erro: 'Candidatura não encontrada.' });

    // scope check
    const perfis = req.utilizador.perfis;
    const ehDonoCandidatura = candidatura.id_consultor === req.utilizador.id_utilizador;
    const temAcessoElevado = perfis.includes('Administrador') || perfis.includes('Talent Manager');
    let temAcessoServiceLine = false;
    if (perfis.includes('Service Line')) {
      const [sl] = await pool.query(
        'SELECT id_service_line FROM service_line_responsavel WHERE id_utilizador = ?',
        [req.utilizador.id_utilizador]
      );
      temAcessoServiceLine = sl[0]?.id_service_line === candidatura.id_service_line;
    }
    if (!ehDonoCandidatura && !temAcessoElevado && !temAcessoServiceLine) {
      return res.status(403).json({ erro: 'Sem permissão para esta candidatura.' });
    }

    const [consultor] = await pool.query(
      'SELECT id_utilizador, nome, email, url_slug FROM utilizador WHERE id_utilizador = ?',
      [candidatura.id_consultor]
    );

    const [evidencias] = await pool.query(
      `SELECT ev.*, r.codigo_requisito, r.titulo AS titulo_requisito
         FROM evidencia ev
         JOIN requisito r ON r.id_requisito = ev.id_requisito
        WHERE ev.id_candidatura = ?
        ORDER BY ev.uploaded_at DESC`,
      [req.params.id]
    );

    const [avaliacoes] = await pool.query(
      `SELECT av.*, u.nome AS nome_avaliador
         FROM avaliacao_candidatura av
         JOIN utilizador u ON u.id_utilizador = av.id_avaliador
        WHERE av.id_candidatura = ?
        ORDER BY av.data_avaliacao ASC`,
      [req.params.id]
    );

    const [historico] = await pool.query(
      `SELECT h.*, u.nome AS nome_responsavel
         FROM historico_candidatura h
         JOIN utilizador u ON u.id_utilizador = h.id_utilizador_responsavel
        WHERE h.id_candidatura = ?
        ORDER BY h.data_evento ASC`,
      [req.params.id]
    );

    const [requisitos] = await pool.query(
      'SELECT * FROM requisito WHERE id_nivel = ? ORDER BY ordem ASC, codigo_requisito ASC',
      [candidatura.id_nivel]
    );

    res.json({
      candidatura,
      consultor: consultor[0],
      requisitos,
      evidencias,
      avaliacoes,
      historico,
    });
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const { id_badge, observacoes_consultor } = req.body;
    if (!id_badge) return res.status(400).json({ erro: 'id_badge é obrigatório.' });

    const [badge] = await pool.query('SELECT id_badge, ativo FROM badge WHERE id_badge = ?', [id_badge]);
    if (badge.length === 0) return res.status(404).json({ erro: 'Badge não encontrado.' });
    if (!badge[0].ativo) return res.status(400).json({ erro: 'Badge inativo.' });

    // impedir duplicar candidaturas abertas ao mesmo badge
    const [abertas] = await pool.query(
      `SELECT id_candidatura FROM candidatura_badge
        WHERE id_consultor = ? AND id_badge = ?
          AND estado_atual IN ('OPEN','SUBMITTED','IN_TALENT_REVIEW','IN_SERVICE_LINE_REVIEW','SENT_BACK')`,
      [req.utilizador.id_utilizador, id_badge]
    );
    if (abertas.length > 0) {
      return res.status(409).json({
        erro: 'Já tem uma candidatura aberta para este badge.',
        id_candidatura: abertas[0].id_candidatura,
      });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO candidatura_badge (id_consultor, id_badge, observacoes_consultor, estado_atual)
         VALUES (?, ?, ?, 'OPEN')`,
        [req.utilizador.id_utilizador, id_badge, observacoes_consultor || null]
      );

      await registarHistorico(conn, {
        id_candidatura: result.insertId,
        id_utilizador: req.utilizador.id_utilizador,
        estado_origem: '-',
        estado_destino: 'OPEN',
        acao: 'CRIACAO',
      });

      await conn.commit();
      res.status(201).json({ mensagem: 'Candidatura criada.', id_candidatura: result.insertId });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) { next(err); }
}

async function submeter(req, res, next) {
  try {
    const candidatura = await obterCandidaturaOuErro(req.params.id);
    if (!candidatura) return res.status(404).json({ erro: 'Candidatura não encontrada.' });
    if (candidatura.id_consultor !== req.utilizador.id_utilizador) {
      return res.status(403).json({ erro: 'Apenas o consultor dono pode submeter.' });
    }
    if (!['OPEN', 'SENT_BACK'].includes(candidatura.estado_atual)) {
      return res.status(400).json({ erro: `Não pode submeter uma candidatura em estado ${candidatura.estado_atual}.` });
    }

    // validar que há pelo menos uma evidência por requisito obrigatório
    const [requisitos] = await pool.query(
      'SELECT id_requisito FROM requisito WHERE id_nivel = ? AND obrigatorio = 1',
      [candidatura.id_nivel]
    );
    const [evidencias] = await pool.query(
      'SELECT DISTINCT id_requisito FROM evidencia WHERE id_candidatura = ?',
      [req.params.id]
    );
    const evSet = new Set(evidencias.map(e => e.id_requisito));
    const faltam = requisitos.filter(r => !evSet.has(r.id_requisito));
    if (faltam.length > 0) {
      return res.status(400).json({
        erro: 'Faltam evidências para requisitos obrigatórios.',
        requisitos_em_falta: faltam.map(r => r.id_requisito),
      });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `UPDATE candidatura_badge
            SET estado_atual = 'SUBMITTED',
                data_submissao = CURRENT_TIMESTAMP
          WHERE id_candidatura = ?`,
        [req.params.id]
      );

      await registarHistorico(conn, {
        id_candidatura: req.params.id,
        id_utilizador: req.utilizador.id_utilizador,
        estado_origem: candidatura.estado_atual,
        estado_destino: 'SUBMITTED',
        acao: 'SUBMISSAO',
        comentario: req.body.comentario,
      });

      // notificar talent managers
      const [talent] = await conn.query(
        `SELECT u.id_utilizador FROM utilizador u
           JOIN utilizador_perfil up ON up.id_utilizador = u.id_utilizador
           JOIN perfil p ON p.id_perfil = up.id_perfil
          WHERE p.nome_perfil = 'Talent Manager' AND u.ativo = 1`
      );
      for (const t of talent) {
        await criarNotificacao(conn, {
          id_utilizador: t.id_utilizador,
          tipo: 'NOVA_SUBMISSAO',
          categoria: 'CANDIDATURA',
          titulo: `Nova submissão: ${candidatura.titulo_badge}`,
          mensagem: `Candidatura #${req.params.id} aguarda validação de evidências.`,
          entidade_relacionada: 'Consultor',
        });
      }

      await conn.commit();
      res.json({ mensagem: 'Candidatura submetida.' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) { next(err); }
}

async function cancelar(req, res, next) {
  try {
    const candidatura = await obterCandidaturaOuErro(req.params.id);
    if (!candidatura) return res.status(404).json({ erro: 'Candidatura não encontrada.' });
    if (candidatura.id_consultor !== req.utilizador.id_utilizador) {
      return res.status(403).json({ erro: 'Apenas o consultor dono pode cancelar.' });
    }
    if (!['OPEN', 'SENT_BACK'].includes(candidatura.estado_atual)) {
      return res.status(400).json({ erro: 'Só pode cancelar candidaturas abertas ou devolvidas.' });
    }

    await pool.query('DELETE FROM candidatura_badge WHERE id_candidatura = ?', [req.params.id]);
    res.json({ mensagem: 'Candidatura cancelada.' });
  } catch (err) { next(err); }
}

async function historico(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT h.*, u.nome AS nome_responsavel
         FROM historico_candidatura h
         JOIN utilizador u ON u.id_utilizador = h.id_utilizador_responsavel
        WHERE h.id_candidatura = ?
        ORDER BY h.data_evento ASC`,
      [req.params.id]
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function avaliarTalent(req, res, next) {
  try {
    const { decisao, comentario } = req.body;
    if (!['CORRETO', 'INCORRETO'].includes(decisao)) {
      return res.status(400).json({ erro: 'Decisão deve ser CORRETO ou INCORRETO.' });
    }

    const candidatura = await obterCandidaturaOuErro(req.params.id);
    if (!candidatura) return res.status(404).json({ erro: 'Candidatura não encontrada.' });
    if (!['SUBMITTED', 'IN_TALENT_REVIEW'].includes(candidatura.estado_atual)) {
      return res.status(400).json({ erro: `Candidatura não está em revisão de Talent (estado: ${candidatura.estado_atual}).` });
    }

    const novoEstado = decisao === 'CORRETO' ? 'IN_SERVICE_LINE_REVIEW' : 'OPEN';

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `INSERT INTO avaliacao_candidatura
           (id_candidatura, id_avaliador, tipo_avaliador, decisao, comentario)
         VALUES (?, ?, 'TALENT_MANAGER', ?, ?)`,
        [req.params.id, req.utilizador.id_utilizador, decisao, comentario || null]
      );

      await conn.query(
        `UPDATE candidatura_badge SET estado_atual = ? WHERE id_candidatura = ?`,
        [novoEstado, req.params.id]
      );

      await registarHistorico(conn, {
        id_candidatura: req.params.id,
        id_utilizador: req.utilizador.id_utilizador,
        estado_origem: candidatura.estado_atual,
        estado_destino: novoEstado,
        acao: `TALENT_${decisao}`,
        comentario,
      });

      // notificar consultor
      await criarNotificacao(conn, {
        id_utilizador: candidatura.id_consultor,
        tipo: decisao === 'CORRETO' ? 'TALENT_APROVADA' : 'TALENT_DEVOLVIDA',
        categoria: 'CANDIDATURA',
        titulo: decisao === 'CORRETO'
          ? `Evidências validadas pelo Talent Manager`
          : `Evidências devolvidas para retificação`,
        mensagem: `Badge: ${candidatura.titulo_badge}. ${comentario || ''}`,
        entidade_relacionada: 'Talent Manager',
      });

      // se correto, notificar service line leader(s) dessa service line
      if (decisao === 'CORRETO') {
        const [lideres] = await conn.query(
          `SELECT slr.id_utilizador FROM service_line_responsavel slr
             JOIN utilizador u ON u.id_utilizador = slr.id_utilizador
            WHERE slr.id_service_line = ? AND u.ativo = 1`,
          [candidatura.id_service_line]
        );
        for (const l of lideres) {
          await criarNotificacao(conn, {
            id_utilizador: l.id_utilizador,
            tipo: 'PENDENTE_VALIDACAO_FINAL',
            categoria: 'CANDIDATURA',
            titulo: `Validação final pendente: ${candidatura.titulo_badge}`,
            mensagem: `Candidatura #${req.params.id} aguarda a sua decisão.`,
            entidade_relacionada: 'Talent Manager',
          });
        }
      }

      await conn.commit();

      try {
        const [cons] = await pool.query(
          'SELECT nome, email FROM utilizador WHERE id_utilizador = ?',
          [candidatura.id_consultor]
        );
        await notificarMudancaEstadoCandidatura(cons[0], novoEstado, candidatura.titulo_badge);
      } catch (_) { /* email é best-effort */ }

      res.json({ mensagem: 'Avaliação registada.', novo_estado: novoEstado });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) { next(err); }
}

async function avaliarServiceLine(req, res, next) {
  try {
    const { decisao, comentario } = req.body;
    if (!['APROVAR', 'REJEITAR', 'SEND_BACK'].includes(decisao)) {
      return res.status(400).json({ erro: 'Decisão deve ser APROVAR, REJEITAR ou SEND_BACK.' });
    }

    const candidatura = await obterCandidaturaOuErro(req.params.id);
    if (!candidatura) return res.status(404).json({ erro: 'Candidatura não encontrada.' });
    if (candidatura.estado_atual !== 'IN_SERVICE_LINE_REVIEW') {
      return res.status(400).json({ erro: `Candidatura não está em revisão final (estado: ${candidatura.estado_atual}).` });
    }

    // verificar que este service line leader é responsável pela service line da candidatura
    if (!req.utilizador.perfis.includes('Administrador')) {
      const [sl] = await pool.query(
        'SELECT id_service_line FROM service_line_responsavel WHERE id_utilizador = ?',
        [req.utilizador.id_utilizador]
      );
      if (sl[0]?.id_service_line !== candidatura.id_service_line) {
        return res.status(403).json({ erro: 'Sem permissão para esta service line.' });
      }
    }

    const mapaEstados = { APROVAR: 'APPROVED', REJEITAR: 'REJECTED', SEND_BACK: 'OPEN' };
    const novoEstado = mapaEstados[decisao];

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `INSERT INTO avaliacao_candidatura
           (id_candidatura, id_avaliador, tipo_avaliador, decisao, comentario)
         VALUES (?, ?, 'SERVICE_LINE', ?, ?)`,
        [req.params.id, req.utilizador.id_utilizador, decisao, comentario || null]
      );

      const dataFecho = ['APROVAR', 'REJEITAR'].includes(decisao) ? 'CURRENT_TIMESTAMP' : 'NULL';
      await conn.query(
        `UPDATE candidatura_badge
            SET estado_atual = ?,
                data_fecho = ${dataFecho}
          WHERE id_candidatura = ?`,
        [novoEstado, req.params.id]
      );

      await registarHistorico(conn, {
        id_candidatura: req.params.id,
        id_utilizador: req.utilizador.id_utilizador,
        estado_origem: candidatura.estado_atual,
        estado_destino: novoEstado,
        acao: `SERVICE_LINE_${decisao}`,
        comentario,
      });

      // notificar consultor
      const titulosNotif = {
        APPROVED: `Parabéns! Badge aprovado: ${candidatura.titulo_badge}`,
        REJECTED: `Candidatura rejeitada: ${candidatura.titulo_badge}`,
        OPEN:     `Candidatura devolvida pelo Service Line: ${candidatura.titulo_badge}`,
      };
      await criarNotificacao(conn, {
        id_utilizador: candidatura.id_consultor,
        tipo: novoEstado,
        categoria: novoEstado === 'APPROVED' ? 'BADGE' : 'CANDIDATURA',
        titulo: titulosNotif[novoEstado],
        mensagem: comentario || null,
        entidade_relacionada: 'Service Line',
      });

      // se aprovado, criar badge_atribuido
      let idBadgeAtribuido = null;
      if (novoEstado === 'APPROVED') {
        const [badgeInfo] = await conn.query(
          'SELECT tem_expiracao, validade_dias FROM badge WHERE id_badge = ?',
          [candidatura.id_badge]
        );
        const token = gerarTokenAleatorio();
        let dataExpiracao = null;
        if (badgeInfo[0].tem_expiracao && badgeInfo[0].validade_dias) {
          const expira = new Date();
          expira.setDate(expira.getDate() + badgeInfo[0].validade_dias);
          dataExpiracao = expira;
        }

        const [result] = await conn.query(
          `INSERT INTO badge_atribuido
             (id_consultor, id_badge, id_candidatura, data_expiracao, token_publico)
           VALUES (?, ?, ?, ?, ?)`,
          [candidatura.id_consultor, candidatura.id_badge, req.params.id, dataExpiracao, token]
        );
        idBadgeAtribuido = result.insertId;

        const codigoPublico = gerarCodigoPublico(idBadgeAtribuido);
        const urlPublica = `${process.env.APP_URL}/publico/badges/${token}`;
        await conn.query(
          `UPDATE badge_atribuido SET codigo_publico = ?, url_publica = ? WHERE id_badge_atribuido = ?`,
          [codigoPublico, urlPublica, idBadgeAtribuido]
        );
      }

      await conn.commit();

      try {
        const [cons] = await pool.query(
          'SELECT nome, email FROM utilizador WHERE id_utilizador = ?',
          [candidatura.id_consultor]
        );
        await notificarMudancaEstadoCandidatura(cons[0], novoEstado, candidatura.titulo_badge);
      } catch (_) { /* email é best-effort */ }

      res.json({ mensagem: 'Avaliação registada.', novo_estado: novoEstado, id_badge_atribuido: idBadgeAtribuido });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) { next(err); }
}

module.exports = {
  listar,
  obter,
  criar,
  submeter,
  cancelar,
  historico,
  avaliarTalent,
  avaliarServiceLine,
};
