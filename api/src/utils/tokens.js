const crypto = require('crypto');

function gerarTokenAleatorio(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function gerarCodigoPublico(id) {
  const numero = String(id).padStart(5, '0');
  return `SOFT-BDG-${numero}`;
}

module.exports = { gerarTokenAleatorio, gerarCodigoPublico };
