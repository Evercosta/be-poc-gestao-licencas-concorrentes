const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const licenseService = require('../licenseService');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware que valida o token e injeta req.usuario = { id, empresaId, sessaoId }
function autenticar(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token ausente' });
  }
  try {
    req.usuario = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ erro: 'email e senha são obrigatórios' });
  }

  const [[usuario]] = await pool.query(
    'SELECT id, nome, empresa_id, senha_hash FROM usuarios WHERE email = ?',
    [email]
  );
  if (!usuario || !(await bcrypt.compare(senha, usuario.senha_hash))) {
    return res.status(401).json({ erro: 'Credenciais inválidas' });
  }

  const dispositivo = req.headers['user-agent']?.slice(0, 140);
  const resultado = await licenseService.reservarLicenca(usuario.empresa_id, usuario.id, dispositivo);

  if (!resultado.concedida) {
    return res.status(423).json({
      erro: 'Todas as licenças em uso',
      licencasEmUso: resultado.emUso,
      licencasContratadas: resultado.contratadas,
    });
  }

  const token = jwt.sign(
    { id: usuario.id, empresaId: usuario.empresa_id, sessaoId: resultado.sessaoId },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, usuario: { id: usuario.id, nome: usuario.nome } });
});

// POST /auth/heartbeat (autenticado)
router.post('/heartbeat', autenticar, async (req, res) => {
  const ok = await licenseService.renovarHeartbeat(req.usuario.sessaoId);
  if (!ok) return res.status(401).json({ erro: 'Sessão expirada, faça login novamente' });
  res.json({ ok: true });
});

// POST /auth/logout (autenticado)
router.post('/logout', autenticar, async (req, res) => {
  await licenseService.encerrarSessao(req.usuario.sessaoId);
  res.json({ ok: true });
});

// GET /licencas/status (autenticado)
router.get('/licencas/status', autenticar, async (req, res) => {
  const status = await licenseService.statusLicencas(req.usuario.empresaId);
  res.json(status);
});

module.exports = { router, autenticar };
