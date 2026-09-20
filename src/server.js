require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { router: authRouter } = require('./routes/auth.routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
// as rotas do router já usam os caminhos completos (/login, /heartbeat, /logout, /licencas/status);
// montamos na raiz para casar exatamente com os endpoints documentados na arquitetura.
app.use('/', authRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API rodando na porta ${port}`));

// Nunca deixa um erro assíncrono não tratado derrubar o processo em silêncio —
// loga e mantém o servidor no ar, para que o log mostre a causa real de um 502.
process.on('unhandledRejection', (err) => console.error('unhandledRejection:', err));
process.on('uncaughtException', (err) => console.error('uncaughtException:', err));
