const { pool } = require('../db/connection');

async function listar(req, res, next) {
  try {
    const { id_nivel } = req.query;
    const where = [];
    const params = [];
    if (id_nivel) { where.push('id_nivel = ?'); params.push(id_nivel); }
    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [linhas] = await pool.query(
      `SELECT * FROM requisito ${whereSQL} ORDER BY id_nivel, ordem ASC, codigo_requisito ASC`,
      params
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function obter(req, res, next) {
  try {
    const [linhas] = await pool.query(
      'SELECT * FROM requisito WHERE id_requisito = ?',
      [req.params.id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Requisito não encontrado.' });
    res.json({ requisito: linhas[0] });
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const {
      id_nivel, codigo_requisito, titulo, descricao,
      tipo_evidencia, imagem_url, ordem = 1, obrigatorio = 1,
    } = req.body;

    if (!id_nivel || !codigo_requisito || !titulo) {
      return res.status(400).json({ erro: 'id_nivel, codigo_requisito e titulo são obrigatórios.' });
    }

    const [result] = await pool.query(
      `INSERT INTO requisito
         (id_nivel, codigo_requisito, titulo, descricao, tipo_evidencia, imagem_url, ordem, obrigatorio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_nivel, codigo_requisito, titulo, descricao || null, tipo_evidencia || null,
       imagem_url || null, ordem, obrigatorio ? 1 : 0]
    );
    res.status(201).json({ mensagem: 'Requisito criado.', id_requisito: result.insertId });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const { codigo_requisito, titulo, descricao, tipo_evidencia, imagem_url, ordem, obrigatorio } = req.body;
    const campos = [];
    const valores = [];

    if (codigo_requisito !== undefined) { campos.push('codigo_requisito = ?'); valores.push(codigo_requisito); }
    if (titulo !== undefined)            { campos.push('titulo = ?');            valores.push(titulo); }
    if (descricao !== undefined)         { campos.push('descricao = ?');         valores.push(descricao); }
    if (tipo_evidencia !== undefined)    { campos.push('tipo_evidencia = ?');    valores.push(tipo_evidencia); }
    if (imagem_url !== undefined)        { campos.push('imagem_url = ?');        valores.push(imagem_url); }
    if (ordem !== undefined)             { campos.push('ordem = ?');             valores.push(ordem); }
    if (obrigatorio !== undefined)       { campos.push('obrigatorio = ?');       valores.push(obrigatorio ? 1 : 0); }

    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE requisito SET ${campos.join(', ')} WHERE id_requisito = ?`,
      valores
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Requisito não encontrado.' });
    res.json({ mensagem: 'Requisito atualizado.' });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM requisito WHERE id_requisito = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Requisito não encontrado.' });
    res.json({ mensagem: 'Requisito eliminado.' });
  } catch (err) { next(err); }
}

module.exports = { listar, obter, criar, atualizar, eliminar };
