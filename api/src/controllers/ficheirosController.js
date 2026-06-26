const { uploadFicheiro } = require('../utils/uploadService');

async function carregar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Ficheiro é obrigatório.' });

    const contexto = req.body?.contexto || req.query?.contexto || 'geral';
    const dados = await uploadFicheiro(req.file, contexto);

    res.status(201).json({
      mensagem: 'Ficheiro carregado.',
      ficheiro: dados,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { carregar };
