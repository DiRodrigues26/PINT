const speakeasy = require('speakeasy');
const QRCode    = require('qrcode');
const { pool }  = require('../db/connection');

async function setup(req, res, next) {
  try {
    const { id_utilizador, email } = req.utilizador;

    const secret = speakeasy.generateSecret({
      name:   `Softinsa Badges (${email})`,
      length: 20,
      issuer: 'Softinsa',
    });

    // Guardar o secret temporariamente (totp_ativo mantém-se 0 até confirmar)
    await pool.query(
      'UPDATE utilizador SET totp_secret = ? WHERE id_utilizador = ?',
      [secret.base32, id_utilizador]
    );

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      qr_code: qrDataUrl,
      secret:  secret.base32,
    });
  } catch (err) { next(err); }
}

async function ativar(req, res, next) {
  try {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ erro: 'Código obrigatório.' });

    const [linhas] = await pool.query(
      'SELECT totp_secret FROM utilizador WHERE id_utilizador = ?',
      [req.utilizador.id_utilizador]
    );
    if (!linhas[0]?.totp_secret) {
      return res.status(400).json({ erro: 'Inicia o processo de configuração primeiro.' });
    }

    const valido = speakeasy.totp.verify({
      secret:   linhas[0].totp_secret,
      encoding: 'base32',
      token:    String(codigo),
      window:   1,
    });

    if (!valido) return res.status(400).json({ erro: 'Código inválido. Tenta novamente.' });

    await pool.query(
      'UPDATE utilizador SET totp_ativo = 1 WHERE id_utilizador = ?',
      [req.utilizador.id_utilizador]
    );

    res.json({ mensagem: 'Autenticação de dois fatores ativada com sucesso.' });
  } catch (err) { next(err); }
}

async function desativar(req, res, next) {
  try {
    await pool.query(
      'UPDATE utilizador SET totp_ativo = 0, totp_secret = NULL WHERE id_utilizador = ?',
      [req.utilizador.id_utilizador]
    );
    res.json({ mensagem: 'Autenticação de dois fatores desativada.' });
  } catch (err) { next(err); }
}

async function estado(req, res, next) {
  try {
    const [linhas] = await pool.query(
      'SELECT totp_ativo FROM utilizador WHERE id_utilizador = ?',
      [req.utilizador.id_utilizador]
    );
    res.json({ ativo: !!linhas[0]?.totp_ativo });
  } catch (err) { next(err); }
}

module.exports = { setup, ativar, desativar, estado };
