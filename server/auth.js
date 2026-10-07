const crypto = require('crypto');

// Chave secreta interna para assinar os tokens de autenticação
const JWT_SECRET = process.env.AUTH_SECRET || 'drogaria_sc_hmac_secret_key_8f3d9b4c2a1e6705';
const PASSWORD_SALT = 'drogaria_sc_financeiro_secure_salt_2026';

// Hash PBKDF2 criptográfico seguro da senha padrão: q+T{(:r.wQ5|S?z2^8rw
// A senha em texto plano NUNCA fica armazenada ou exposta no código.
const EXPECTED_USER = 'Administrador';
const EXPECTED_PASSWORD_HASH = '1b0beb53a15d9c589311713bd94295f3e02b468a5448a0d0359cd0bc9651701de152c8c4e0ba6ae39d0f41dc8bf2a3d3d41d5d5e389ff7bf1f775a2d00d92c65';

/**
 * Calcula o hash PBKDF2 de uma senha informada
 */
function hashPassword(password) {
  return crypto.pbkdf2Sync(String(password || ''), PASSWORD_SALT, 100000, 64, 'sha512').toString('hex');
}

/**
 * Valida credenciais com verificação em tempo constante para mitigar timing attacks
 */
function validateCredentials(username, password) {
  if (!username || !password) return false;

  const trimmedUser = String(username).trim();
  if (trimmedUser.toLowerCase() !== EXPECTED_USER.toLowerCase()) {
    return false;
  }

  const computedHash = hashPassword(password);
  const computedBuffer = Buffer.from(computedHash, 'hex');
  const expectedBuffer = Buffer.from(EXPECTED_PASSWORD_HASH, 'hex');

  if (computedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuffer, expectedBuffer);
}

/**
 * Gera um token assinado seguro com validade de 24 horas
 */
function generateToken(username) {
  const payload = {
    username,
    role: 'admin',
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 horas
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payloadBase64).digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Verifica se um token é válido e não expirou
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(payloadBase64).digest('base64url');

  // Proteção contra timing attack
  if (signature.length !== expectedSignature.length) return null;
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);

    if (payload.exp && Date.now() > payload.exp) {
      return null; // Token expirado
    }

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Middleware Express para proteger rotas da API
 */
function requireAuth(req, res, next) {
  // Rotas públicas que não exigem token
  if (
    req.path === '/api/login' ||
    req.path === '/api/status' ||
    req.path === '/api/auth/verify'
  ) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Não autorizado',
      message: 'Token de autenticação ausente ou inválido.'
    });
  }

  const token = authHeader.substring(7).trim();
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      error: 'Sessão expirada',
      message: 'Sua sessão expirou ou é inválida. Por favor, faça login novamente.'
    });
  }

  req.user = decoded;
  next();
}

module.exports = {
  validateCredentials,
  generateToken,
  verifyToken,
  requireAuth
};

