const { pool } = require('../db/connection');

async function listar(req, res, next) {
  try {
    const { id_service_line } = req.query;
    const where = [];
    const params = [];
    if (id_service_line) { where.push('a.id_service_line = ?'); params.push(id_service_line); }
    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [linhas] = await pool.query(
      `SELECT a.*, sl.nome AS nome_service_line, lp.id_learning_path, lp.nome AS nome_learning_path
         FROM area a
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         JOIN learning_path lp ON lp.id_learning_path = sl.id_learning_path
         ${whereSQL}
        ORDER BY a.nome ASC`,
      params
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function obter(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT a.*, sl.nome AS nome_service_line
         FROM area a
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
        WHERE id_area = ?`,
      [req.params.id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Área não encontrada.' });
    res.json({ area: linhas[0] });
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const { id_service_line, nome, descricao, ativo = 1 } = req.body;
    if (!id_service_line || !nome) {
      return res.status(400).json({ erro: 'id_service_line e nome são obrigatórios.' });
    }
    const [result] = await pool.query(
      'INSERT INTO area (id_service_line, nome, descricao, ativo) VALUES (?, ?, ?, ?)',
      [id_service_line, nome, descricao || null, ativo ? 1 : 0]
    );
    res.status(201).json({ mensagem: 'Área criada.', id_area: result.insertId });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const { id_service_line, nome, descricao, ativo } = req.body;
    const campos = [];
    const valores = [];

    if (id_service_line !== undefined) { campos.push('id_service_line = ?'); valores.push(id_service_line); }
    if (nome !== undefined)             { campos.push('nome = ?');             valores.push(nome); }
    if (descricao !== undefined)        { campos.push('descricao = ?');        valores.push(descricao); }
    if (ativo !== undefined)            { campos.push('ativo = ?');            valores.push(ativo ? 1 : 0); }

    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE area SET ${campos.join(', ')} WHERE id_area = ?`,
      valores
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Área não encontrada.' });
    res.json({ mensagem: 'Área atualizada.' });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query('DELETE FROM area WHERE id_area = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Área não encontrada.' });
    res.json({ mensagem: 'Área eliminada.' });
  } catch (err) { next(err); }
}

module.exports = { listar, obter, criar, atualizar, eliminar };
