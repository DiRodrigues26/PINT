const { pool } = require('../db/connection');

async function listarMinhas(req, res, next) {
  try {
    const { categoria, apenas_nao_lidas, arquivadas, pagina = 1, por_pagina = 30 } = req.query;
    const limit = Math.min(parseInt(por_pagina, 10) || 30, 100);
    const offset = (Math.max(parseInt(pagina, 10) || 1, 1) - 1) * limit;

    const where = ['id_utilizador = ?'];
    const params = [req.utilizador.id_utilizador];
    if (categoria) { where.push('categoria = ?'); params.push(categoria); }
    if (apenas_nao_lidas === '1') where.push('lida = 0');
    if (arquivadas === '1') where.push('arquivada = 1');
    else if (arquivadas === '0') where.push('arquivada = 0');

    const whereSQL = `WHERE ${where.join(' AND ')}`;

    const [linhas] = await pool.query(
      `SELECT * FROM notificacao ${whereSQL} ORDER BY data_criacao DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM notificacao ${whereSQL}`,
      params
    );
    const [[{ nao_lidas }]] = await pool.query(
      `SELECT COUNT(*) AS nao_lidas FROM notificacao WHERE id_utilizador = ? AND lida = 0 AND arquivada = 0`,
      [req.utilizador.id_utilizador]
    );

    res.json({ dados: linhas, total, nao_lidas, pagina: Number(pagina), por_pagina: limit });
  } catch (err) { next(err); }
}

async function marcarLida(req, res, next) {
  try {
    const [result] = await pool.query(
      'UPDATE notificacao SET lida = 1 WHERE id_notificacao = ? AND id_utilizador = ?',
      [req.params.id, req.utilizador.id_utilizador]
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Notificação não encontrada.' });
    res.json({ mensagem: 'Notificação marcada como lida.' });
  } catch (err) { next(err); }
}

async function marcarTodasLidas(req, res, next) {
  try {
    await pool.query(
      'UPDATE notificacao SET lida = 1 WHERE id_utilizador = ? AND lida = 0',
      [req.utilizador.id_utilizador]
    );
    res.json({ mensagem: 'Todas as notificações marcadas como lidas.' });
  } catch (err) { next(err); }
}

async function arquivarLidas(req, res, next) {
  try {
    const [result] = await pool.query(
      'UPDATE notificacao SET arquivada = 1 WHERE id_utilizador = ? AND lida = 1 AND arquivada = 0',
      [req.utilizador.id_utilizador]
    );
    res.json({ mensagem: 'Notificações lidas arquivadas.', total: result.affectedRows });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM notificacao WHERE id_notificacao = ? AND id_utilizador = ?',
      [req.params.id, req.utilizador.id_utilizador]
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Notificação não encontrada.' });
    res.json({ mensagem: 'Notificação eliminada.' });
  } catch (err) { next(err); }
}

module.exports = { listarMinhas, marcarLida, marcarTodasLidas, arquivarLidas, eliminar };
