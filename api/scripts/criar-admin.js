require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const { gerarSlug } = require('../src/utils/slug');

const VARS_BD_OBRIGATORIAS = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

function obterVariaveisEmFalta() {
  return VARS_BD_OBRIGATORIAS.filter((nome) => !process.env[nome]);
}

function validarArgumentos([nome, email, password]) {
  if (!nome || !email || !password) {
    throw new Error(
      'Uso: npm run admin:create -- "Nome" "email@dominio.pt" "PasswordTemporaria123"'
    );
  }

  if (!email.includes('@')) {
    throw new Error('Email invalido.');
  }

  if (String(password).length < 8) {
    throw new Error('A password deve ter pelo menos 8 caracteres.');
  }
}

async function gerarSlugUnico(conn, nome, ignorarId = null) {
  const base = gerarSlug(nome) || 'administrador';
  let slug = base;
  let i = 1;

  while (true) {
    const params = ignorarId ? [slug, ignorarId] : [slug];
    const where = ignorarId
      ? 'url_slug = ? AND id_utilizador <> ?'
      : 'url_slug = ?';

    const [existe] = await conn.query(
      `SELECT 1 FROM utilizador WHERE ${where} LIMIT 1`,
      params
    );

    if (existe.length === 0) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
}

async function main() {
  const resetPassword = process.argv.includes('--reset-password');
  const args = process.argv.slice(2).filter((arg) => arg !== '--reset-password');
  validarArgumentos(args);

  const [nome, email, password] = args;
  const varsEmFalta = obterVariaveisEmFalta();
  if (varsEmFalta.length > 0) {
    throw new Error(`Variaveis em falta no .env: ${varsEmFalta.join(', ')}`);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await conn.beginTransaction();

  try {
    const [[perfilAdmin]] = await conn.query(
      "SELECT id_perfil FROM perfil WHERE nome_perfil = 'Administrador' LIMIT 1"
    );

    if (!perfilAdmin) {
      throw new Error('Perfil "Administrador" nao existe na base de dados.');
    }

    const [existentes] = await conn.query(
      'SELECT id_utilizador FROM utilizador WHERE email = ? LIMIT 1',
      [email]
    );

    let idUtilizador;
    let criado = false;
    let passwordDefinida = false;

    if (existentes.length > 0) {
      idUtilizador = existentes[0].id_utilizador;

      const campos = [
        'ativo = 1',
        'email_confirmado = 1',
      ];
      const valores = [];

      if (resetPassword) {
        const passwordHash = await bcrypt.hash(password, 10);
        campos.push('password_hash = ?');
        campos.push('primeiro_login_pendente = 1');
        valores.push(passwordHash);
        passwordDefinida = true;
      }

      valores.push(idUtilizador);
      await conn.query(
        `UPDATE utilizador SET ${campos.join(', ')} WHERE id_utilizador = ?`,
        valores
      );
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      const slug = await gerarSlugUnico(conn, nome);

      const [result] = await conn.query(
        `INSERT INTO utilizador
           (nome, email, password_hash, idioma, url_slug,
            primeiro_login_pendente, email_confirmado)
         VALUES (?, ?, ?, 'pt', ?, 1, 1)`,
        [nome, email, passwordHash, slug]
      );

      idUtilizador = result.insertId;
      criado = true;
      passwordDefinida = true;
    }

    await conn.query(
      `INSERT IGNORE INTO utilizador_perfil (id_utilizador, id_perfil)
       VALUES (?, ?)`,
      [idUtilizador, perfilAdmin.id_perfil]
    );

    await conn.query(
      'INSERT IGNORE INTO preferencia_notificacao (id_utilizador) VALUES (?)',
      [idUtilizador]
    );

    await conn.commit();

    console.log(JSON.stringify({
      ok: true,
      criado,
      id_utilizador: idUtilizador,
      nome,
      email,
      perfil: 'Administrador',
      email_confirmado: true,
      primeiro_login_pendente: criado || resetPassword,
      password_definida: passwordDefinida,
    }, null, 2));
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
