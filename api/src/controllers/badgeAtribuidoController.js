const { pool } = require('../db/connection');

async function listarMeus(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT ba.*, b.titulo, b.imagem_url, b.descricao, b.pontos,
              n.codigo_nivel, n.nome_nivel,
              a.nome AS nome_area,
              sl.nome AS nome_service_line
         FROM badge_atribuido ba
         JOIN badge b ON b.id_badge = ba.id_badge
         JOIN nivel n ON n.id_nivel = b.id_nivel
         JOIN area a  ON a.id_area  = n.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
        WHERE ba.id_consultor = ?
        ORDER BY ba.data_atribuicao DESC`,
      [req.utilizador.id_utilizador]
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function listarDeConsultor(req, res, next) {
  try {
    const { id } = req.params;

    // scope: admin/talent/service line veem; consultor vê apenas públicos (publicado=1) se não for dono
    const perfis = req.utilizador.perfis;
    const ehDono = Number(id) === req.utilizador.id_utilizador;
    const temAcesso = perfis.includes('Administrador') || perfis.includes('Talent Manager') || perfis.includes('Service Line');

    const where = ['ba.id_consultor = ?'];
    const params = [id];
    if (!ehDono && !temAcesso) {
      where.push('ba.publicado = 1');
    }

    const [linhas] = await pool.query(
      `SELECT ba.id_badge_atribuido, ba.data_atribuicao, ba.data_expiracao, ba.publicado,
              ba.codigo_publico, ba.url_publica, ba.linkedin_shared,
              b.id_badge, b.titulo, b.imagem_url, b.pontos,
              n.codigo_nivel, n.nome_nivel,
              a.nome AS nome_area, sl.nome AS nome_service_line
         FROM badge_atribuido ba
         JOIN badge b ON b.id_badge = ba.id_badge
         JOIN nivel n ON n.id_nivel = b.id_nivel
         JOIN area a  ON a.id_area  = n.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
        WHERE ${where.join(' AND ')}
        ORDER BY ba.data_atribuicao DESC`,
      params
    );

    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function publicar(req, res, next) {
  try {
    const { id } = req.params;
    const [ba] = await pool.query(
      'SELECT id_consultor FROM badge_atribuido WHERE id_badge_atribuido = ?',
      [id]
    );
    if (ba.length === 0) return res.status(404).json({ erro: 'Badge atribuído não encontrado.' });
    if (ba[0].id_consultor !== req.utilizador.id_utilizador) {
      return res.status(403).json({ erro: 'Apenas o dono pode publicar.' });
    }

    // verificar consentimento RGPD
    const [consent] = await pool.query(
      `SELECT aceite FROM consentimento_rgpd
        WHERE id_utilizador = ? AND tipo_consentimento = 'publicacao_badge'
        ORDER BY id_consentimento DESC LIMIT 1`,
      [req.utilizador.id_utilizador]
    );
    if (consent.length === 0 || !consent[0].aceite) {
      return res.status(403).json({ erro: 'Deve aceitar os termos RGPD de publicação primeiro.' });
    }

    await pool.query(
      'UPDATE badge_atribuido SET publicado = 1 WHERE id_badge_atribuido = ?',
      [id]
    );
    res.json({ mensagem: 'Badge publicado.' });
  } catch (err) { next(err); }
}

async function despublicar(req, res, next) {
  try {
    const { id } = req.params;
    const [ba] = await pool.query(
      'SELECT id_consultor FROM badge_atribuido WHERE id_badge_atribuido = ?',
      [id]
    );
    if (ba.length === 0) return res.status(404).json({ erro: 'Badge atribuído não encontrado.' });
    if (ba[0].id_consultor !== req.utilizador.id_utilizador) {
      return res.status(403).json({ erro: 'Apenas o dono pode despublicar.' });
    }

    await pool.query(
      'UPDATE badge_atribuido SET publicado = 0 WHERE id_badge_atribuido = ?',
      [id]
    );
    res.json({ mensagem: 'Badge despublicado.' });
  } catch (err) { next(err); }
}

async function marcarPartilhadoLinkedin(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE badge_atribuido SET linkedin_shared = 1 WHERE id_badge_atribuido = ? AND id_consultor = ?',
      [id, req.utilizador.id_utilizador]
    );
    res.json({ mensagem: 'Partilha registada.' });
  } catch (err) { next(err); }
}

async function badgesProximosExpiracao(req, res, next) {
  try {
    const { dias = 30 } = req.query;
    const [linhas] = await pool.query(
      `SELECT ba.id_badge_atribuido, ba.data_expiracao,
              b.titulo, b.imagem_url,
              u.id_utilizador, u.nome AS nome_consultor, u.email
         FROM badge_atribuido ba
         JOIN badge b      ON b.id_badge      = ba.id_badge
         JOIN utilizador u ON u.id_utilizador = ba.id_consultor
        WHERE ba.data_expiracao IS NOT NULL
          AND ba.data_expiracao BETWEEN CURRENT_TIMESTAMP AND DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY)
        ORDER BY ba.data_expiracao ASC`,
      [parseInt(dias, 10)]
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

// Endpoint público (sem auth)
async function verificarPublico(req, res, next) {
  try {
    const { token } = req.params;
    const [linhas] = await pool.query(
      `SELECT ba.id_badge_atribuido, ba.data_atribuicao, ba.data_expiracao,
              ba.codigo_publico, ba.url_publica, ba.publicado,
              b.id_badge, b.titulo, b.descricao, b.imagem_url, b.pontos,
              b.competencias_certificadas, b.sobre_certificacao,
              n.codigo_nivel, n.nome_nivel,
              a.nome AS nome_area, sl.nome AS nome_service_line,
              u.id_utilizador, u.nome AS nome_consultor, u.url_slug
         FROM badge_atribuido ba
         JOIN badge b         ON b.id_badge = ba.id_badge
         JOIN nivel n         ON n.id_nivel = b.id_nivel
         JOIN area a          ON a.id_area  = n.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         JOIN utilizador u    ON u.id_utilizador = ba.id_consultor
        WHERE ba.token_publico = ?`,
      [token]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Badge não encontrado.' });

    const b = linhas[0];
    const expirado = b.data_expiracao && new Date(b.data_expiracao) < new Date();

    res.json({
      valido: !expirado,
      expirado,
      badge: b,
    });
  } catch (err) { next(err); }
}

async function perfilPublico(req, res, next) {
  try {
    const { slug } = req.params;
    const [utilizadores] = await pool.query(
      `SELECT id_utilizador, nome, url_slug FROM utilizador
        WHERE url_slug = ? AND ativo = 1`,
      [slug]
    );
    if (utilizadores.length === 0) return res.status(404).json({ erro: 'Perfil não encontrado.' });

    const u = utilizadores[0];
    const [badges] = await pool.query(
      `SELECT ba.id_badge_atribuido, ba.data_atribuicao, ba.data_expiracao,
              ba.codigo_publico, ba.token_publico, ba.url_publica,
              b.titulo, b.imagem_url,
              n.codigo_nivel, n.nome_nivel,
              a.nome AS nome_area
         FROM badge_atribuido ba
         JOIN badge b ON b.id_badge = ba.id_badge
         JOIN nivel n ON n.id_nivel = b.id_nivel
         JOIN area a  ON a.id_area  = n.id_area
        WHERE ba.id_consultor = ? AND ba.publicado = 1
        ORDER BY ba.data_atribuicao DESC`,
      [u.id_utilizador]
    );

    res.json({ perfil: { nome: u.nome, url_slug: u.url_slug }, badges });
  } catch (err) { next(err); }
}

module.exports = {
  listarMeus,
  listarDeConsultor,
  publicar,
  despublicar,
  marcarPartilhadoLinkedin,
  badgesProximosExpiracao,
  verificarPublico,
  perfilPublico,
};
