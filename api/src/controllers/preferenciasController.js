const { pool } = require('../db/connection');

async function obterMinhas(req, res, next) {
  try {
    const [linhas] = await pool.query(
      'SELECT * FROM preferencia_notificacao WHERE id_utilizador = ?',
      [req.utilizador.id_utilizador]
    );
    if (linhas.length === 0) {
      // criar por omissão
      await pool.query(
        'INSERT INTO preferencia_notificacao (id_utilizador) VALUES (?)',
        [req.utilizador.id_utilizador]
      );
      const [novo] = await pool.query(
        'SELECT * FROM preferencia_notificacao WHERE id_utilizador = ?',
        [req.utilizador.id_utilizador]
      );
      return res.json({ preferencias: novo[0] });
    }
    res.json({ preferencias: linhas[0] });
  } catch (err) { next(err); }
}

async function atualizarMinhas(req, res, next) {
  try {
    const { email_aprovacao_badge, notif_expiracao, notif_recomendacoes } = req.body;
    const campos = [];
    const valores = [];

    if (email_aprovacao_badge !== undefined) {
      campos.push('email_aprovacao_badge = ?'); valores.push(email_aprovacao_badge ? 1 : 0);
    }
    if (notif_expiracao !== undefined) {
      campos.push('notif_expiracao = ?'); valores.push(notif_expiracao ? 1 : 0);
    }
    if (notif_recomendacoes !== undefined) {
      campos.push('notif_recomendacoes = ?'); valores.push(notif_recomendacoes ? 1 : 0);
    }
    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    valores.push(req.utilizador.id_utilizador);
    await pool.query(
      `UPDATE preferencia_notificacao SET ${campos.join(', ')} WHERE id_utilizador = ?`,
      valores
    );
    res.json({ mensagem: 'Preferências atualizadas.' });
  } catch (err) { next(err); }
}

module.exports = { obterMinhas, atualizarMinhas };
