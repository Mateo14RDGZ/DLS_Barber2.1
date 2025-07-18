const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');
const {
    validateUserRegistration,
    validateUserLogin,
    handleValidationErrors,
    hashPassword,
    comparePassword,
    generateToken,
    authenticateToken
} = require('../middleware/auth');

// Registro de usuario
router.post('/register', validateUserRegistration, handleValidationErrors, async (req, res) => {
    try {
        const { username, email, password, full_name, phone } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await executeQuery(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'El usuario o email ya existe' });
        }

        // Hashear la contraseña
        const passwordHash = await hashPassword(password);

        // Crear usuario (compatible con SQLite y PostgreSQL)
        const result = await executeQuery(
            'INSERT INTO users (username, email, password, full_name, phone) VALUES (?, ?, ?, ?, ?)',
            [username, email, passwordHash, full_name, phone]
        );

        // Generar token
        const token = generateToken(result.insertId, username, 'user');

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            token,
            user: {
                id: result.insertId,
                username,
                email,
                full_name,
                phone,
                role: 'user'
            }
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Login de usuario
router.post('/login', validateUserLogin, handleValidationErrors, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario (compatible con SQLite y PostgreSQL)
        const user = await executeQuery(
            'SELECT id, username, email, password, full_name, phone, role FROM users WHERE email = ?',
            [email]
        );

        if (user.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Verificar contraseña
        const isValidPassword = await comparePassword(password, user[0].password);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar token
        const token = generateToken(user[0].id, user[0].username, user[0].role);

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user[0].id,
                username: user[0].username,
                email: user[0].email,
                full_name: user[0].full_name,
                phone: user[0].phone,
                role: user[0].role
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener perfil del usuario actual
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        res.json({
            user: req.user
        });
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar perfil del usuario
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { full_name, phone } = req.body;
        const userId = req.user.id;

        await executeQuery(
            'UPDATE users SET full_name = ?, phone = ? WHERE id = ?',
            [full_name, phone, userId]
        );

        // Obtener datos actualizados
        const updatedUser = await executeQuery(
            'SELECT id, username, email, full_name, phone, role FROM users WHERE id = ?',
            [userId]
        );

        res.json({
            message: 'Perfil actualizado exitosamente',
            user: updatedUser[0]
        });
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Cambiar contraseña
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const userId = req.user.id;

        // Validar nueva contraseña
        if (!new_password || new_password.length < 6) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
        }

        // Obtener contraseña actual
        const user = await executeQuery(
            'SELECT password_hash FROM users WHERE id = ?',
            [userId]
        );

        // Verificar contraseña actual
        const isValidPassword = await comparePassword(current_password, user[0].password_hash);

        if (!isValidPassword) {
            return res.status(400).json({ error: 'Contraseña actual incorrecta' });
        }

        // Hashear nueva contraseña
        const newPasswordHash = await hashPassword(new_password);

        // Actualizar contraseña
        await executeQuery(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [newPasswordHash, userId]
        );

        res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Verificar token
router.get('/verify', authenticateToken, async (req, res) => {
    try {
        // Si llegó aquí, el token es válido (verificado por authenticateToken)
        res.json({ 
            valid: true,
            user: req.user 
        });
    } catch (error) {
        console.error('Error verificando token:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener todos los usuarios (solo admin)
router.get('/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        
        const users = await executeQuery(`
            SELECT id, username, email, full_name, phone, role, created_at, updated_at
            FROM users 
            ORDER BY role DESC, created_at DESC
        `);
        
        res.json({ users });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar usuario (solo admin)
router.delete('/users/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        
        const { id } = req.params;
        
        // No permitir eliminar al mismo admin
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
        }
        
        // Verificar que el usuario existe y no es admin
        const user = await executeQuery('SELECT role FROM users WHERE id = ?', [id]);
        if (user.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        if (user[0].role === 'admin') {
            return res.status(400).json({ error: 'No se puede eliminar otro administrador' });
        }
        
        // Primero eliminar las reservas del usuario
        await executeQuery('DELETE FROM reservations WHERE user_id = ?', [id]);
        
        // Luego eliminar el usuario
        await executeQuery('DELETE FROM users WHERE id = ?', [id]);
        
        res.json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
