const { pool } = require('../db/connection');

async function listar(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT * FROM conquista_especial WHERE ativo = 1 ORDER BY nome ASC`
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function obter(req, res, next) {
  try {
    const [linhas] = await pool.query(
      'SELECT * FROM conquista_especial WHERE id_conquista = ?',
      [req.params.id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Conquista não encontrada.' });
    res.json({ conquista: linhas[0] });
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const {
      nome, descricao, imagem_url, criterio,
      tipo_criterio, valor_objetivo, entidade_referencia,
      pontos_bonus = 0, ativo = 1,
    } = req.body;
    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });

    const [result] = await pool.query(
      `INSERT INTO conquista_especial
         (nome, descricao, imagem_url, criterio, tipo_criterio,
          valor_objetivo, entidade_referencia, pontos_bonus, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nome, descricao || null, imagem_url || null, criterio || null,
       tipo_criterio || null, valor_objetivo || null, entidade_referencia || null,
       pontos_bonus, ativo ? 1 : 0]
    );
    res.status(201).json({ mensagem: 'Conquista criada.', id_conquista: result.insertId });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const editaveis = [
      'nome', 'descricao', 'imagem_url', 'criterio',
      'tipo_criterio', 'valor_objetivo', 'entidade_referencia',
      'pontos_bonus', 'ativo',
    ];
    const campos = [];
    const valores = [];
    for (const c of editaveis) {
      if (req.body[c] !== undefined) {
        campos.push(`${c} = ?`);
        valores.push(c === 'ativo' ? (req.body[c] ? 1 : 0) : req.body[c]);
      }
    }
    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE conquista_especial SET ${campos.join(', ')} WHERE id_conquista = ?`,
      valores
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Conquista não encontrada.' });
    res.json({ mensagem: 'Conquista atualizada.' });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM conquista_especial WHERE id_conquista = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Conquista não encontrada.' });
    res.json({ mensagem: 'Conquista eliminada.' });
  } catch (err) { next(err); }
}

async function minhasConquistas(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT uc.data_atribuicao, c.*
         FROM utilizador_conquista uc
         JOIN conquista_especial c ON c.id_conquista = uc.id_conquista
        WHERE uc.id_utilizador = ?
        ORDER BY uc.data_atribuicao DESC`,
      [req.utilizador.id_utilizador]
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function progresso(req, res, next) {
  try {
    const idUtilizador = req.utilizador.id_utilizador;
    const [conquistas] = await pool.query(
      `SELECT c.*, uc.data_atribuicao IS NOT NULL AS obtida
         FROM conquista_especial c
         LEFT JOIN utilizador_conquista uc
           ON uc.id_conquista = c.id_conquista AND uc.id_utilizador = ?
        WHERE c.ativo = 1`,
      [idUtilizador]
    );

    // calcular progresso para cada uma
    const resultado = [];
    for (const c of conquistas) {
      let atual = 0;
      if (c.tipo_criterio === 'BADGES_TOTAL') {
        const [[{ n }]] = await pool.query(
          'SELECT COUNT(*) AS n FROM badge_atribuido WHERE id_consultor = ?',
          [idUtilizador]
        );
        atual = n;
      } else if (c.tipo_criterio === 'BADGES_AREA') {
        const [[{ n }]] = await pool.query(
          `SELECT COUNT(*) AS n
             FROM badge_atribuido ba
             JOIN badge b ON b.id_badge = ba.id_badge
             JOIN nivel nv ON nv.id_nivel = b.id_nivel
             JOIN area a ON a.id_area = nv.id_area
            WHERE ba.id_consultor = ? AND a.nome = ?`,
          [idUtilizador, c.entidade_referencia || '']
        );
        atual = n;
      } else if (c.tipo_criterio === 'PONTOS') {
        const [[{ total }]] = await pool.query(
          `SELECT COALESCE(SUM(b.pontos), 0) AS total
             FROM badge_atribuido ba
             JOIN badge b ON b.id_badge = ba.id_badge
            WHERE ba.id_consultor = ?`,
          [idUtilizador]
        );
        atual = total;
      } else if (c.tipo_criterio === 'NIVEL') {
        const [[{ max_ordem }]] = await pool.query(
          `SELECT COALESCE(MAX(nv.ordem), 0) AS max_ordem
             FROM badge_atribuido ba
             JOIN badge b ON b.id_badge = ba.id_badge
             JOIN nivel nv ON nv.id_nivel = b.id_nivel
            WHERE ba.id_consultor = ?`,
          [idUtilizador]
        );
        atual = max_ordem;
      }

      resultado.push({
        ...c,
        progresso_atual: atual,
        progresso_objetivo: c.valor_objetivo || 0,
        percentagem: c.valor_objetivo ? Math.min(100, Math.round((atual / c.valor_objetivo) * 100)) : 0,
      });
    }

    res.json({ dados: resultado });
  } catch (err) { next(err); }
}

module.exports = {
  listar, obter, criar, atualizar, eliminar,
  minhasConquistas, progresso,
};
