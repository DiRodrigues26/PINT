const { pool } = require('../db/connection');

function inteiroPositivo(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function booleano(valor) {
  if (valor === undefined) return undefined;
  return valor === true || valor === 1 || valor === '1' || valor === 'true' ? 1 : 0;
}

function validarPayload(body, parcial = false) {
  const dados = {};

  if (!parcial || body.id_utilizador !== undefined) {
    const id = inteiroPositivo(body.id_utilizador);
    if (!id) return { erro: 'Utilizador inválido.' };
    dados.id_utilizador = id;
  }

  if (!parcial || body.nome_template !== undefined) {
    const nome = String(body.nome_template || '').trim();
    if (!nome) return { erro: 'Nome do template é obrigatório.' };
    if (nome.length > 150) return { erro: 'Nome do template demasiado longo.' };
    dados.nome_template = nome;
  }

  if (!parcial || body.html_template !== undefined) {
    const html = String(body.html_template || '').trim();
    if (!html) return { erro: 'HTML do template é obrigatório.' };
    dados.html_template = html;
  }

  if (body.ativo !== undefined) {
    dados.ativo = booleano(body.ativo);
  } else if (!parcial) {
    dados.ativo = 1;
  }

  return { dados };
}

async function listar(req, res, next) {
  try {
    const { id_utilizador, ativo } = req.query;
    const where = [];
    const params = [];

    const id = id_utilizador ? inteiroPositivo(id_utilizador) : null;
    if (id_utilizador && !id) return res.status(400).json({ erro: 'Utilizador inválido.' });
    if (id) {
      where.push('tae.id_utilizador = ?');
      params.push(id);
    }

    if (ativo !== undefined && ativo !== '') {
      where.push('tae.ativo = ?');
      params.push(booleano(ativo));
    }

    const [linhas] = await pool.query(
      `SELECT tae.*, u.nome AS nome_utilizador, u.email AS email_utilizador
         FROM template_assinatura_email tae
         JOIN utilizador u ON u.id_utilizador = tae.id_utilizador
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY tae.updated_at DESC, tae.created_at DESC`,
      params
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function obter(req, res, next) {
  try {
    const id = inteiroPositivo(req.params.id);
    if (!id) return res.status(400).json({ erro: 'Template inválido.' });

    const [linhas] = await pool.query(
      `SELECT tae.*, u.nome AS nome_utilizador, u.email AS email_utilizador
         FROM template_assinatura_email tae
         JOIN utilizador u ON u.id_utilizador = tae.id_utilizador
        WHERE tae.id_template = ?`,
      [id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Template não encontrado.' });
    res.json({ dados: linhas[0] });
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const { erro, dados } = validarPayload(req.body);
    if (erro) return res.status(400).json({ erro });

    const [result] = await pool.query(
      `INSERT INTO template_assinatura_email (id_utilizador, nome_template, html_template, ativo)
       VALUES (?, ?, ?, ?)`,
      [dados.id_utilizador, dados.nome_template, dados.html_template, dados.ativo]
    );
    res.status(201).json({ mensagem: 'Template criado.', id_template: result.insertId });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const id = inteiroPositivo(req.params.id);
    if (!id) return res.status(400).json({ erro: 'Template inválido.' });

    const { erro, dados } = validarPayload(req.body, true);
    if (erro) return res.status(400).json({ erro });

    const campos = [];
    const valores = [];
    for (const campo of ['id_utilizador', 'nome_template', 'html_template', 'ativo']) {
      if (dados[campo] !== undefined) {
        campos.push(`${campo} = ?`);
        valores.push(dados[campo]);
      }
    }
    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    valores.push(id);
    const [result] = await pool.query(
      `UPDATE template_assinatura_email SET ${campos.join(', ')} WHERE id_template = ?`,
      valores
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Template não encontrado.' });
    res.json({ mensagem: 'Template atualizado.' });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const id = inteiroPositivo(req.params.id);
    if (!id) return res.status(400).json({ erro: 'Template inválido.' });

    const [result] = await pool.query('DELETE FROM template_assinatura_email WHERE id_template = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Template não encontrado.' });
    res.json({ mensagem: 'Template eliminado.' });
  } catch (err) { next(err); }
}

module.exports = { listar, obter, criar, atualizar, eliminar };
