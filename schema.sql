-- Schema da POC: licenciamento concorrente multi-empresa em um único banco MySQL.
-- Simplificação da arquitetura (que previa banco isolado por tenant) para acelerar a validação.

CREATE TABLE IF NOT EXISTS empresas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  licencas_contratadas INT NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);

CREATE TABLE IF NOT EXISTS sessoes_ativas (
  id VARCHAR(36) PRIMARY KEY, -- uuid, vira o sessao_id embutido no JWT
  usuario_id INT NOT NULL,
  empresa_id INT NOT NULL,
  dispositivo VARCHAR(150),
  iniciado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_heartbeat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  encerrada_em DATETIME NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  INDEX idx_empresa_ativa (empresa_id, encerrada_em, ultimo_heartbeat)
);

-- Dados de exemplo para testar o cenário do enunciado: empresa com 2 licenças, 3 usuários.
-- Os usuários de teste (com senha real, hasheada) são criados por `npm run seed` (veja seed.js) — não aqui,
-- para não colocar um hash inventado no schema.
INSERT INTO empresas (nome, licencas_contratadas) VALUES ('Acme Ltda', 2);
