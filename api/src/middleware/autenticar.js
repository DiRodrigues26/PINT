const { verificarToken } = require('../utils/jwt');
const { pool } = require('../db/connection');

async function autenticar(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) return res.status(401).json({ erro: 'Token não fornecido.' });

    const payload = verificarToken(token);

    const [linhas] = await pool.query(
      `SELECT u.id_utilizador, u.nome, u.email, u.ativo, u.email_confirmado,
              u.primeiro_login_pendente, u.idioma, u.url_slug
         FROM utilizador u
        WHERE u.id_utilizador = ?`,
      [payload.id_utilizador]
    );

    if (linhas.length === 0) return res.status(401).json({ erro: 'Utilizador não encontrado.' });

    const utilizador = linhas[0];
    if (!utilizador.ativo) return res.status(403).json({ erro: 'Conta inativa.' });

    const [perfis] = await pool.query(
      `SELECT p.id_perfil, p.nome_perfil
         FROM utilizador_perfil up
         JOIN perfil p ON p.id_perfil = up.id_perfil
        WHERE up.id_utilizador = ?`,
      [utilizador.id_utilizador]
    );

    req.utilizador = {
      ...utilizador,
      perfis: perfis.map(p => p.nome_perfil),
      ids_perfis: perfis.map(p => p.id_perfil),
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ erro: 'Token expirado.' });
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ erro: 'Token inválido.' });
    next(err);
  }
}

module.exports = { autenticar };
