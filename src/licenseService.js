const { randomUUID } = require('crypto');
const pool = require('./db');

const HEARTBEAT_WINDOW_HOURS = 4;

/**
 * Tenta reservar uma licença para o usuário. Retorna { concedida: true, sessaoId } ou
 * { concedida: false, emUso, contratadas }.
 *
 * O SELECT ... FOR UPDATE trava a linha da empresa até o COMMIT/ROLLBACK, então duas
 * requisições concorrentes da MESMA empresa nunca leem "1 livre" ao mesmo tempo e
 * estouram o limite — a segunda espera a primeira terminar a transação.
 */
async function reservarLicenca(empresaId, usuarioId, dispositivo) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[empresa]] = await conn.query(
      'SELECT licencas_contratadas FROM empresas WHERE id = ? FOR UPDATE',
      [empresaId]
    );
    if (!empresa) {
      await conn.rollback();
      throw new Error('EMPRESA_NAO_ENCONTRADA');
    }

    const [[{ emUso }]] = await conn.query(
      `SELECT COUNT(*) AS emUso FROM sessoes_ativas
       WHERE empresa_id = ? AND encerrada_em IS NULL
         AND ultimo_heartbeat > NOW() - INTERVAL ? HOUR`,
      [empresaId, HEARTBEAT_WINDOW_HOURS]
    );

    if (emUso >= empresa.licencas_contratadas) {
      await conn.rollback();
      return { concedida: false, emUso, contratadas: empresa.licencas_contratadas };
    }

    const sessaoId = randomUUID();
    await conn.query(
      `INSERT INTO sessoes_ativas (id, usuario_id, empresa_id, dispositivo)
       VALUES (?, ?, ?, ?)`,
      [sessaoId, usuarioId, empresaId, dispositivo || null]
    );

    await conn.commit();
    return { concedida: true, sessaoId };
  } finally {
    conn.release();
  }
}

async function renovarHeartbeat(sessaoId) {
  const [result] = await pool.query(
    `UPDATE sessoes_ativas SET ultimo_heartbeat = NOW()
     WHERE id = ? AND encerrada_em IS NULL
       AND ultimo_heartbeat > NOW() - INTERVAL ? HOUR`,
    [sessaoId, HEARTBEAT_WINDOW_HOURS]
  );
  return result.affectedRows > 0;
}

async function encerrarSessao(sessaoId) {
  await pool.query(
    'UPDATE sessoes_ativas SET encerrada_em = NOW() WHERE id = ? AND encerrada_em IS NULL',
    [sessaoId]
  );
}

async function statusLicencas(empresaId) {
  const [[empresa]] = await pool.query(
    'SELECT licencas_contratadas FROM empresas WHERE id = ?',
    [empresaId]
  );
  const [[{ emUso }]] = await pool.query(
    `SELECT COUNT(*) AS emUso FROM sessoes_ativas
     WHERE empresa_id = ? AND encerrada_em IS NULL
       AND ultimo_heartbeat > NOW() - INTERVAL ? HOUR`,
    [empresaId, HEARTBEAT_WINDOW_HOURS]
  );
  return { emUso, contratadas: empresa?.licencas_contratadas ?? 0 };
}

module.exports = { reservarLicenca, renovarHeartbeat, encerrarSessao, statusLicencas };
