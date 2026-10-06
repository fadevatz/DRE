const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { getDecryptedDbCredentials } = require('./cryptoVault');

// Limpeza de segurança: remove arquivo legado em texto puro caso exista
const LEGACY_CONFIG = path.join(__dirname, 'database-config.json');
if (fs.existsSync(LEGACY_CONFIG)) {
  try {
    fs.unlinkSync(LEGACY_CONFIG);
  } catch (e) {}
}

// Obtenção das credenciais oficiais protegidas por criptografia AES-256-GCM
const securedCredentials = getDecryptedDbCredentials();

const dbConfig = {
  host: securedCredentials.host,
  port: securedCredentials.port,
  user: securedCredentials.user,
  password: securedCredentials.password,
  database: securedCredentials.database,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  charset: 'utf8mb4',
  connectTimeout: 8000
};

let pool = null;
let lastConnectionStatus = {
  connected: false,
  message: 'Iniciando conexão segura com o MariaDB...',
  lastCheck: null,
  database: securedCredentials.database,
  tablesFound: []
};

async function initPool() {
  if (pool) {
    try {
      await pool.end();
    } catch (e) {}
    pool = null;
  }

  try {
    pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();

    // Teste de conexão e tabelas principais
    const [tables] = await connection.query('SHOW TABLES');
    connection.release();

    const tableNames = tables.map(row => Object.values(row)[0]);
    const hasPagar = tableNames.some(t => t.toLowerCase() === 'pagar');
    const hasPlanoContas = tableNames.some(t => t.toLowerCase() === 'planocontas');
    const hasFilial = tableNames.some(t => t.toLowerCase() === 'filial');

    lastConnectionStatus = {
      connected: true,
      message: 'Conectado com sucesso ao MariaDB Oficial.',
      lastCheck: new Date(),
      database: securedCredentials.database,
      tablesFound: {
        pagar: hasPagar,
        planocontas: hasPlanoContas,
        filial: hasFilial,
        allCount: tableNames.length
      }
    };
    return true;
  } catch (error) {
    console.error('Falha na conexão segura com o MariaDB:', error.message);
    lastConnectionStatus = {
      connected: false,
      message: `Erro ao conectar: ${error.message}`,
      lastCheck: new Date(),
      database: securedCredentials.database,
      tablesFound: []
    };
    pool = null;
    return false;
  }
}

function getPool() {
  return pool;
}

function getStatus() {
  return lastConnectionStatus;
}

// Conexão inicial imediata
initPool();

module.exports = {
  getPool,
  getStatus,
  initPool
};
