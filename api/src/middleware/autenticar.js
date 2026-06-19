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

    const nomesPerfis = perfis.map(p => p.nome_perfil);

    // Área + Service Line do consultor (para o perfil e dashboards)
    let areaInfo = {};
    if (nomesPerfis.includes('Consultor')) {
      const [areaRows] = await pool.query(
        `SELECT a.id_area, a.nome AS nome_area, sl.id_service_line, sl.nome AS nome_service_line
           FROM consultor_area ca
           JOIN area a          ON a.id_area = ca.id_area
           JOIN service_line sl ON sl.id_service_line = a.id_service_line
          WHERE ca.id_utilizador = ? AND ca.ativo = 1
          LIMIT 1`,
        [utilizador.id_utilizador]
      );
      areaInfo = areaRows[0] || {};
    }

    req.utilizador = {
      ...utilizador,
      perfis: nomesPerfis,
      ids_perfis: perfis.map(p => p.id_perfil),
      id_area: areaInfo.id_area || null,
      nome_area: areaInfo.nome_area || null,
      id_service_line: areaInfo.id_service_line || null,
      nome_service_line: areaInfo.nome_service_line || null,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ erro: 'Token expirado.' });
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ erro: 'Token inválido.' });
    next(err);
  }
}

module.exports = { autenticar };
