const bcrypt = require('bcryptjs');
const { pool } = require('../db/connection');
const { assinarToken } = require('../utils/jwt');
const { gerarTokenAleatorio } = require('../utils/tokens');
const { gerarSlug } = require('../utils/slug');
const {
  enviarConfirmacaoRegisto,
  enviarRecuperacaoPassword,
} = require('../utils/email');
const { calcularSaudacao } = require('../utils/saudacao');

const PERFIS_PERMITIDOS_REGISTO = ['Consultor', 'Service Line', 'Talent Manager'];

async function gerarSlugUnico(nome) {
  const base = gerarSlug(nome) || 'utilizador';
  let slug = base;
  let i = 1;
  while (true) {
    const [existe] = await pool.query(
      'SELECT 1 FROM utilizador WHERE url_slug = ? LIMIT 1',
      [slug]
    );
    if (existe.length === 0) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
}

async function registar(req, res, next) {
  try {
    const { email, password, idioma } = req.body;

    if (!email || !password) {
      return res.status(400).json({ erro: 'Email e password são obrigatórios.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ erro: 'Password deve ter pelo menos 8 caracteres.' });
    }

    const [existe] = await pool.query(
      'SELECT id_utilizador, email_confirmado FROM utilizador WHERE email = ?',
      [email]
    );
    if (existe.length > 0) {
      return res.status(409).json({ erro: 'Email já registado.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const tokenConfirmacao = gerarTokenAleatorio();
    const nomeTemporario = String(email).split('@')[0];
    const slug = await gerarSlugUnico(nomeTemporario);

    await pool.query(
      `INSERT INTO utilizador
         (nome, email, password_hash, idioma, token_confirmacao_email, url_slug, primeiro_login_pendente)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [nomeTemporario, email, passwordHash, idioma || 'pt', tokenConfirmacao, slug]
    );

    try {
      await enviarConfirmacaoRegisto({ email }, tokenConfirmacao);
    } catch (e) {
      console.warn('Aviso: falha ao enviar email de confirmação:', e.message);
    }

    res.status(201).json({
      mensagem: 'Registo efetuado. Verifique o seu email para confirmar a conta.',
    });
  } catch (err) {
    next(err);
  }
}

async function confirmarEmail(req, res, next) {
  try {
    const token = req.body?.token || req.query?.token || req.params?.token;
    if (!token) return res.status(400).json({ erro: 'Token em falta.' });

    const [linhas] = await pool.query(
      `SELECT id_utilizador, email_confirmado
         FROM utilizador
        WHERE token_confirmacao_email = ?`,
      [token]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Token inválido ou já utilizado.' });

    const u = linhas[0];

    // se ainda não tem perfil, considera-se "perfil pendente" → frontend redireciona para completar
    const [perfis] = await pool.query(
      'SELECT COUNT(*) AS n FROM utilizador_perfil WHERE id_utilizador = ?',
      [u.id_utilizador]
    );
    const requerPerfil = perfis[0].n === 0;

    if (!u.email_confirmado) {
      await pool.query(
        `UPDATE utilizador SET email_confirmado = 1 WHERE id_utilizador = ?`,
        [u.id_utilizador]
      );
    }

    res.json({
      mensagem: 'Email confirmado.',
      requer_perfil: requerPerfil,
    });
  } catch (err) {
    next(err);
  }
}

async function completarPerfil(req, res, next) {
  try {
    const { token, nome, perfil, id_service_line } = req.body;
    if (!token) return res.status(400).json({ erro: 'Token em falta.' });
    if (!nome || !perfil) {
      return res.status(400).json({ erro: 'Nome e perfil são obrigatórios.' });
    }
    if (!PERFIS_PERMITIDOS_REGISTO.includes(perfil)) {
      return res.status(400).json({ erro: 'Perfil inválido.' });
    }
    if (perfil === 'Consultor' && !id_service_line) {
      return res.status(400).json({ erro: 'Service Line é obrigatória para Consultor.' });
    }

    const [linhas] = await pool.query(
      `SELECT id_utilizador, email, idioma, ultimo_login, primeiro_login_pendente
         FROM utilizador
        WHERE token_confirmacao_email = ?`,
      [token]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Token inválido ou já utilizado.' });

    const u = linhas[0];

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const slug = await gerarSlugUnico(nome);

      await conn.query(
        `UPDATE utilizador
            SET nome = ?,
                url_slug = ?,
                email_confirmado = 1,
                token_confirmacao_email = NULL
          WHERE id_utilizador = ?`,
        [nome, slug, u.id_utilizador]
      );

      const [perfilRow] = await conn.query(
        'SELECT id_perfil FROM perfil WHERE nome_perfil = ?',
        [perfil]
      );
      if (perfilRow.length === 0) throw new Error(`Perfil "${perfil}" não configurado.`);

      await conn.query(
        `INSERT IGNORE INTO utilizador_perfil (id_utilizador, id_perfil)
         VALUES (?, ?)`,
        [u.id_utilizador, perfilRow[0].id_perfil]
      );

      if (perfil === 'Consultor' && id_service_line) {
        const [areas] = await conn.query(
          'SELECT id_area FROM area WHERE id_service_line = ? ORDER BY id_area ASC LIMIT 1',
          [id_service_line]
        );
        if (areas.length > 0) {
          await conn.query(
            `INSERT INTO consultor_area (id_utilizador, id_area)
             VALUES (?, ?)`,
            [u.id_utilizador, areas[0].id_area]
          );
        }
      }

      await conn.query(
        `INSERT IGNORE INTO preferencia_notificacao (id_utilizador) VALUES (?)`,
        [u.id_utilizador]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const jwt = assinarToken({ id_utilizador: u.id_utilizador });
    const saudacao = calcularSaudacao({
      ultimoLogin: u.ultimo_login,
      primeiroLoginPendente: !!u.primeiro_login_pendente,
      idioma: u.idioma,
    });

    await pool.query(
      'UPDATE utilizador SET ultimo_login = CURRENT_TIMESTAMP WHERE id_utilizador = ?',
      [u.id_utilizador]
    );

    res.status(201).json({
      mensagem: 'Registo concluído.',
      token: jwt,
      saudacao,
      utilizador: {
        id_utilizador: u.id_utilizador,
        nome,
        email: u.email,
        perfis: [perfil],
      },
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ erro: 'Email e password são obrigatórios.' });
    }

    const [linhas] = await pool.query(
      `SELECT id_utilizador, nome, email, password_hash, ativo, email_confirmado,
              primeiro_login_pendente, idioma, url_slug, ultimo_login
         FROM utilizador
        WHERE email = ?`,
      [email]
    );
    if (linhas.length === 0) return res.status(401).json({ erro: 'Credenciais inválidas.' });

    const u = linhas[0];
    if (!u.ativo) return res.status(403).json({ erro: 'Conta inativa.' });
    if (!u.email_confirmado) {
      return res.status(403).json({ erro: 'Email ainda não confirmado.' });
    }

    const valido = await bcrypt.compare(password, u.password_hash);
    if (!valido) return res.status(401).json({ erro: 'Credenciais inválidas.' });

    const [perfis] = await pool.query(
      `SELECT p.nome_perfil FROM utilizador_perfil up
         JOIN perfil p ON p.id_perfil = up.id_perfil
        WHERE up.id_utilizador = ?`,
      [u.id_utilizador]
    );
    const nomesPerfis = perfis.map(p => p.nome_perfil);

    const saudacao = calcularSaudacao({
      ultimoLogin: u.ultimo_login,
      primeiroLoginPendente: !!u.primeiro_login_pendente,
      idioma: u.idioma,
    });

    await pool.query(
      'UPDATE utilizador SET ultimo_login = CURRENT_TIMESTAMP WHERE id_utilizador = ?',
      [u.id_utilizador]
    );

    const token = assinarToken({ id_utilizador: u.id_utilizador });

    res.json({
      mensagem: 'Login efetuado com sucesso.',
      token,
      saudacao,
      utilizador: {
        id_utilizador: u.id_utilizador,
        nome: u.nome,
        email: u.email,
        idioma: u.idioma,
        url_slug: u.url_slug,
        primeiro_login_pendente: !!u.primeiro_login_pendente,
        perfis: nomesPerfis,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function alterarPasswordPrimeiroLogin(req, res, next) {
  try {
    const { nova_password } = req.body;
    if (!nova_password || String(nova_password).length < 8) {
      return res.status(400).json({ erro: 'Nova password deve ter pelo menos 8 caracteres.' });
    }

    const passwordHash = await bcrypt.hash(nova_password, 10);
    await pool.query(
      `UPDATE utilizador
          SET password_hash = ?,
              primeiro_login_pendente = 0
        WHERE id_utilizador = ?`,
      [passwordHash, req.utilizador.id_utilizador]
    );

    res.json({ mensagem: 'Password alterada com sucesso.' });
  } catch (err) {
    next(err);
  }
}

async function pedirRecuperacao(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ erro: 'Email é obrigatório.' });

    const [linhas] = await pool.query(
      'SELECT id_utilizador, nome, email FROM utilizador WHERE email = ?',
      [email]
    );

    if (linhas.length === 0) {
      return res.json({ mensagem: 'Se o email existir, será enviado um link de recuperação.' });
    }

    const token = gerarTokenAleatorio();
    const expira = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `UPDATE utilizador
          SET token_recuperacao_password = ?,
              token_recuperacao_expira = ?
        WHERE id_utilizador = ?`,
      [token, expira, linhas[0].id_utilizador]
    );

    try {
      await enviarRecuperacaoPassword(linhas[0], token);
    } catch (e) {
      console.warn('Aviso: falha ao enviar email de recuperação:', e.message);
    }

    res.json({ mensagem: 'Se o email existir, será enviado um link de recuperação.' });
  } catch (err) {
    next(err);
  }
}

async function redefinirPassword(req, res, next) {
  try {
    const { token, nova_password, confirmar_password } = req.body;
    if (!token || !nova_password || !confirmar_password) {
      return res.status(400).json({ erro: 'Token, nova password e confirmação são obrigatórios.' });
    }
    if (nova_password !== confirmar_password) {
      return res.status(400).json({ erro: 'As passwords não coincidem.' });
    }
    if (String(nova_password).length < 8) {
      return res.status(400).json({ erro: 'Password deve ter pelo menos 8 caracteres.' });
    }

    const [linhas] = await pool.query(
      `SELECT id_utilizador
         FROM utilizador
        WHERE token_recuperacao_password = ?
          AND token_recuperacao_expira > CURRENT_TIMESTAMP`,
      [token]
    );
    if (linhas.length === 0) {
      return res.status(400).json({ erro: 'Token inválido ou expirado.' });
    }

    const passwordHash = await bcrypt.hash(nova_password, 10);
    await pool.query(
      `UPDATE utilizador
          SET password_hash = ?,
              token_recuperacao_password = NULL,
              token_recuperacao_expira = NULL
        WHERE id_utilizador = ?`,
      [passwordHash, linhas[0].id_utilizador]
    );

    res.json({ mensagem: 'A sua password foi redefinida com sucesso.' });
  } catch (err) {
    next(err);
  }
}

async function eu(req, res) {
  res.json({ utilizador: req.utilizador });
}

module.exports = {
  registar,
  confirmarEmail,
  completarPerfil,
  login,
  alterarPasswordPrimeiroLogin,
  pedirRecuperacao,
  redefinirPassword,
  eu,
};
