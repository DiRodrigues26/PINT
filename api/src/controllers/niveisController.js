const { pool } = require('../db/connection');

async function listar(req, res, next) {
  try {
    const { id_area } = req.query;
    const where = [];
    const params = [];
    if (id_area) { where.push('n.id_area = ?'); params.push(id_area); }
    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [linhas] = await pool.query(
      `SELECT n.*, a.nome AS nome_area
         FROM nivel n
         JOIN area a ON a.id_area = n.id_area
         ${whereSQL}
        ORDER BY n.id_area, n.ordem ASC`,
      params
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function obter(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT n.*, a.nome AS nome_area
         FROM nivel n
         JOIN area a ON a.id_area = n.id_area
        WHERE id_nivel = ?`,
      [req.params.id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Nível não encontrado.' });

    const [requisitos] = await pool.query(
      'SELECT * FROM requisito WHERE id_nivel = ? ORDER BY ordem ASC, codigo_requisito ASC',
      [req.params.id]
    );

    const [badge] = await pool.query(
      'SELECT * FROM badge WHERE id_nivel = ?',
      [req.params.id]
    );

    res.json({ nivel: linhas[0], requisitos, badge: badge[0] || null });
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const { id_area, codigo_nivel, nome_nivel, ordem, descricao } = req.body;
    if (!id_area || !codigo_nivel || !nome_nivel || ordem === undefined) {
      return res.status(400).json({ erro: 'id_area, codigo_nivel, nome_nivel e ordem são obrigatórios.' });
    }
    const [result] = await pool.query(
      `INSERT INTO nivel (id_area, codigo_nivel, nome_nivel, ordem, descricao)
       VALUES (?, ?, ?, ?, ?)`,
      [id_area, codigo_nivel, nome_nivel, ordem, descricao || null]
    );
    res.status(201).json({ mensagem: 'Nível criado.', id_nivel: result.insertId });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const { codigo_nivel, nome_nivel, ordem, descricao } = req.body;
    const campos = [];
    const valores = [];

    if (codigo_nivel !== undefined) { campos.push('codigo_nivel = ?'); valores.push(codigo_nivel); }
    if (nome_nivel !== undefined)   { campos.push('nome_nivel = ?');   valores.push(nome_nivel); }
    if (ordem !== undefined)        { campos.push('ordem = ?');        valores.push(ordem); }
    if (descricao !== undefined)    { campos.push('descricao = ?');    valores.push(descricao); }

    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE nivel SET ${campos.join(', ')} WHERE id_nivel = ?`,
      valores
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Nível não encontrado.' });
    res.json({ mensagem: 'Nível atualizado.' });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query('DELETE FROM nivel WHERE id_nivel = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Nível não encontrado.' });
    res.json({ mensagem: 'Nível eliminado.' });
  } catch (err) { next(err); }
}

module.exports = { listar, obter, criar, atualizar, eliminar };
