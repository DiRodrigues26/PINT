const mysql = require('mysql2/promise');

async function main() {
  const url = 'mysql://root:jWNhrZqkBzMhmxFTwcjldSnQdiWWwZtc@nozomi.proxy.rlwy.net:15913/softinsa_badges';
  const connection = await mysql.createConnection(url);

  try {
    console.log('Conectado à base de dados Railway!');
    
    // 1. Procurar candidaturas válidas para SLA (estados ativos de revisão)
    const [rows] = await connection.execute(
      `SELECT id_candidatura, estado_atual, data_submissao 
       FROM candidatura_badge 
       WHERE estado_atual IN ('SUBMITTED', 'IN_TALENT_REVIEW', 'IN_SERVICE_LINE_REVIEW')
       LIMIT 5`
    );

    if (rows.length === 0) {
      console.log('Não há candidaturas ativas para testar (todas estão aprovadas, fechadas ou devolvidas).');
      return;
    }

    console.log('Candidaturas ativas encontradas:');
    console.table(rows);

    const idTeste = rows[0].id_candidatura;
    console.log(`\nVamos forçar o SLA na candidatura ID: ${idTeste}...`);

    // 2. Fazer os updates para a candidatura escolhida
    await connection.execute(
      `UPDATE candidatura_badge SET data_submissao = DATE_SUB(NOW(), INTERVAL 5 DAY) WHERE id_candidatura = ?`,
      [idTeste]
    );

    await connection.execute(
      `UPDATE historico_candidatura SET data_evento = DATE_SUB(NOW(), INTERVAL 5 DAY) WHERE id_candidatura = ?`,
      [idTeste]
    );

    console.log(`✅ Sucesso! A candidatura ${idTeste} foi recuada 5 dias no tempo. SLA ultrapassado!`);

  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await connection.end();
  }
}

main();
