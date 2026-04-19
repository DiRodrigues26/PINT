const { pool } = require('../db/connection');

async function listar(req, res, next) {
  try {
    const { id_utilizador } = req.query;
    const alvo = id_utilizador || req.utilizador.id_utilizador;

    // se não é o próprio e não tem perfil elevado, bloquear
    if (Number(alvo) !== req.utilizador.id_utilizador) {
      const perfis = req.utilizador.perfis;
      const permitido = perfis.includes('Administrador') || perfis.includes('Talent Manager');
      if (!permitido) return res.status(403).json({ erro: 'Sem permissão.' });
    }

    const [linhas] = await pool.query(
      'SELECT * FROM timeline_objetivo WHERE id_utilizador = ? ORDER BY data_inicio ASC, created_at DESC',
      [alvo]
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const { id_utilizador, titulo, descricao, data_inicio, data_fim, estado = 'PENDENTE' } = req.body;
    if (!titulo) return res.status(400).json({ erro: 'Título é obrigatório.' });

    const alvo = id_utilizador || req.utilizador.id_utilizador;
    if (Number(alvo) !== req.utilizador.id_utilizador) {
      const perfis = req.utilizador.perfis;
      const permitido = perfis.includes('Administrador') || perfis.includes('Talent Manager');
      if (!permitido) return res.status(403).json({ erro: 'Sem permissão para criar objetivos a outros.' });
    }

    const [result] = await pool.query(
      `INSERT INTO timeline_objetivo (id_utilizador, titulo, descricao, data_inicio, data_fim, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [alvo, titulo, descricao || null, data_inicio || null, data_fim || null, estado]
    );
    res.status(201).json({ mensagem: 'Objetivo criado.', id_objetivo: result.insertId });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const [obj] = await pool.query(
      'SELECT id_utilizador FROM timeline_objetivo WHERE id_objetivo = ?',
      [req.params.id]
    );
    if (obj.length === 0) return res.status(404).json({ erro: 'Objetivo não encontrado.' });

    if (obj[0].id_utilizador !== req.utilizador.id_utilizador) {
      const perfis = req.utilizador.perfis;
      const permitido = perfis.includes('Administrador') || perfis.includes('Talent Manager');
      if (!permitido) return res.status(403).json({ erro: 'Sem permissão.' });
    }

    const editaveis = ['titulo', 'descricao', 'data_inicio', 'data_fim', 'estado'];
    const campos = [];
    const valores = [];
    for (const c of editaveis) {
      if (req.body[c] !== undefined) { campos.push(`${c} = ?`); valores.push(req.body[c]); }
    }
    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    valores.push(req.params.id);
    await pool.query(
      `UPDATE timeline_objetivo SET ${campos.join(', ')} WHERE id_objetivo = ?`,
      valores
    );
    res.json({ mensagem: 'Objetivo atualizado.' });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const [obj] = await pool.query(
      'SELECT id_utilizador FROM timeline_objetivo WHERE id_objetivo = ?',
      [req.params.id]
    );
    if (obj.length === 0) return res.status(404).json({ erro: 'Objetivo não encontrado.' });
    if (obj[0].id_utilizador !== req.utilizador.id_utilizador) {
      const perfis = req.utilizador.perfis;
      const permitido = perfis.includes('Administrador') || perfis.includes('Talent Manager');
      if (!permitido) return res.status(403).json({ erro: 'Sem permissão.' });
    }

    await pool.query('DELETE FROM timeline_objetivo WHERE id_objetivo = ?', [req.params.id]);
    res.json({ mensagem: 'Objetivo eliminado.' });
  } catch (err) { next(err); }
}

module.exports = { listar, criar, atualizar, eliminar };
