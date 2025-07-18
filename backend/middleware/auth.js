const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database_sqlite');

// Middleware para validar JWT
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar si el usuario existe
        const user = await executeQuery(
            'SELECT id, username, email, full_name, phone, role FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (user.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        req.user = user[0];
        next();
    } catch (error) {
        console.error('Error verificando token:', error);
        return res.status(403).json({ error: 'Token inválido' });
    }
};

// Middleware para verificar rol de admin
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
    }
    next();
};

// Validaciones para registro de usuario
const validateUserRegistration = [
    body('username')
        .isLength({ min: 3, max: 50 })
        .withMessage('El username debe tener entre 3 y 50 caracteres')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('El username solo puede contener letras, números y guiones bajos'),
    
    body('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres'),
    
    body('full_name')
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre completo debe tener entre 2 y 100 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\.'-]+$/)
        .withMessage('El nombre contiene caracteres no válidos'),
    
    body('phone')
        .optional()
        .matches(/^[0-9\s\-\+\(\)]+$/)
        .withMessage('Formato de teléfono inválido')
];

// Validaciones para login
const validateUserLogin = [
    body('email')
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
    
    body('password')
        .notEmpty()
        .withMessage('La contraseña es requerida')
];

// Validaciones para reserva
const validateReservation = [
    body('barber_id')
        .isInt({ min: 1 })
        .withMessage('ID de barbero inválido'),
    
    body('service_id')
        .isInt({ min: 1 })
        .withMessage('ID de servicio inválido'),
    
    body('reservation_date')
        .isDate()
        .withMessage('Fecha de reserva inválida')
        .custom((value) => {
            const date = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (date < today) {
                throw new Error('La fecha de reserva no puede ser anterior a hoy');
            }
            return true;
        }),
    
    body('reservation_time')
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato de hora inválido (HH:MM)'),
    
    body('client_name')
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre del cliente debe tener entre 2 y 100 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios'),
    
    body('client_phone')
        .matches(/^[0-9\s\-\+\(\)]+$/)
        .withMessage('Formato de teléfono inválido'),
    
    body('client_email')
        .optional()
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
    
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Las notas no pueden exceder 500 caracteres')
];

// Función para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Errores de validación',
            details: errors.array()
        });
    }
    next();
};

// Función para hashear contraseñas
const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

// Función para comparar contraseñas
const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

// Función para generar JWT
const generateToken = (userId, username, role) => {
    const secret = process.env.JWT_SECRET || 'dls_barber_jwt_secret_2025_development';
    
    if (!secret) {
        console.error('❌ JWT_SECRET no definido');
        throw new Error('JWT_SECRET no configurado');
    }
    
    return jwt.sign(
        { userId, username, role },
        secret,
        { expiresIn: '24h' }
    );
};

module.exports = {
    authenticateToken,
    requireAdmin,
    validateUserRegistration,
    validateUserLogin,
    validateReservation,
    handleValidationErrors,
    hashPassword,
    comparePassword,
    generateToken
};
