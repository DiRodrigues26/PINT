const buckets = new Map();

setInterval(() => {
  const agora = Date.now();
  for (const [chave, bucket] of buckets) {
    if (bucket.resetEm <= agora) buckets.delete(chave);
  }
}, 60_000).unref?.();

function valorNormalizado(valor) {
  return String(valor || '').trim().toLowerCase();
}

function obterIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || 'ip-desconhecido';
}

function criarRateLimit({ janelaMs, max, mensagem, chave }) {
  return (req, res, next) => {
    const agora = Date.now();
    const id = chave ? chave(req) : obterIp(req);
    const bucketKey = `${req.method}:${req.originalUrl.split('?')[0]}:${id}`;
    const atual = buckets.get(bucketKey);

    if (!atual || atual.resetEm <= agora) {
      buckets.set(bucketKey, { total: 1, resetEm: agora + janelaMs });
      return next();
    }

    atual.total += 1;
    if (atual.total > max) {
      const retryAfter = Math.max(1, Math.ceil((atual.resetEm - agora) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        erro: mensagem || 'Demasiadas tentativas. Tente novamente mais tarde.',
      });
    }

    return next();
  };
}

function chaveIpEmail(req) {
  return `${obterIp(req)}:${valorNormalizado(req.body?.email)}`;
}

function chaveIpToken(req) {
  return `${obterIp(req)}:${valorNormalizado(req.body?.pre_auth_token || req.body?.token)}`;
}

module.exports = {
  chaveIpEmail,
  chaveIpToken,
  criarRateLimit,
};
