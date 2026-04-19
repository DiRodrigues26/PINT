const { pool } = require('../db/connection');

async function listar(req, res, next) {
  try {
    const [linhas] = await pool.query('SELECT * FROM sla_config ORDER BY fase');
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const { fase } = req.params;
    const { limite, unidade, ativo } = req.body;
    if (!['TALENT_REVIEW', 'SERVICE_LINE_REVIEW'].includes(fase)) {
      return res.status(400).json({ erro: 'Fase inválida.' });
    }

    const campos = [];
    const valores = [];
    if (limite !== undefined)  { campos.push('limite = ?');  valores.push(limite); }
    if (unidade !== undefined) { campos.push('unidade = ?'); valores.push(unidade); }
    if (ativo !== undefined)   { campos.push('ativo = ?');   valores.push(ativo ? 1 : 0); }
    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    valores.push(fase);
    const [result] = await pool.query(
      `UPDATE sla_config SET ${campos.join(', ')} WHERE fase = ?`,
      valores
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'SLA não encontrado.' });
    res.json({ mensagem: 'SLA atualizado.' });
  } catch (err) { next(err); }
}

async function candidaturasForaSLA(req, res, next) {
  try {
    const [slas] = await pool.query('SELECT fase, limite, unidade, ativo FROM sla_config');
    const mapaSLA = {};
    for (const s of slas) {
      if (!s.ativo) continue;
      const horas = s.unidade === 'dias' ? s.limite * 24 : s.limite;
      mapaSLA[s.fase] = horas;
    }

    const [linhas] = await pool.query(
      `SELECT cb.id_candidatura, cb.estado_atual, cb.data_submissao,
              TIMESTAMPDIFF(HOUR, cb.data_submissao, CURRENT_TIMESTAMP) AS horas_em_fase,
              b.titulo AS titulo_badge, u.nome AS nome_consultor
         FROM candidatura_badge cb
         JOIN badge b ON b.id_badge = cb.id_badge
         JOIN utilizador u ON u.id_utilizador = cb.id_consultor
        WHERE cb.estado_atual IN ('SUBMITTED', 'IN_TALENT_REVIEW', 'IN_SERVICE_LINE_REVIEW')
          AND cb.data_submissao IS NOT NULL`
    );

    const foraSLA = linhas.filter(l => {
      const limiteFase =
        ['SUBMITTED', 'IN_TALENT_REVIEW'].includes(l.estado_atual) ? mapaSLA.TALENT_REVIEW :
        l.estado_atual === 'IN_SERVICE_LINE_REVIEW' ? mapaSLA.SERVICE_LINE_REVIEW : null;
      return limiteFase && l.horas_em_fase > limiteFase;
    });

    res.json({ dados: foraSLA });
  } catch (err) { next(err); }
}

module.exports = { listar, atualizar, candidaturasForaSLA };
