const { connectToDatabase } = require('../_utils/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
    try {
        // Configuración CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Content-Type', 'application/json');
        
        console.log('🔐 [auth/login] === INICIANDO LOGIN ===');
        console.log('🔐 [auth/login] Método:', req.method);
        console.log('🔐 [auth/login] Headers:', req.headers);
        
        // Manejar preflight OPTIONS request
        if (req.method === 'OPTIONS') {
            console.log('✅ [auth/login] Respondiendo a OPTIONS');
            return res.status(200).end();
        }
        
        // Solo permitir POST para login
        if (req.method !== 'POST') {
            console.log('❌ [auth/login] Método no permitido:', req.method);
            return res.status(405).json({ 
                success: false,
                error: 'Método no permitido',
                message: 'Solo se permite POST para login' 
            });
        }

        console.log('📋 [auth/login] Extrayendo datos del body...');
        console.log('� [auth/login] Body raw:', req.body);
        
        const { email, password } = req.body;
        console.log('📋 [auth/login] Email:', email);
        console.log('📋 [auth/login] Password length:', password ? password.length : 'undefined');

        if (!email || !password) {
            console.log('❌ [auth/login] Campos faltantes');
            return res.status(400).json({ 
                success: false,
                error: 'Email y contraseña son requeridos' 
            });
        }

        console.log('🔌 [auth/login] Intentando conectar a base de datos...');
        const db = await connectToDatabase();
        
        if (!db) {
            console.error('❌ [auth/login] Error de conexión a base de datos');
            return res.status(500).json({ 
                success: false,
                error: 'Error de conexión a base de datos' 
            });
        }
        
        console.log('✅ [auth/login] Conexión a DB exitosa');
        console.log('👤 [auth/login] Buscando usuario:', email);
        
        // Buscar usuario
        const userQuery = await db.query(
            'SELECT id, username, email, password_hash as password, full_name, phone, role FROM users WHERE email = $1',
            [email]
        );

        console.log('📊 [auth/login] Resultado consulta usuarios:', userQuery.rows.length);

        if (userQuery.rows.length === 0) {
            console.log('❌ [auth/login] Usuario no encontrado');
            return res.status(401).json({ 
                success: false,
                error: 'Credenciales inválidas' 
            });
        }

        const user = userQuery.rows[0];
        console.log('✅ [auth/login] Usuario encontrado:', user.id, user.email);

        // Verificar contraseña
        console.log('🔐 [auth/login] Verificando contraseña...');
        const isValidPassword = await bcrypt.compare(password, user.password);
        console.log('🔐 [auth/login] Contraseña válida:', isValidPassword);

        if (!isValidPassword) {
            console.log('❌ [auth/login] Contraseña inválida');
            return res.status(401).json({ 
                success: false,
                error: 'Credenciales inválidas' 
            });
        }

        console.log('🔑 [auth/login] Generando token JWT...');
        
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
        console.error('❌ [auth/login] Error crítico:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            name: error.name
        });
        
        return res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : 'Error interno'
        });
    }
};
