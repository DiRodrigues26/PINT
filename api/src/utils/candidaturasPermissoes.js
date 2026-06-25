const { pool } = require('../db/connection');

async function obterCandidaturaComAcesso(utilizador, idCandidatura) {
  const [linhas] = await pool.query(
    `SELECT cb.*, b.titulo AS titulo_badge, b.id_nivel,
            n.codigo_nivel, n.nome_nivel,
            n.id_area, a.nome AS nome_area,
            a.id_service_line, sl.nome AS nome_service_line,
            u.nome AS nome_consultor
       FROM candidatura_badge cb
       JOIN badge b ON b.id_badge = cb.id_badge
       JOIN nivel n ON n.id_nivel = b.id_nivel
       JOIN area a  ON a.id_area  = n.id_area
       JOIN service_line sl ON sl.id_service_line = a.id_service_line
       JOIN utilizador u ON u.id_utilizador = cb.id_consultor
      WHERE cb.id_candidatura = ?`,
    [idCandidatura]
  );

  const candidatura = linhas[0] || null;
  if (!candidatura) return { candidatura: null, permitido: false };

  const perfis = utilizador.perfis || [];
  const ehDono = candidatura.id_consultor === utilizador.id_utilizador;
  const temAcessoElevado = perfis.includes('Administrador') || perfis.includes('Talent Manager');

  if (ehDono || temAcessoElevado) return { candidatura, permitido: true };

  if (perfis.includes('Service Line')) {
    const [sl] = await pool.query(
      `SELECT 1
         FROM service_line_responsavel
        WHERE id_utilizador = ? AND id_service_line = ?
        LIMIT 1`,
      [utilizador.id_utilizador, candidatura.id_service_line]
    );
    if (sl.length > 0) return { candidatura, permitido: true };
  }

  return { candidatura, permitido: false };
}

module.exports = { obterCandidaturaComAcesso };
