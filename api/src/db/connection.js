const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               process.env.DB_PORT     || 3306,
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
    const conn = await pool.getConnection();
    console.log('✅ Ligado à base de dados MySQL');
    conn.release();
  } catch (err) {
    console.error('❌ Erro ao ligar à BD:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };