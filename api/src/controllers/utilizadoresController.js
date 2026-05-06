const bcrypt = require('bcryptjs');
const { pool } = require('../db/connection');
const { gerarSlug } = require('../utils/slug');
const { gerarTokenAleatorio } = require('../utils/tokens');
const { enviarConfirmacaoRegisto, enviarRecuperacaoPassword } = require('../utils/email');

async function gerarSlugUnico(nome, ignorarId = null) {
  const base = gerarSlug(nome) || 'utilizador';
  let slug = base;
  let i = 1;
  while (true) {
    const params = ignorarId ? [slug, ignorarId] : [slug];
    const where = ignorarId ? 'url_slug = ? AND id_utilizador <> ?' : 'url_slug = ?';
    const [existe] = await pool.query(
      `SELECT 1 FROM utilizador WHERE ${where} LIMIT 1`,
      params
    );
    if (existe.length === 0) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
}

async function listar(req, res, next) {
  try {
    const {
      perfil, ativo, pesquisa, id_service_line, id_area,
      pagina = 1, por_pagina = 20,
    } = req.query;
    const limit = Math.min(parseInt(por_pagina, 10) || 20, 100);
    const offset = (Math.max(parseInt(pagina, 10) || 1, 1) - 1) * limit;

    const where = [];
    const params = [];

    if (ativo !== undefined) {
      where.push('u.ativo = ?');
      params.push(ativo === '1' || ativo === 'true' ? 1 : 0);
    }
    if (pesquisa) {
      where.push('(u.nome LIKE ? OR u.email LIKE ?)');
      params.push(`%${pesquisa}%`, `%${pesquisa}%`);
    }
    if (perfil) {
      where.push(`EXISTS (
        SELECT 1 FROM utilizador_perfil up
          JOIN perfil p ON p.id_perfil = up.id_perfil
         WHERE up.id_utilizador = u.id_utilizador AND p.nome_perfil = ?
      )`);
      params.push(perfil);
    }
    if (id_service_line) {
      where.push('(a.id_service_line = ? OR slr.id_service_line = ?)');
      params.push(id_service_line, id_service_line);
    }
    if (id_area) {
      where.push('a.id_area = ?');
      params.push(id_area);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const joinsSQL = `
         LEFT JOIN consultor_area ca ON ca.id_utilizador = u.id_utilizador
         LEFT JOIN area a ON a.id_area = ca.id_area
         LEFT JOIN service_line sl_area ON sl_area.id_service_line = a.id_service_line
         LEFT JOIN service_line_responsavel slr ON slr.id_utilizador = u.id_utilizador
         LEFT JOIN service_line sl_resp ON sl_resp.id_service_line = slr.id_service_line`;

    const [linhas] = await pool.query(
      `SELECT u.id_utilizador, u.nome, u.email, u.ativo, u.email_confirmado,
              u.idioma, u.ultimo_login, u.created_at, u.url_slug,
              a.id_area, a.nome AS nome_area,
              COALESCE(sl_area.id_service_line, sl_resp.id_service_line) AS id_service_line,
              COALESCE(sl_area.nome, sl_resp.nome) AS nome_service_line,
              GROUP_CONCAT(DISTINCT p.nome_perfil) AS perfis
         FROM utilizador u
         LEFT JOIN utilizador_perfil up ON up.id_utilizador = u.id_utilizador
         LEFT JOIN perfil p              ON p.id_perfil     = up.id_perfil
         ${joinsSQL}
         ${whereSQL}
         GROUP BY u.id_utilizador, u.nome, u.email, u.ativo, u.email_confirmado,
                  u.idioma, u.ultimo_login, u.created_at, u.url_slug,
                  a.id_area, a.nome, sl_area.id_service_line, sl_area.nome,
                  sl_resp.id_service_line, sl_resp.nome
         ORDER BY u.created_at DESC
         LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(DISTINCT u.id_utilizador) AS total
         FROM utilizador u
         ${joinsSQL}
         ${whereSQL}`,
      params
    );

    const dados = linhas.map(l => ({
      ...l,
      perfis: l.perfis ? l.perfis.split(',') : [],
    }));

    res.json({ dados, total, pagina: Number(pagina), por_pagina: limit });
  } catch (err) {
    next(err);
  }
}

async function obter(req, res, next) {
  try {
    const { id } = req.params;

    const [linhas] = await pool.query(
      `SELECT u.id_utilizador, u.nome, u.email, u.ativo, u.email_confirmado,
              u.primeiro_login_pendente, u.idioma, u.url_slug, u.totp_ativo,
              u.ultimo_login, u.created_at
         FROM utilizador u
        WHERE u.id_utilizador = ?`,
      [id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Utilizador não encontrado.' });

    const [perfis] = await pool.query(
      `SELECT p.id_perfil, p.nome_perfil FROM utilizador_perfil up
         JOIN perfil p ON p.id_perfil = up.id_perfil
        WHERE up.id_utilizador = ?`,
      [id]
    );

    const [area] = await pool.query(
      `SELECT ca.id_area, a.nome AS nome_area
         FROM consultor_area ca
         JOIN area a ON a.id_area = ca.id_area
        WHERE ca.id_utilizador = ? AND ca.ativo = 1
        LIMIT 1`,
      [id]
    );

    const [serviceLine] = await pool.query(
      `SELECT slr.id_service_line, sl.nome AS nome_service_line
         FROM service_line_responsavel slr
         JOIN service_line sl ON sl.id_service_line = slr.id_service_line
        WHERE slr.id_utilizador = ?`,
      [id]
    );

    res.json({
      utilizador: {
        ...linhas[0],
        perfis,
        area: area[0] || null,
        service_line: serviceLine[0] || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const {
      nome, email, password, idioma = 'pt',
      perfis = [], id_area, id_service_line,
      primeiro_login_pendente = 1,
      enviar_email_confirmacao = 1,
    } = req.body;

    if (!nome || !email || !password) {
      return res.status(400).json({ erro: 'Nome, email e password são obrigatórios.' });
    }

    const [existe] = await pool.query(
      'SELECT 1 FROM utilizador WHERE email = ?',
      [email]
    );
    if (existe.length > 0) return res.status(409).json({ erro: 'Email já registado.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const slug = await gerarSlugUnico(nome);
    const tokenConfirmacao = gerarTokenAleatorio();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO utilizador
           (nome, email, password_hash, idioma, url_slug, token_confirmacao_email,
            primeiro_login_pendente, email_confirmado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nome,
          email,
          passwordHash,
          idioma,
          slug,
          enviar_email_confirmacao ? tokenConfirmacao : null,
          primeiro_login_pendente ? 1 : 0,
          enviar_email_confirmacao ? 0 : 1,
        ]
      );
      const idUtilizador = result.insertId;

      if (perfis.length > 0) {
        const [perfisBD] = await conn.query(
          `SELECT id_perfil, nome_perfil FROM perfil WHERE nome_perfil IN (?)`,
          [perfis]
        );
        for (const p of perfisBD) {
          await conn.query(
            'INSERT INTO utilizador_perfil (id_utilizador, id_perfil) VALUES (?, ?)',
            [idUtilizador, p.id_perfil]
          );
        }
      }

      if (id_area) {
        await conn.query(
          'INSERT INTO consultor_area (id_utilizador, id_area) VALUES (?, ?)',
          [idUtilizador, id_area]
        );
      }
      if (id_service_line) {
        await conn.query(
          'INSERT INTO service_line_responsavel (id_utilizador, id_service_line) VALUES (?, ?)',
          [idUtilizador, id_service_line]
        );
      }

      await conn.query(
        'INSERT INTO preferencia_notificacao (id_utilizador) VALUES (?)',
        [idUtilizador]
      );

      await conn.commit();

      if (enviar_email_confirmacao) {
        try {
          await enviarConfirmacaoRegisto({ nome, email }, tokenConfirmacao);
        } catch (e) {
          console.warn('Aviso: falha ao enviar email:', e.message);
        }
      }

      res.status(201).json({
        mensagem: 'Utilizador criado com sucesso.',
        id_utilizador: idUtilizador,
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const {
      nome, email, idioma, ativo, perfis,
      id_area, id_service_line,
    } = req.body;

    const campos = [];
    const valores = [];

    if (nome !== undefined)    { campos.push('nome = ?');    valores.push(nome); }
    if (email !== undefined)   { campos.push('email = ?');   valores.push(email); }
    if (idioma !== undefined)  { campos.push('idioma = ?');  valores.push(idioma); }
    if (ativo !== undefined)   { campos.push('ativo = ?');   valores.push(ativo ? 1 : 0); }
    if (nome !== undefined) {
      const novoSlug = await gerarSlugUnico(nome, id);
      campos.push('url_slug = ?');
      valores.push(novoSlug);
    }

    const atualizaAssociacoes =
      perfis !== undefined || id_area !== undefined || id_service_line !== undefined;

    if (campos.length === 0 && !atualizaAssociacoes) {
      return res.status(400).json({ erro: 'Nada para atualizar.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (campos.length > 0) {
        valores.push(id);
        const [result] = await conn.query(
          `UPDATE utilizador SET ${campos.join(', ')} WHERE id_utilizador = ?`,
          valores
        );
        if (result.affectedRows === 0) {
          await conn.rollback();
          return res.status(404).json({ erro: 'Utilizador não encontrado.' });
        }
      }

      if (perfis !== undefined) {
        await conn.query('DELETE FROM utilizador_perfil WHERE id_utilizador = ?', [id]);

        if (Array.isArray(perfis) && perfis.length > 0) {
          const [perfisBD] = await conn.query(
            'SELECT id_perfil FROM perfil WHERE nome_perfil IN (?)',
            [perfis]
          );
          for (const p of perfisBD) {
            await conn.query(
              'INSERT INTO utilizador_perfil (id_utilizador, id_perfil) VALUES (?, ?)',
              [id, p.id_perfil]
            );
          }
        }
      }

      if (id_area !== undefined) {
        await conn.query('DELETE FROM consultor_area WHERE id_utilizador = ?', [id]);
        if (id_area) {
          await conn.query(
            'INSERT INTO consultor_area (id_utilizador, id_area) VALUES (?, ?)',
            [id, id_area]
          );
        }
      }

      if (id_service_line !== undefined) {
        await conn.query('DELETE FROM service_line_responsavel WHERE id_utilizador = ?', [id]);
        if (id_service_line) {
          await conn.query(
            'INSERT INTO service_line_responsavel (id_utilizador, id_service_line) VALUES (?, ?)',
            [id, id_service_line]
          );
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.json({ mensagem: 'Utilizador atualizado.' });
  } catch (err) {
    next(err);
  }
}

async function desativar(req, res, next) {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      'UPDATE utilizador SET ativo = 0 WHERE id_utilizador = ?',
      [id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Utilizador não encontrado.' });
    res.json({ mensagem: 'Utilizador desativado.' });
  } catch (err) {
    next(err);
  }
}

async function definirPerfis(req, res, next) {
  try {
    const { id } = req.params;
    const { perfis = [] } = req.body;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query('DELETE FROM utilizador_perfil WHERE id_utilizador = ?', [id]);

      if (perfis.length > 0) {
        const [perfisBD] = await conn.query(
          'SELECT id_perfil FROM perfil WHERE nome_perfil IN (?)',
          [perfis]
        );
        for (const p of perfisBD) {
          await conn.query(
            'INSERT INTO utilizador_perfil (id_utilizador, id_perfil) VALUES (?, ?)',
            [id, p.id_perfil]
          );
        }
      }

      await conn.commit();
      res.json({ mensagem: 'Perfis atualizados.' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
}

async function atualizarMeuPerfil(req, res, next) {
  try {
    const { nome, idioma, id_area } = req.body;
    const id = req.utilizador.id_utilizador;
    const campos = [];
    const valores = [];

    if (nome !== undefined)   { campos.push('nome = ?');   valores.push(nome); }
    if (idioma !== undefined) { campos.push('idioma = ?'); valores.push(idioma); }
    if (nome !== undefined) {
      const novoSlug = await gerarSlugUnico(nome, id);
      campos.push('url_slug = ?');
      valores.push(novoSlug);
    }

    if (campos.length > 0) {
      valores.push(id);
      await pool.query(`UPDATE utilizador SET ${campos.join(', ')} WHERE id_utilizador = ?`, valores);
    }

    if (id_area !== undefined) {
      const [areaExiste] = await pool.query('SELECT id_area FROM area WHERE id_area = ? AND ativo = 1', [id_area]);
      if (areaExiste.length === 0) return res.status(404).json({ erro: 'Área não encontrada.' });

      await pool.query(
        'UPDATE consultor_area SET ativo = 0, data_fim = NOW() WHERE id_utilizador = ? AND ativo = 1',
        [id]
      );
      await pool.query(
        'INSERT INTO consultor_area (id_utilizador, id_area, ativo) VALUES (?, ?, 1)',
        [id, id_area]
      );
    }

    if (campos.length === 0 && id_area === undefined) {
      return res.status(400).json({ erro: 'Nada para atualizar.' });
    }

    res.json({ mensagem: 'Perfil atualizado.' });
  } catch (err) {
    next(err);
  }
}

async function alterarMinhaPassword(req, res, next) {
  try {
    const { password_atual, nova_password } = req.body;
    if (!password_atual || !nova_password) {
      return res.status(400).json({ erro: 'Password atual e nova são obrigatórias.' });
    }
    if (String(nova_password).length < 8) {
      return res.status(400).json({ erro: 'Nova password deve ter pelo menos 8 caracteres.' });
    }

    const [linhas] = await pool.query(
      'SELECT password_hash FROM utilizador WHERE id_utilizador = ?',
      [req.utilizador.id_utilizador]
    );
    const valido = await bcrypt.compare(password_atual, linhas[0].password_hash);
    if (!valido) return res.status(400).json({ erro: 'Password atual incorreta.' });

    const novoHash = await bcrypt.hash(nova_password, 10);
    await pool.query(
      'UPDATE utilizador SET password_hash = ? WHERE id_utilizador = ?',
      [novoHash, req.utilizador.id_utilizador]
    );

    res.json({ mensagem: 'Password alterada com sucesso.' });
  } catch (err) {
    next(err);
  }
}

async function reporPassword(req, res, next) {
  try {
    const [linhas] = await pool.query(
      'SELECT id_utilizador, nome, email FROM utilizador WHERE id_utilizador = ?',
      [req.params.id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Utilizador não encontrado.' });

    const token = gerarTokenAleatorio();
    const expira = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `UPDATE utilizador
          SET token_recuperacao_password = ?,
              token_recuperacao_expira = ?
        WHERE id_utilizador = ?`,
      [token, expira, req.params.id]
    );

    try {
      await enviarRecuperacaoPassword(linhas[0], token);
    } catch (e) {
      console.warn('Aviso: falha ao enviar email de recuperação:', e.message);
    }

    res.json({ mensagem: 'Email de recuperação enviado.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  obter,
  criar,
  atualizar,
  desativar,
  definirPerfis,
  atualizarMeuPerfil,
  alterarMinhaPassword,
  reporPassword,
  meuPerfilCompleto,
};

async function meuPerfilCompleto(req, res, next) {
  try {
    const id = req.utilizador.id_utilizador;

    const [linhas] = await pool.query(
      `SELECT id_utilizador, nome, email, idioma, url_slug, created_at
         FROM utilizador WHERE id_utilizador = ?`,
      [id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Utilizador não encontrado.' });

    const [slRows] = await pool.query(
      `SELECT slr.id_service_line, sl.nome AS nome_service_line
         FROM service_line_responsavel slr
         JOIN service_line sl ON sl.id_service_line = slr.id_service_line
        WHERE slr.id_utilizador = ?`,
      [id]
    );

    const [areaRows] = await pool.query(
      `SELECT a.id_area, a.nome AS nome_area
         FROM area a
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         JOIN service_line_responsavel slr ON slr.id_service_line = sl.id_service_line
        WHERE slr.id_utilizador = ? AND a.ativo = 1
        LIMIT 1`,
      [id]
    );

    res.json({
      utilizador: {
        ...linhas[0],
        perfis: req.utilizador.perfis,
        service_line: slRows[0] || null,
        area: areaRows[0] || null,
      },
    });
  } catch (err) { next(err); }
}
