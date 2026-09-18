// Pool de conexão com o MySQL do Railway.
// No Railway, ao adicionar o plugin MySQL, ele já expõe as variáveis MYSQL* automaticamente
// para os outros serviços do mesmo projeto — não precisa copiar valores manualmente se o
// backend estiver no mesmo projeto Railway (veja README.md).
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST,
  port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
  user: process.env.MYSQLUSER || process.env.DB_USER,
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQLDATABASE || process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z',
});

module.exports = pool;
