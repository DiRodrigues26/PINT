function tratadorErros(err, req, res, next) {
  console.error('❌ Erro:', err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ erro: 'Registo duplicado.' });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      erro: 'Não é possível concluir esta operação porque este registo ainda tem dados associados. Remova ou reassocie essas dependências primeiro; se existir essa opção, desative o registo.',
    });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ erro: 'Ficheiro demasiado grande.' });
  }

  const status = err.status || 500;
  res.status(status).json({ erro: err.message || 'Erro interno do servidor.' });
}

module.exports = { tratadorErros };
