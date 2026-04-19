const { pool } = require('../db/connection');

async function listarAtivos(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT ai.*, u.nome AS nome_criador
         FROM aviso_informacao ai
         JOIN utilizador u ON u.id_utilizador = ai.id_criador
        WHERE ai.ativo = 1
          AND (ai.data_inicio IS NULL OR ai.data_inicio <= CURRENT_TIMESTAMP)
          AND (ai.data_fim    IS NULL OR ai.data_fim    >= CURRENT_TIMESTAMP)
        ORDER BY ai.created_at DESC`
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function listarTodos(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT ai.*, u.nome AS nome_criador
         FROM aviso_informacao ai
         JOIN utilizador u ON u.id_utilizador = ai.id_criador
        ORDER BY ai.created_at DESC`
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const { titulo, conteudo, tipo = 'INFORMACAO', data_inicio, data_fim, ativo = 1 } = req.body;
    if (!titulo) return res.status(400).json({ erro: 'Título é obrigatório.' });

    const [result] = await pool.query(
      `INSERT INTO aviso_informacao (id_criador, titulo, conteudo, tipo, data_inicio, data_fim, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.utilizador.id_utilizador, titulo, conteudo || null, tipo,
       data_inicio || null, data_fim || null, ativo ? 1 : 0]
    );
    res.status(201).json({ mensagem: 'Aviso criado.', id_aviso: result.insertId });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const editaveis = ['titulo', 'conteudo', 'tipo', 'data_inicio', 'data_fim', 'ativo'];
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
      `UPDATE aviso_informacao SET ${campos.join(', ')} WHERE id_aviso = ?`,
      valores
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Aviso não encontrado.' });
    res.json({ mensagem: 'Aviso atualizado.' });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query('DELETE FROM aviso_informacao WHERE id_aviso = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Aviso não encontrado.' });
    res.json({ mensagem: 'Aviso eliminado.' });
  } catch (err) { next(err); }
}

module.exports = { listarAtivos, listarTodos, criar, atualizar, eliminar };
