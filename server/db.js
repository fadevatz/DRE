const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'database-config.json');

// Configuração padrão
let dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

// Carregar configuração salva se existir
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    dbConfig = { ...dbConfig, ...saved };
  } catch (err) {
    console.error('Erro ao ler database-config.json:', err.message);
  }
}

let pool = null;
let lastConnectionStatus = {
  connected: false,
  message: 'Não conectado ainda. Configure o banco de dados.',
  lastCheck: null,
  database: dbConfig.database,
  host: dbConfig.host,
  tablesFound: []
};

async function initPool(config = null) {
  if (config) {
    dbConfig = { ...dbConfig, ...config };
  }
  
  if (pool) {
    try {
      await pool.end();
    } catch (e) {}
    pool = null;
  }

  if (!dbConfig.database) {
    lastConnectionStatus = {
      connected: false,
      message: 'Nome do banco de dados não informado.',
      lastCheck: new Date(),
      database: dbConfig.database,
      host: dbConfig.host,
      tablesFound: []
    };
    return false;
  }

  try {
    pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();
    
    // Testar tabelas
    const [tables] = await connection.query('SHOW TABLES');
    connection.release();
    
    const tableNames = tables.map(row => Object.values(row)[0]);
    const hasPagar = tableNames.some(t => t.toLowerCase() === 'pagar');
    const hasPlanoContas = tableNames.some(t => t.toLowerCase() === 'planocontas');
    const hasFilial = tableNames.some(t => t.toLowerCase() === 'filial');

    lastConnectionStatus = {
      connected: true,
      message: 'Conectado com sucesso ao MariaDB.',
      lastCheck: new Date(),
      database: dbConfig.database,
      host: dbConfig.host,
      tablesFound: {
        pagar: hasPagar,
        planocontas: hasPlanoContas,
        filial: hasFilial,
        all: tableNames
      }
    };
    return true;
  } catch (error) {
    console.error('Falha ao conectar no MariaDB:', error.message);
    lastConnectionStatus = {
      connected: false,
      message: `Erro ao conectar: ${error.message}`,
      lastCheck: new Date(),
      database: dbConfig.database,
      host: dbConfig.host,
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

function getConfig() {
  return {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database,
    password: dbConfig.password ? '******' : ''
  };
}

async function saveConfig(newConfig) {
  const updated = {
    host: newConfig.host || '127.0.0.1',
    port: parseInt(newConfig.port || '3306', 10),
    user: newConfig.user || 'root',
    database: newConfig.database || ''
  };
  
  if (newConfig.password !== undefined && newConfig.password !== '******') {
    updated.password = newConfig.password;
  } else {
    updated.password = dbConfig.password;
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  return await initPool(updated);
}

async function testConnection(testConfig) {
  try {
    const conn = await mysql.createConnection({
      host: testConfig.host || '127.0.0.1',
      port: parseInt(testConfig.port || '3306', 10),
      user: testConfig.user || 'root',
      password: testConfig.password || '',
      database: testConfig.database || undefined,
      connectTimeout: 5000
    });
    
    let tables = [];
    if (testConfig.database) {
      const [res] = await conn.query('SHOW TABLES');
      tables = res.map(row => Object.values(row)[0]);
    }
    await conn.end();
    
    return {
      success: true,
      message: 'Conexão estabelecida com sucesso!',
      tables
    };
  } catch (err) {
    return {
      success: false,
      message: err.message
    };
  }
}

// Iniciar conexão inicial
initPool();

module.exports = {
  getPool,
  getStatus,
  getConfig,
  saveConfig,
  testConnection,
  initPool
};

