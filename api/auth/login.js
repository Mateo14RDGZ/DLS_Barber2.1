const { connectToDatabase } = require('../_utils/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
    // Configuración CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');
    
    // Manejar preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Solo permitir POST para login
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false,
            error: 'Método no permitido' 
        });
    }

    try {
        console.log('� [auth/login] === INICIANDO LOGIN ===');
        
        // Extraer datos del body
        const { email, password } = req.body || {};
        
        console.log('📋 [auth/login] Email recibido:', email);
        console.log('📋 [auth/login] Password length:', password ? password.length : 'undefined');

        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Email y contraseña son requeridos' 
            });
        }

        console.log('🔌 [auth/login] Conectando a base de datos...');
        const db = await connectToDatabase();
        
        console.log('👤 [auth/login] Buscando usuario:', email);
        
        // Buscar usuario
        const userQuery = await db.query(
            'SELECT id, username, email, password_hash as password, full_name, phone, role FROM users WHERE email = $1',
            [email]
        );

        if (userQuery.rows.length === 0) {
            return res.status(401).json({ 
                success: false,
                error: 'Credenciales inválidas' 
            });
        }

        const user = userQuery.rows[0];
        console.log('✅ [auth/login] Usuario encontrado:', user.id);

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                error: 'Credenciales inválidas' 
            });
        }

        // Generar token JWT
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email,
                role: user.role 
            },
            process.env.JWT_SECRET || 'dls_barber_secret_key_2024',
            { expiresIn: '7d' }
        );

        // Devolver datos del usuario sin la contraseña
        const { password: _, ...userWithoutPassword } = user;

        console.log('✅ [auth/login] Login exitoso para usuario:', user.id);

        return res.status(200).json({
            success: true,
            message: 'Login exitoso',
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('❌ [auth/login] Error crítico:', error);
        
        return res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
    }
};
