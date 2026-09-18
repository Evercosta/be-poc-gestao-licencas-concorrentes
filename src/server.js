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
