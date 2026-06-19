const { pool } = require('../db/connection');
const { gerarCertificadoPDF } = require('../utils/certificado');

/* Verifica se o consultor deu (e mantém) um consentimento RGPD do tipo indicado */
async function temConsentimento(idUtilizador, tipo) {
  const [r] = await pool.query(
    `SELECT aceite FROM consentimento_rgpd
      WHERE id_utilizador = ? AND tipo_consentimento = ?
      ORDER BY id_consentimento DESC LIMIT 1`,
    [idUtilizador, tipo]
  );
  return r.length > 0 && !!r[0].aceite;
}

function temAcessoGlobal(perfis = []) {
  return perfis.includes('Administrador') || perfis.includes('Talent Manager');
}

async function obterServiceLineResponsavel(idUtilizador) {
  const [linhas] = await pool.query(
    'SELECT id_service_line FROM service_line_responsavel WHERE id_utilizador = ? LIMIT 1',
    [idUtilizador]
  );
  return linhas[0]?.id_service_line || null;
}

async function consultorPertenceServiceLine(idConsultor, idServiceLine) {
  const [linhas] = await pool.query(
    `SELECT 1
       FROM consultor_area ca
       JOIN area a ON a.id_area = ca.id_area
      WHERE ca.id_utilizador = ? AND ca.ativo = 1 AND a.id_service_line = ?
      LIMIT 1`,
    [idConsultor, idServiceLine]
  );
  return linhas.length > 0;
}

async function listarMeus(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT ba.*, b.titulo, b.imagem_url, b.descricao,
              COALESCE(ba.pontos_atribuidos, b.pontos, 0) AS pontos,
              b.pontos AS pontos_badge_atual,
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

    // scope: admin/talent veem global; service line vê apenas a sua SL; consultor vê apenas públicos se não for dono
    const perfis = req.utilizador.perfis;
    const ehDono = Number(id) === req.utilizador.id_utilizador;
    const acessoGlobal = temAcessoGlobal(perfis);

    const where = ['ba.id_consultor = ?'];
    const params = [id];
    if (!ehDono && acessoGlobal) {
      // acesso total
    } else if (!ehDono && perfis.includes('Service Line')) {
      const idServiceLine = await obterServiceLineResponsavel(req.utilizador.id_utilizador);
      if (!idServiceLine) return res.status(403).json({ erro: 'Sem service line associada.' });
      if (!(await consultorPertenceServiceLine(id, idServiceLine))) {
        return res.status(403).json({ erro: 'Sem permissão para este consultor.' });
      }
      where.push('sl.id_service_line = ?');
      params.push(idServiceLine);
    } else if (!ehDono) {
      where.push('ba.publicado = 1');
    }

    const [linhas] = await pool.query(
      `SELECT ba.id_badge_atribuido, ba.data_atribuicao, ba.data_expiracao, ba.publicado,
              ba.codigo_publico, ba.url_publica, ba.linkedin_shared,
              b.id_badge, b.titulo, b.imagem_url,
              COALESCE(ba.pontos_atribuidos, b.pontos, 0) AS pontos,
              b.pontos AS pontos_badge_atual,
              n.codigo_nivel, n.nome_nivel,
              a.nome AS nome_area, sl.id_service_line, sl.nome AS nome_service_line
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

    // RGPD (req 10): partilhar exige consentimento de partilha no LinkedIn
    const consentido = await temConsentimento(req.utilizador.id_utilizador, 'partilha_linkedin');
    if (!consentido) {
      return res.status(403).json({ erro: 'Deve aceitar o consentimento de partilha no LinkedIn nas definições de privacidade.' });
    }

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

// Gera e devolve o certificado em PDF (req 18 consultor / 15 SL / 17 TM)
async function gerarCertificado(req, res, next) {
  try {
    const { id } = req.params;
    const [linhas] = await pool.query(
      `SELECT ba.id_badge_atribuido, ba.id_consultor, ba.data_atribuicao, ba.data_expiracao,
              ba.codigo_publico, ba.token_publico,
              COALESCE(ba.pontos_atribuidos, b.pontos, 0) AS pontos,
              b.titulo,
              n.codigo_nivel, n.nome_nivel,
              a.nome AS nome_area, sl.id_service_line, sl.nome AS nome_service_line,
              u.nome AS nome_consultor
         FROM badge_atribuido ba
         JOIN badge b         ON b.id_badge = ba.id_badge
         JOIN nivel n         ON n.id_nivel = b.id_nivel
         JOIN area a          ON a.id_area  = n.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         JOIN utilizador u    ON u.id_utilizador = ba.id_consultor
        WHERE ba.id_badge_atribuido = ?`,
      [id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Badge atribuído não encontrado.' });

    const dados = linhas[0];

    // Apenas o dono ou perfis com permissão de gestão podem descarregar
    const perfis = req.utilizador.perfis;
    const ehDono = dados.id_consultor === req.utilizador.id_utilizador;
    const acessoGlobal = temAcessoGlobal(perfis);
    let acessoServiceLine = false;
    if (!ehDono && !acessoGlobal && perfis.includes('Service Line')) {
      const idServiceLine = await obterServiceLineResponsavel(req.utilizador.id_utilizador);
      acessoServiceLine = !!idServiceLine && Number(idServiceLine) === Number(dados.id_service_line);
    }
    if (!ehDono && !acessoGlobal && !acessoServiceLine) {
      return res.status(403).json({ erro: 'Sem permissão para descarregar este certificado.' });
    }

    // O QR aponta sempre à página pública humana (derivada do token, não do url guardado)
    const baseFrontend = process.env.FRONTEND_URL || process.env.APP_URL || '';
    dados.url_publica = `${baseFrontend}/verificar/${dados.token_publico}`;

    const pdf = await gerarCertificadoPDF(dados);
    const nomeFicheiro = `certificado-${(dados.titulo || 'badge').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeFicheiro}"`);
    res.send(pdf);
  } catch (err) { next(err); }
}

// Endpoint público (sem auth)
async function verificarPublico(req, res, next) {
  try {
    const { token } = req.params;
    const [linhas] = await pool.query(
      `SELECT ba.id_badge_atribuido, ba.data_atribuicao, ba.data_expiracao,
              ba.codigo_publico, ba.url_publica, ba.publicado,
              b.id_badge, b.titulo, b.descricao, b.imagem_url,
              COALESCE(ba.pontos_atribuidos, b.pontos, 0) AS pontos,
              b.pontos AS pontos_badge_atual,
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

    // RGPD: a página pública só está disponível se o titular consentiu a publicação
    const consentido = await temConsentimento(b.id_utilizador, 'publicacao_badge');
    if (!consentido) {
      return res.status(403).json({ erro: 'Este badge não está disponível publicamente. O titular não autorizou a publicação.' });
    }

    const expirado = !!(b.data_expiracao && new Date(b.data_expiracao) < new Date());

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

    // RGPD: a galeria pública só mostra badges se o titular consentiu a publicação
    const consentido = await temConsentimento(u.id_utilizador, 'publicacao_badge');
    if (!consentido) {
      return res.json({ perfil: { nome: u.nome, url_slug: u.url_slug }, badges: [], consentido: false });
    }

    const [badges] = await pool.query(
      `SELECT ba.id_badge_atribuido, ba.data_atribuicao, ba.data_expiracao,
              ba.codigo_publico, ba.token_publico, ba.url_publica,
              b.titulo, b.imagem_url,
              COALESCE(ba.pontos_atribuidos, b.pontos, 0) AS pontos,
              b.pontos AS pontos_badge_atual,
              n.codigo_nivel, n.nome_nivel,
              a.nome AS nome_area
         FROM badge_atribuido ba
         JOIN badge b ON b.id_badge = ba.id_badge
         JOIN nivel n ON n.id_nivel = b.id_nivel
         JOIN area a  ON a.id_area  = n.id_area
        WHERE ba.id_consultor = ?
        ORDER BY ba.data_atribuicao DESC`,
      [u.id_utilizador]
    );

    res.json({ perfil: { nome: u.nome, url_slug: u.url_slug }, badges, consentido: true });
  } catch (err) { next(err); }
}

module.exports = {
  listarMeus,
  listarDeConsultor,
  publicar,
  despublicar,
  marcarPartilhadoLinkedin,
  badgesProximosExpiracao,
  gerarCertificado,
  verificarPublico,
  perfilPublico,
};
