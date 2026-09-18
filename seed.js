// Cria os 3 usuários de teste da empresa "Acme Ltda" (id 1, 2 licenças), todos com senha "123456".
// Rode depois de aplicar o schema.sql: `npm run seed`
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./src/db');

async function seed() {
  const senhaHash = await bcrypt.hash('123456', 10);
  const usuarios = [
    ['Usuario 1', 'user1@acme.com'],
    ['Usuario 2', 'user2@acme.com'],
    ['Usuario 3', 'user3@acme.com'],
  ];

  for (const [nome, email] of usuarios) {
    await pool.query(
      `INSERT INTO usuarios (empresa_id, nome, email, senha_hash)
       VALUES (1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE senha_hash = VALUES(senha_hash)`,
      [nome, email, senhaHash]
    );
    console.log(`OK: ${email} / senha: 123456`);
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error('Erro ao popular usuários:', err);
  process.exit(1);
});
