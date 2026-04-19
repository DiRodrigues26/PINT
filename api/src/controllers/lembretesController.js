const { pool } = require('../db/connection');

async function listar(req, res, next) {
  try {
    const { concluidos } = req.query;
    const where = ['id_utilizador = ?'];
    const params = [req.utilizador.id_utilizador];
    if (concluidos === '0') where.push('concluido = 0');
    if (concluidos === '1') where.push('concluido = 1');

    const [linhas] = await pool.query(
      `SELECT * FROM lembrete WHERE ${where.join(' AND ')}
        ORDER BY COALESCE(data_limite, created_at) ASC`,
      params
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const { titulo, descricao, data_limite } = req.body;
    if (!titulo) return res.status(400).json({ erro: 'Título é obrigatório.' });

    const [result] = await pool.query(
      `INSERT INTO lembrete (id_utilizador, titulo, descricao, data_limite)
       VALUES (?, ?, ?, ?)`,
      [req.utilizador.id_utilizador, titulo, descricao || null, data_limite || null]
    );
    res.status(201).json({ mensagem: 'Lembrete criado.', id_lembrete: result.insertId });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const editaveis = ['titulo', 'descricao', 'data_limite', 'concluido'];
    const campos = [];
    const valores = [];
    for (const c of editaveis) {
      if (req.body[c] !== undefined) {
        campos.push(`${c} = ?`);
        valores.push(c === 'concluido' ? (req.body[c] ? 1 : 0) : req.body[c]);
      }
    }
    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    valores.push(req.params.id, req.utilizador.id_utilizador);
    const [result] = await pool.query(
      `UPDATE lembrete SET ${campos.join(', ')} WHERE id_lembrete = ? AND id_utilizador = ?`,
      valores
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Lembrete não encontrado.' });
    res.json({ mensagem: 'Lembrete atualizado.' });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM lembrete WHERE id_lembrete = ? AND id_utilizador = ?',
      [req.params.id, req.utilizador.id_utilizador]
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Lembrete não encontrado.' });
    res.json({ mensagem: 'Lembrete eliminado.' });
  } catch (err) { next(err); }
}

module.exports = { listar, criar, atualizar, eliminar };
