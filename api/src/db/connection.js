const mysql = require('mysql2/promise');

const VARS_BD_OBRIGATORIAS = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

function obterVariaveisEmFalta() {
  return VARS_BD_OBRIGATORIAS.filter((nome) => !process.env[nome]);
}

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           'Z',
  charset:            'utf8mb4',
});

async function testConnection() {
  try {
    const varsEmFalta = obterVariaveisEmFalta();
    if (varsEmFalta.length > 0) {
      throw new Error(`Variáveis em falta no .env: ${varsEmFalta.join(', ')}`);
    }

    const conn = await pool.getConnection();
    console.log('✅ Ligado à base de dados MySQL');
    conn.release();
  } catch (err) {
    const detalhe = err?.message?.trim() || 'Verifique credenciais DB_* e acesso de rede à BD.';
    console.error('❌ Erro ao ligar à BD:', detalhe);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
