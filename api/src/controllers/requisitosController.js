const { pool } = require('../db/connection');

async function listar(req, res, next) {
  try {
    const { id_badge, id_nivel, codigo_nivel, tipo_evidencia, ativo, pesquisa, pagina, por_pagina } = req.query;
    const where = [];
    const params = [];
    if (id_badge) { where.push('br.id_badge = ?'); params.push(id_badge); }
    if (id_nivel) { where.push('r.id_nivel = ?'); params.push(id_nivel); }
    if (codigo_nivel) { where.push('n.codigo_nivel = ?'); params.push(codigo_nivel); }
    if (tipo_evidencia) { where.push('r.tipo_evidencia = ?'); params.push(tipo_evidencia); }
    if (ativo !== undefined && ativo !== '') {
      where.push('r.ativo = ?');
      params.push(ativo === '1' || ativo === 'true' ? 1 : 0);
    }
    if (pesquisa) {
      where.push('(r.codigo_requisito LIKE ? OR r.titulo LIKE ? OR r.descricao LIKE ? OR r.tipo_evidencia LIKE ?)');
      params.push(`%${pesquisa}%`, `%${pesquisa}%`, `%${pesquisa}%`, `%${pesquisa}%`);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const usarPaginacao = pagina !== undefined || por_pagina !== undefined;
    const limit = Math.min(parseInt(por_pagina, 10) || 20, 100);
    const paginaAtual = Math.max(parseInt(pagina, 10) || 1, 1);
    const offset = (paginaAtual - 1) * limit;
    const paginacaoSQL = usarPaginacao ? 'LIMIT ? OFFSET ?' : '';
    const paginacaoParams = usarPaginacao ? [limit, offset] : [];

    const [linhas] = await pool.query(
      `SELECT r.*, n.codigo_nivel, n.nome_nivel, n.ordem AS ordem_nivel,
              COUNT(DISTINCT br.id_badge) AS total_badges
         FROM requisito r
         JOIN nivel n ON n.id_nivel = r.id_nivel
         LEFT JOIN badge_requisito br ON br.id_requisito = r.id_requisito
         ${whereSQL}
        GROUP BY r.id_requisito, r.id_nivel, r.codigo_requisito, r.titulo, r.descricao,
                 r.tipo_evidencia, r.imagem_url, r.ordem, r.obrigatorio, r.ativo,
                 n.codigo_nivel, n.nome_nivel, n.ordem
        ORDER BY n.ordem ASC, r.ordem ASC, r.codigo_requisito ASC
        ${paginacaoSQL}`,
      [...params, ...paginacaoParams]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM requisito r
         JOIN nivel n ON n.id_nivel = r.id_nivel
         LEFT JOIN badge_requisito br ON br.id_requisito = r.id_requisito
         ${whereSQL}`,
      params
    );

    res.json({
      dados: linhas,
      total,
      pagina: usarPaginacao ? paginaAtual : 1,
      por_pagina: usarPaginacao ? limit : total,
    });
  } catch (err) { next(err); }
}

async function obter(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT r.*, n.codigo_nivel, n.nome_nivel, n.ordem AS ordem_nivel,
              COUNT(DISTINCT br.id_badge) AS total_badges
         FROM requisito r
         JOIN nivel n ON n.id_nivel = r.id_nivel
         LEFT JOIN badge_requisito br ON br.id_requisito = r.id_requisito
        WHERE r.id_requisito = ?
        GROUP BY r.id_requisito, r.id_nivel, r.codigo_requisito, r.titulo, r.descricao,
                 r.tipo_evidencia, r.imagem_url, r.ordem, r.obrigatorio, r.ativo,
                 n.codigo_nivel, n.nome_nivel, n.ordem`,
      [req.params.id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Requisito não encontrado.' });
    res.json({ requisito: linhas[0] });
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const {
      id_badge, id_nivel, codigo_requisito, titulo, descricao,
      tipo_evidencia, imagem_url, ordem = 1, obrigatorio = 1, ativo = 1,
    } = req.body;

    let idNivelFinal = id_nivel;
    if (!idNivelFinal && id_badge) {
      const [[badge]] = await pool.query('SELECT id_nivel FROM badge WHERE id_badge = ?', [id_badge]);
      idNivelFinal = badge?.id_nivel;
    }

    if (!idNivelFinal || !titulo) {
      return res.status(400).json({ erro: 'id_nivel/id_badge e titulo são obrigatórios.' });
    }

    let codigo = codigo_requisito;
    if (!codigo) {
      const [[nivel]] = await pool.query('SELECT codigo_nivel FROM nivel WHERE id_nivel = ?', [idNivelFinal]);
      if (!nivel) return res.status(404).json({ erro: 'Nível não encontrado.' });
      const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM requisito WHERE id_nivel = ?', [idNivelFinal]);
      codigo = `${nivel?.codigo_nivel || 'R'}${Number(total || 0) + 1}`;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        `INSERT INTO requisito
           (id_nivel, codigo_requisito, titulo, descricao, tipo_evidencia, imagem_url, ordem, obrigatorio, ativo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [idNivelFinal, codigo, titulo, descricao || null, tipo_evidencia || null,
         imagem_url || null, ordem, obrigatorio ? 1 : 0, ativo ? 1 : 0]
      );

      const [badges] = id_badge
        ? await conn.query('SELECT id_badge FROM badge WHERE id_badge = ?', [id_badge])
        : await conn.query('SELECT id_badge FROM badge WHERE id_nivel = ?', [idNivelFinal]);

      for (const badge of badges) {
        await conn.query(
          `INSERT IGNORE INTO badge_requisito (id_badge, id_requisito, ordem, obrigatorio)
           VALUES (?, ?, ?, ?)`,
          [badge.id_badge, result.insertId, ordem, obrigatorio ? 1 : 0]
        );
      }

      await conn.commit();
      res.status(201).json({ mensagem: 'Requisito criado.', id_requisito: result.insertId });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const { id_badge, id_nivel, codigo_requisito, titulo, descricao, tipo_evidencia, imagem_url, ordem, obrigatorio, ativo } = req.body;
    const campos = [];
    const valores = [];

    if (id_nivel !== undefined)          { campos.push('id_nivel = ?');          valores.push(id_nivel); }
    if (codigo_requisito !== undefined) { campos.push('codigo_requisito = ?'); valores.push(codigo_requisito); }
    if (titulo !== undefined)            { campos.push('titulo = ?');            valores.push(titulo); }
    if (descricao !== undefined)         { campos.push('descricao = ?');         valores.push(descricao); }
    if (tipo_evidencia !== undefined)    { campos.push('tipo_evidencia = ?');    valores.push(tipo_evidencia); }
    if (imagem_url !== undefined)        { campos.push('imagem_url = ?');        valores.push(imagem_url); }
    if (ordem !== undefined)             { campos.push('ordem = ?');             valores.push(ordem); }
    if (obrigatorio !== undefined)       { campos.push('obrigatorio = ?');       valores.push(obrigatorio ? 1 : 0); }
    if (ativo !== undefined)             { campos.push('ativo = ?');             valores.push(ativo ? 1 : 0); }

    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      valores.push(req.params.id);
      const [result] = await conn.query(
        `UPDATE requisito SET ${campos.join(', ')} WHERE id_requisito = ?`,
        valores
      );
      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ erro: 'Requisito não encontrado.' });
      }

      if (id_badge !== undefined || id_nivel !== undefined || ordem !== undefined || obrigatorio !== undefined) {
        if (id_badge !== undefined) {
          await conn.query(
            `INSERT INTO badge_requisito (id_badge, id_requisito, ordem, obrigatorio)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE ordem = VALUES(ordem), obrigatorio = VALUES(obrigatorio)`,
            [id_badge, req.params.id, ordem || 1, obrigatorio !== undefined ? (obrigatorio ? 1 : 0) : 1]
          );
        } else if (id_nivel !== undefined) {
          await conn.query('DELETE FROM badge_requisito WHERE id_requisito = ?', [req.params.id]);
          const [badges] = await conn.query('SELECT id_badge FROM badge WHERE id_nivel = ?', [id_nivel]);
          for (const badge of badges) {
            await conn.query(
              `INSERT IGNORE INTO badge_requisito (id_badge, id_requisito, ordem, obrigatorio)
               VALUES (?, ?, ?, ?)`,
              [badge.id_badge, req.params.id, ordem || 1, obrigatorio !== undefined ? (obrigatorio ? 1 : 0) : 1]
            );
          }
        } else {
          const camposAssoc = [];
          const valoresAssoc = [];
          if (ordem !== undefined) { camposAssoc.push('ordem = ?'); valoresAssoc.push(ordem); }
          if (obrigatorio !== undefined) { camposAssoc.push('obrigatorio = ?'); valoresAssoc.push(obrigatorio ? 1 : 0); }
          if (camposAssoc.length > 0) {
            valoresAssoc.push(req.params.id);
            await conn.query(`UPDATE badge_requisito SET ${camposAssoc.join(', ')} WHERE id_requisito = ?`, valoresAssoc);
          }
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.json({ mensagem: 'Requisito atualizado.' });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM badge_requisito WHERE id_requisito = ?', [req.params.id]);
      const [result] = await conn.query(
        'DELETE FROM requisito WHERE id_requisito = ?',
        [req.params.id]
      );
      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ erro: 'Requisito não encontrado.' });
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    res.json({ mensagem: 'Requisito eliminado.' });
  } catch (err) { next(err); }
}

module.exports = { listar, obter, criar, atualizar, eliminar };
