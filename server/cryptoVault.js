// Módulo de Segurança e Criptografia AES-256-GCM para Proteção de Credenciais Sensíveis
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
// Chave derivada segura da aplicação
const MASTER_KEY = crypto.scryptSync(
  process.env.APP_ENCRYPTION_KEY || 'DROGARIA_SC_FINANCEIRO_DRE_SECURE_VAULT_2026',
  'drogaria_sc_security_salt',
  32
);

// Payload criptografado padrão das credenciais de banco de dados
// Contém: host: drogariasscblu.clientebig.com.br, database: gerente, user: root, password: ***, port: 3306
const ENCRYPTED_DEFAULT_CREDENTIALS = {
  iv: 'a748cf2c44bf827786bce4e0',
  tag: '423891233f9bf976d06cfe219a7afff4',
  ciphertext: '0ad8f925fdc9082748f5bc7b0ffa7aaa9a7aaaffec633d84d4ddee82065aae04920c5251b477a9bc8f36d8d8d96a0a9487374e914c4013fd58980bc9cf370966fb58db93f96736fa6ceb4cc702eaa5b6fe4d4aa6b01a6a201391d52b94b687fb630acb51f7e7f85ac0965e4e14db1203b9'
};

function encrypt(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: encrypted
  };
}

function decrypt(encryptedObj) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    MASTER_KEY,
    Buffer.from(encryptedObj.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(encryptedObj.tag, 'hex'));
  let decrypted = decipher.update(encryptedObj.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Obtém as credenciais descriptografadas exclusivamente em memória
function getDecryptedDbCredentials() {
  try {
    const jsonStr = decrypt(ENCRYPTED_DEFAULT_CREDENTIALS);
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Erro de integridade criptográfica ao descriptografar credenciais:', err.message);
    throw new Error('Falha de descriptografia de credenciais.');
  }
}

module.exports = {
  encrypt,
  decrypt,
  getDecryptedDbCredentials
};
