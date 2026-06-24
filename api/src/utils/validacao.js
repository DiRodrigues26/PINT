const EMOJI_REGEX = /[\u{1F1E6}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/u;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IDIOMAS_SUPORTADOS = new Set(['pt', 'en', 'es']);

function contemEmoji(texto) {
  return EMOJI_REGEX.test(String(texto ?? ''));
}

function normalizarTexto(valor) {
  return String(valor ?? '').trim().replace(/\s+/g, ' ');
}

function normalizarEmail(valor) {
  return String(valor ?? '').trim().toLowerCase();
}

function emailValido(valor) {
  const email = normalizarEmail(valor);
  if (!email || email.length > 255) return false;
  if (contemEmoji(email)) return false;
  if (!EMAIL_REGEX.test(email)) return false;
  const [local, dominio] = email.split('@');
  if (!local || !dominio || local.length > 64) return false;
  if (email.includes('..')) return false;
  if (local.startsWith('.') || local.endsWith('.')) return false;
  if (dominio.startsWith('.') || dominio.endsWith('.')) return false;

  const labels = dominio.split('.');
  return labels.length >= 2 && labels.every((label) => (
    label.length > 0
    && label.length <= 63
    && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
  ));
}

function nomeValido(valor, max = 150) {
  const nome = normalizarTexto(valor);
  return Boolean(nome) && nome.length <= max && !contemEmoji(nome);
}

function idiomaValido(valor) {
  return IDIOMAS_SUPORTADOS.has(String(valor || '').trim());
}

function idInteiroPositivo(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0;
}

function validarPassword(valor, min = 8) {
  const password = String(valor ?? '');
  if (password.length < min) return `Password deve ter pelo menos ${min} caracteres.`;
  if (contemEmoji(password)) return 'A password não pode conter emojis.';
  return null;
}

module.exports = {
  contemEmoji,
  normalizarTexto,
  normalizarEmail,
  emailValido,
  nomeValido,
  idiomaValido,
  idInteiroPositivo,
  validarPassword,
};
