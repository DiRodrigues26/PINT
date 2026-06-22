const EMOJI_REGEX = /[\u{1F1E6}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/u;

function contemEmoji(texto) {
  return EMOJI_REGEX.test(String(texto ?? ''));
}

module.exports = { contemEmoji };
