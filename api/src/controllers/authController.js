const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const speakeasy = require('speakeasy');
const { pool } = require('../db/connection');
const { assinarToken } = require('../utils/jwt');

/* Sessões temporárias de pre-auth para 2FA (em memória, TTL 5 min) */
const preAuthSessions = new Map();
setInterval(() => {
  const agora = Date.now();
  for (const [k, v] of preAuthSessions) if (v.expires_at < agora) preAuthSessions.delete(k);
}, 60_000);
const { gerarTokenAleatorio } = require('../utils/tokens');
const { gerarSlug } = require('../utils/slug');
const {
  enviarConfirmacaoRegisto,
  enviarRecuperacaoPassword,
} = require('../utils/email');
const { podeEnviarEmail } = require('../utils/configNotificacao');
const { calcularSaudacao, tipoSaudacao } = require('../utils/saudacao');
const { contemEmoji } = require('../utils/validacao');
const {
  dataExpiracaoConfirmacao,
  garantirColunaTokenConfirmacaoExpira,
  tokenConfirmacaoExpirado,
} = require('../utils/confirmacaoEmail');

const PERFIS_PERMITIDOS_REGISTO = ['Consultor'];

/*
 * URL pública base para os links dos emails. Em produção (deploy de serviço
 * único), a origem real do pedido é o domínio público — usamo-la para os links
 * nunca apontarem para localhost. Em desenvolvimento (host localhost), usamos
 * FRONTEND_URL (ex.: http://localhost:5173, onde corre o Vite).
 */
function urlBasePublica(req) {
  const proto = String(req?.headers?.['x-forwarded-proto'] || req?.protocol || '').split(',')[0].trim();
  const host = String(req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').split(',')[0].trim();
  const daRequest = host ? `${proto || 'https'}://${host}` : null;
  const env = String(process.env.FRONTEND_URL || '').split(',')[0].trim();

  if (daRequest && !/^localhost|127\.0\.0\.1/.test(host)) return daRequest;
  if (env) return env;
  return daRequest || 'http://localhost:5173';
}

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
    if (contemEmoji(email)) {
      return res.status(400).json({ erro: 'O email não pode conter emojis.' });
    }
    if (contemEmoji(password)) {
      return res.status(400).json({ erro: 'A password não pode conter emojis.' });
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
    const tokenConfirmacaoExpira = dataExpiracaoConfirmacao();
    const nomeTemporario = String(email).split('@')[0];
    const slug = await gerarSlugUnico(nomeTemporario);
    await garantirColunaTokenConfirmacaoExpira();

    await pool.query(
      `INSERT INTO utilizador
         (nome, email, password_hash, idioma, token_confirmacao_email, token_confirmacao_expira, url_slug, primeiro_login_pendente)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [nomeTemporario, email, passwordHash, idioma || 'pt', tokenConfirmacao, tokenConfirmacaoExpira, slug]
    );

    try {
      if (await podeEnviarEmail('email_confirmacao_registo')) {
        await enviarConfirmacaoRegisto({ email }, tokenConfirmacao, urlBasePublica(req));
      }
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
    await garantirColunaTokenConfirmacaoExpira();

    const [linhas] = await pool.query(
      `SELECT id_utilizador, email_confirmado, primeiro_login_pendente, token_confirmacao_expira
         FROM utilizador
        WHERE token_confirmacao_email = ?`,
      [token]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Token inválido ou já utilizado.' });

    const u = linhas[0];
    if (tokenConfirmacaoExpirado(u.token_confirmacao_expira)) {
      await pool.query(
        'UPDATE utilizador SET token_confirmacao_email = NULL, token_confirmacao_expira = NULL WHERE id_utilizador = ?',
        [u.id_utilizador]
      );
      return res.status(400).json({ erro: 'Token expirado. Peça um novo registo ou contacto ao administrador.' });
    }

    // se ainda não tem perfil, considera-se "perfil pendente" → frontend redireciona para completar
    const [perfis] = await pool.query(
      'SELECT COUNT(*) AS n FROM utilizador_perfil WHERE id_utilizador = ?',
      [u.id_utilizador]
    );
    const requerPerfil = perfis[0].n === 0;

    let tokenPassword = null;

    if (requerPerfil) {
      if (!u.email_confirmado) {
        await pool.query(
          `UPDATE utilizador SET email_confirmado = 1 WHERE id_utilizador = ?`,
          [u.id_utilizador]
        );
      }
    } else if (u.primeiro_login_pendente) {
      tokenPassword = gerarTokenAleatorio();
      const expira = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await pool.query(
        `UPDATE utilizador
            SET email_confirmado = 1,
                token_confirmacao_email = NULL,
                token_confirmacao_expira = NULL,
                token_recuperacao_password = ?,
                token_recuperacao_expira = ?
          WHERE id_utilizador = ?`,
        [tokenPassword, expira, u.id_utilizador]
      );
    } else {
      await pool.query(
        `UPDATE utilizador
            SET email_confirmado = 1,
                token_confirmacao_email = NULL,
                token_confirmacao_expira = NULL
          WHERE id_utilizador = ?`,
        [u.id_utilizador]
      );
    }

    res.json({
      mensagem: 'Email confirmado.',
      requer_perfil: requerPerfil,
      requer_password: !requerPerfil && !!u.primeiro_login_pendente,
      token_password: tokenPassword,
    });
  } catch (err) {
    next(err);
  }
}

async function completarPerfil(req, res, next) {
  try {
    const { token, nome, perfil, id_area } = req.body;
    if (!token) return res.status(400).json({ erro: 'Token em falta.' });
    if (!nome || !perfil) {
      return res.status(400).json({ erro: 'Nome e perfil são obrigatórios.' });
    }
    if (!PERFIS_PERMITIDOS_REGISTO.includes(perfil)) {
      return res.status(400).json({ erro: 'Perfil inválido.' });
    }
    if (perfil === 'Consultor' && !id_area) {
      return res.status(400).json({ erro: 'Área é obrigatória para Consultor.' });
    }
    await garantirColunaTokenConfirmacaoExpira();

    const [linhas] = await pool.query(
      `SELECT id_utilizador, email, idioma, ultimo_login, primeiro_login_pendente, token_confirmacao_expira
         FROM utilizador
        WHERE token_confirmacao_email = ?`,
      [token]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Token inválido ou já utilizado.' });

    const u = linhas[0];
    if (tokenConfirmacaoExpirado(u.token_confirmacao_expira)) {
      await pool.query(
        'UPDATE utilizador SET token_confirmacao_email = NULL, token_confirmacao_expira = NULL WHERE id_utilizador = ?',
        [u.id_utilizador]
      );
      return res.status(400).json({ erro: 'Token expirado. Peça um novo registo ou contacto ao administrador.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const slug = await gerarSlugUnico(nome);

      await conn.query(
        `UPDATE utilizador
            SET nome = ?,
                url_slug = ?,
                email_confirmado = 1,
                token_confirmacao_email = NULL,
                token_confirmacao_expira = NULL
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

      // Consultor → associa a ÁREA escolhida (req 2: badges preferenciais da sua área)
      if (perfil === 'Consultor' && id_area) {
        await conn.query(
          `INSERT INTO consultor_area (id_utilizador, id_area) VALUES (?, ?)`,
          [u.id_utilizador, id_area]
        );
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
    // Após o registo o utilizador é sempre saudado com "Bem-vindo!" (enunciado, bónus)
    const saudacao = calcularSaudacao({ primeiroLoginPendente: true, idioma: u.idioma });
    const saudacao_tipo = 'BEM_VINDO';

    await pool.query(
      'UPDATE utilizador SET ultimo_login = CURRENT_TIMESTAMP WHERE id_utilizador = ?',
      [u.id_utilizador]
    );

    res.status(201).json({
      mensagem: 'Registo concluído.',
      token: jwt,
      saudacao,
      saudacao_tipo,
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

    /* ── Verificar se 2FA está ativo ──────────────────────────────────── */
    const [[dadosTotp]] = await pool.query(
      'SELECT totp_ativo FROM utilizador WHERE id_utilizador = ?',
      [u.id_utilizador]
    );
    if (dadosTotp?.totp_ativo) {
      const tmpToken = crypto.randomBytes(32).toString('hex');
      preAuthSessions.set(tmpToken, {
        id_utilizador: u.id_utilizador,
        expires_at: Date.now() + 5 * 60 * 1000,
      });
      return res.json({ requires_2fa: true, pre_auth_token: tmpToken });
    }

    const [perfis] = await pool.query(
      `SELECT p.nome_perfil FROM utilizador_perfil up
         JOIN perfil p ON p.id_perfil = up.id_perfil
        WHERE up.id_utilizador = ?`,
      [u.id_utilizador]
    );
    const nomesPerfis = perfis.map(p => p.nome_perfil);

    const saudacaoArgs = {
      ultimoLogin: u.ultimo_login,
      primeiroLoginPendente: !!u.primeiro_login_pendente,
    };
    const saudacao = calcularSaudacao({ ...saudacaoArgs, idioma: u.idioma });
    const saudacao_tipo = tipoSaudacao(saudacaoArgs);

    await pool.query(
      'UPDATE utilizador SET ultimo_login = CURRENT_TIMESTAMP WHERE id_utilizador = ?',
      [u.id_utilizador]
    );

    const token = assinarToken({ id_utilizador: u.id_utilizador });

    res.json({
      mensagem: 'Login efetuado com sucesso.',
      token,
      saudacao,
      saudacao_tipo,
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
      if (await podeEnviarEmail('email_redefinicao_password')) {
        await enviarRecuperacaoPassword(linhas[0], token, urlBasePublica(req));
      }
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
              token_recuperacao_expira = NULL,
              primeiro_login_pendente = 0
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

async function verificarDoisFatores(req, res, next) {
  try {
    const { pre_auth_token, codigo } = req.body;
    if (!pre_auth_token || !codigo) {
      return res.status(400).json({ erro: 'Token e código são obrigatórios.' });
    }

    const sessao = preAuthSessions.get(pre_auth_token);
    if (!sessao || sessao.expires_at < Date.now()) {
      preAuthSessions.delete(pre_auth_token);
      return res.status(401).json({ erro: 'Sessão expirada. Inicia o login novamente.' });
    }

    const { id_utilizador } = sessao;
    const [[u]] = await pool.query(
      `SELECT u.id_utilizador, u.nome, u.email, u.idioma, u.url_slug,
              u.primeiro_login_pendente, u.ultimo_login, u.totp_secret
         FROM utilizador u
        WHERE u.id_utilizador = ?`,
      [id_utilizador]
    );

    if (!u?.totp_secret) {
      return res.status(400).json({ erro: 'Autenticação 2FA não configurada.' });
    }

    const valido = speakeasy.totp.verify({
      secret:   u.totp_secret,
      encoding: 'base32',
      token:    String(codigo),
      window:   1,
    });

    if (!valido) return res.status(401).json({ erro: 'Código inválido. Tenta novamente.' });

    preAuthSessions.delete(pre_auth_token);

    const [perfis] = await pool.query(
      `SELECT p.nome_perfil FROM utilizador_perfil up
         JOIN perfil p ON p.id_perfil = up.id_perfil
        WHERE up.id_utilizador = ?`,
      [id_utilizador]
    );

    const saudacaoArgs = {
      ultimoLogin: u.ultimo_login,
      primeiroLoginPendente: !!u.primeiro_login_pendente,
    };
    const saudacao = calcularSaudacao({ ...saudacaoArgs, idioma: u.idioma });
    const saudacao_tipo = tipoSaudacao(saudacaoArgs);

    await pool.query(
      'UPDATE utilizador SET ultimo_login = CURRENT_TIMESTAMP WHERE id_utilizador = ?',
      [id_utilizador]
    );

    const token = assinarToken({ id_utilizador });

    res.json({
      mensagem: 'Login efetuado com sucesso.',
      token,
      saudacao,
      saudacao_tipo,
      utilizador: {
        id_utilizador: u.id_utilizador,
        nome: u.nome,
        email: u.email,
        idioma: u.idioma,
        url_slug: u.url_slug,
        primeiro_login_pendente: !!u.primeiro_login_pendente,
        perfis: perfis.map(p => p.nome_perfil),
      },
    });
  } catch (err) { next(err); }
}

module.exports = {
  registar,
  confirmarEmail,
  completarPerfil,
  login,
  verificarDoisFatores,
  alterarPasswordPrimeiroLogin,
  pedirRecuperacao,
  redefinirPassword,
  eu,
};
