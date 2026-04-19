function autorizarPerfis(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.utilizador) return res.status(401).json({ erro: 'Não autenticado.' });

    const tem = req.utilizador.perfis.some(p => perfisPermitidos.includes(p));
    if (!tem) return res.status(403).json({ erro: 'Sem permissão para esta operação.' });

    next();
  };
}

module.exports = { autorizarPerfis };
