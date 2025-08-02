const jwt = require('jsonwebtoken');

// Clave secreta para firmar tokens (en producción, usar una variable de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'dls_barber_secret_key_2025';

// Generar token JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      name: user.name || user.username
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Token válido por 7 días
  );
};

// Verificar token JWT
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Error verificando token:', error.message);
    return null;
  }
};

// Verificar si el usuario es administrador
const isAdmin = (user) => {
  return user && user.role === 'admin';
};

module.exports = {
  generateToken,
  verifyToken,
  isAdmin
};
