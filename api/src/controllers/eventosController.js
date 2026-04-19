const { pool } = require('../db/connection');

async function listar(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT ee.*, n.codigo_nivel, n.nome_nivel, b.titulo AS titulo_badge,
              (SELECT COUNT(*) FROM evento_especial_requisito WHERE id_evento = ee.id_evento) AS n_requisitos
         FROM evento_especial ee
         JOIN nivel n ON n.id_nivel = ee.id_nivel
         LEFT JOIN badge b ON b.id_badge = ee.id_badge
        ORDER BY ee.data_limite ASC`
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function obter(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT ee.*, n.codigo_nivel, n.nome_nivel, b.titulo AS titulo_badge
         FROM evento_especial ee
         JOIN nivel n ON n.id_nivel = ee.id_nivel
         LEFT JOIN badge b ON b.id_badge = ee.id_badge
        WHERE ee.id_evento = ?`,
      [req.params.id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Evento não encontrado.' });

    const [requisitos] = await pool.query(
      'SELECT * FROM evento_especial_requisito WHERE id_evento = ? ORDER BY ordem',
      [req.params.id]
    );

    res.json({ evento: linhas[0], requisitos });
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const { id_nivel, id_badge, titulo, descricao, data_limite, ativo = 1 } = req.body;
    if (!id_nivel || !titulo) {
      return res.status(400).json({ erro: 'id_nivel e titulo são obrigatórios.' });
    }

    const [result] = await pool.query(
      `INSERT INTO evento_especial (id_nivel, id_badge, titulo, descricao, data_limite, ativo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_nivel, id_badge || null, titulo, descricao || null, data_limite || null, ativo ? 1 : 0]
    );
    res.status(201).json({ mensagem: 'Evento criado.', id_evento: result.insertId });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const editaveis = ['id_nivel', 'id_badge', 'titulo', 'descricao', 'data_limite', 'ativo'];
    const campos = [];
    const valores = [];
    for (const c of editaveis) {
      if (req.body[c] !== undefined) {
        campos.push(`${c} = ?`);
        valores.push(c === 'ativo' ? (req.body[c] ? 1 : 0) : req.body[c]);
      }
    }
    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE evento_especial SET ${campos.join(', ')} WHERE id_evento = ?`,
      valores
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Evento não encontrado.' });
    res.json({ mensagem: 'Evento atualizado.' });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query('DELETE FROM evento_especial WHERE id_evento = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Evento não encontrado.' });
    res.json({ mensagem: 'Evento eliminado.' });
  } catch (err) { next(err); }
}

async function adicionarRequisito(req, res, next) {
  try {
    const { id } = req.params;
    const { titulo, descricao, ordem = 1 } = req.body;
    if (!titulo) return res.status(400).json({ erro: 'Título é obrigatório.' });

    const [result] = await pool.query(
      `INSERT INTO evento_especial_requisito (id_evento, titulo, descricao, ordem)
       VALUES (?, ?, ?, ?)`,
      [id, titulo, descricao || null, ordem]
    );
    res.status(201).json({ mensagem: 'Requisito adicionado.', id_ee_requisito: result.insertId });
  } catch (err) { next(err); }
}

async function removerRequisito(req, res, next) {
  try {
    const { idRequisito } = req.params;
    const [result] = await pool.query(
      'DELETE FROM evento_especial_requisito WHERE id_ee_requisito = ?',
      [idRequisito]
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Requisito não encontrado.' });
    res.json({ mensagem: 'Requisito removido.' });
  } catch (err) { next(err); }
}

module.exports = { listar, obter, criar, atualizar, eliminar, adicionarRequisito, removerRequisito };
