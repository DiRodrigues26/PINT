const { pool } = require('../db/connection');

async function listarMeus(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT * FROM consentimento_rgpd WHERE id_utilizador = ? ORDER BY id_consentimento DESC`,
      [req.utilizador.id_utilizador]
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function registar(req, res, next) {
  try {
    const { tipo_consentimento, aceite, versao_politica } = req.body;
    if (!tipo_consentimento) return res.status(400).json({ erro: 'tipo_consentimento é obrigatório.' });

    const [result] = await pool.query(
      `INSERT INTO consentimento_rgpd
         (id_utilizador, tipo_consentimento, aceite, data_aceitacao, versao_politica)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.utilizador.id_utilizador,
        tipo_consentimento,
        aceite ? 1 : 0,
        aceite ? new Date() : null,
        versao_politica || null,
      ]
    );
    res.status(201).json({ mensagem: 'Consentimento registado.', id_consentimento: result.insertId });
  } catch (err) { next(err); }
}

module.exports = { listarMeus, registar };
