const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smawasis_dev_secret_change_in_production';

/**
 * Verifies JWT from Authorization header.
 * Attaches decoded user payload to req.user.
 */
function verifyJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'TOKEN_EXPIRED', message: 'JWT token has expired. Please login again.' });
    }
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid JWT token' });
  }
}

/**
 * Role-based access control middleware factory.
 * Usage: requireRole('admin') or requireRole('admin', 'contractor')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `This action requires role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
      });
    }
    next();
  };
}

/**
 * Issues a JWT token for a user.
 */
function issueToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, team_id: user.team_id || null },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = { verifyJWT, requireRole, issueToken };
