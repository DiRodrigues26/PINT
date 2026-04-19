const { pool } = require('../db/connection');

async function listar(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT id_learning_path, nome, descricao, ativo, created_at, updated_at
         FROM learning_path
        ORDER BY nome ASC`
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function obter(req, res, next) {
  try {
    const [linhas] = await pool.query(
      'SELECT * FROM learning_path WHERE id_learning_path = ?',
      [req.params.id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Learning path não encontrado.' });
    res.json({ learning_path: linhas[0] });
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const { nome, descricao, ativo = 1 } = req.body;
    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });

    const [result] = await pool.query(
      'INSERT INTO learning_path (nome, descricao, ativo) VALUES (?, ?, ?)',
      [nome, descricao || null, ativo ? 1 : 0]
    );
    res.status(201).json({ mensagem: 'Learning path criado.', id_learning_path: result.insertId });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const { nome, descricao, ativo } = req.body;
    const campos = [];
    const valores = [];

    if (nome !== undefined)       { campos.push('nome = ?');       valores.push(nome); }
    if (descricao !== undefined)  { campos.push('descricao = ?');  valores.push(descricao); }
    if (ativo !== undefined)      { campos.push('ativo = ?');      valores.push(ativo ? 1 : 0); }

    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE learning_path SET ${campos.join(', ')} WHERE id_learning_path = ?`,
      valores
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Learning path não encontrado.' });
    res.json({ mensagem: 'Learning path atualizado.' });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM learning_path WHERE id_learning_path = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Learning path não encontrado.' });
    res.json({ mensagem: 'Learning path eliminado.' });
  } catch (err) { next(err); }
}

module.exports = { listar, obter, criar, atualizar, eliminar };
