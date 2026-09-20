// Teste de conexão com o MySQL: valida credenciais, latência, schema e dados de seed.
// Uso: npm run test:db
require('dotenv').config();
const pool = require('../src/db');

const TABELAS_ESPERADAS = ['empresas', 'usuarios', 'sessoes_ativas'];

const ok = (msg) => console.log(`  [OK]    ${msg}`);
const falha = (msg) => console.log(`  [FALHA] ${msg}`);
const aviso = (msg) => console.log(`  [AVISO] ${msg}`);

async function main() {
  let erros = 0;

  const host = process.env.MYSQLHOST || process.env.DB_HOST;
  const port = process.env.MYSQLPORT || process.env.DB_PORT || 3306;
  const database = process.env.MYSQLDATABASE || process.env.DB_NAME;
  const user = process.env.MYSQLUSER || process.env.DB_USER;

  console.log('\n1) Variáveis de ambiente');
  if (!host || !user || !database) {
    falha(`faltam variáveis (host=${host || '-'}, user=${user || '-'}, database=${database || '-'}). Copie .env.example para .env.`);
    process.exit(1);
  }
  ok(`${user}@${host}:${port}/${database}`);

  console.log('\n2) Conexão (ping)');
  const inicio = Date.now();
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    ok(`conectado em ${Date.now() - inicio} ms`);

    const [[info]] = await conn.query(
      'SELECT VERSION() AS versao, DATABASE() AS db, NOW() AS agora, @@time_zone AS tz'
    );
    ok(`MySQL ${info.versao} | database=${info.db} | now=${info.agora.toISOString()} | tz=${info.tz}`);

    console.log('\n3) Schema');
    const [tabelas] = await conn.query(
      `SELECT table_name AS nome FROM information_schema.tables WHERE table_schema = DATABASE()`
    );
    const existentes = tabelas.map((t) => t.nome.toLowerCase());
    for (const t of TABELAS_ESPERADAS) {
      if (existentes.includes(t)) {
        ok(`tabela '${t}' presente`);
      } else {
        falha(`tabela '${t}' ausente — aplique o schema.sql`);
        erros++;
      }
    }

    if (erros === 0) {
      console.log('\n4) Dados');
      const [[{ total: empresas }]] = await conn.query('SELECT COUNT(*) AS total FROM empresas');
      const [[{ total: usuarios }]] = await conn.query('SELECT COUNT(*) AS total FROM usuarios');
      const [[{ total: sessoes }]] = await conn.query(
        'SELECT COUNT(*) AS total FROM sessoes_ativas WHERE encerrada_em IS NULL'
      );
      console.log(`  empresas=${empresas} | usuarios=${usuarios} | sessões abertas=${sessoes}`);
      if (empresas === 0) aviso("nenhuma empresa cadastrada — rode o INSERT do schema.sql");
      if (usuarios === 0) aviso("nenhum usuário cadastrado — rode 'npm run seed'");

      console.log('\n5) Escrita (transação com rollback, não persiste nada)');
      await conn.beginTransaction();
      await conn.query("INSERT INTO empresas (nome, licencas_contratadas) VALUES ('__teste_conexao__', 1)");
      const [[{ total }]] = await conn.query(
        "SELECT COUNT(*) AS total FROM empresas WHERE nome = '__teste_conexao__'"
      );
      await conn.rollback();
      const [[{ total: depois }]] = await conn.query(
        "SELECT COUNT(*) AS total FROM empresas WHERE nome = '__teste_conexao__'"
      );
      if (total === 1 && depois === 0) {
        ok('INSERT + ROLLBACK funcionando (usuário tem permissão de escrita e engine transacional)');
      } else {
        falha(`rollback não desfez o INSERT (antes=${total}, depois=${depois}) — tabela pode não ser InnoDB`);
        erros++;
      }
    }
  } finally {
    conn.release();
    await pool.end();
  }

  console.log(erros === 0 ? '\nResultado: conexão OK.\n' : `\nResultado: ${erros} problema(s).\n`);
  process.exit(erros === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.log(`\n  [ERRO] ${err.code || ''} ${err.message}`);
  const dicas = {
    ER_ACCESS_DENIED_ERROR: 'usuário ou senha incorretos (DB_USER / DB_PASSWORD).',
    ER_BAD_DB_ERROR: 'o banco informado em DB_NAME não existe.',
    ECONNREFUSED: 'host/porta inacessíveis — confira DB_HOST e DB_PORT (no Railway use o host público + porta do proxy).',
    ENOTFOUND: 'host não resolvido — confira DB_HOST.',
    ETIMEDOUT: 'timeout — o banco pode estar fora do ar ou bloqueado por firewall.',
    PROTOCOL_CONNECTION_LOST: 'conexão encerrada pelo servidor.',
  };
  if (dicas[err.code]) console.log(`  Dica: ${dicas[err.code]}`);
  try { await pool.end(); } catch {}
  process.exit(1);
});
