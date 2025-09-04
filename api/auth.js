const { connectToDatabase } = require('./_utils/database');
const { verifyToken } = require('./_utils/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const action = searchParams.get('action');
    
    console.log('🔍 Auth API - pathname:', pathname, 'action:', action);
    
    // Determinar la acción basada en la URL
    if (action === 'login' || pathname.includes('/login')) {
        return await handleLogin(req, res);
    } else if (action === 'register' || pathname.includes('/register')) {
        return await handleRegister(req, res);
    } else {
        return res.status(404).json({ error: 'Endpoint not found' });
    }
};

async function handleLogin(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🔐 [auth/login] Iniciando proceso de login');
        
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Email y contraseña son requeridos' 
            });
        }

        console.log('🔌 [auth/login] Conectando a base de datos...');
        const db = await connectToDatabase();
        
        if (!db) {
            return res.status(500).json({ 
                success: false,
                error: 'Error de conexión a base de datos' 
            });
        }
        
        console.log('👤 [auth/login] Buscando usuario:', email);
        
        // Buscar usuario
        const userQuery = await db.query(
            'SELECT id, username, email, password, full_name, phone, role FROM users WHERE email = $1',
            [email]
        );

        if (userQuery.rows.length === 0) {
            console.log('❌ [auth/login] Usuario no encontrado');
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
        console.error('❌ [auth/login] Error:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        
        return res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
}

async function handleRegister(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false,
            error: 'Method not allowed' 
        });
    }

    try {
        console.log('📝 [auth/register] Iniciando proceso de registro');
        
        const { username, email, password, full_name, phone } = req.body;

        // Validar campos requeridos
        if (!username || !email || !password || !full_name) {
            return res.status(400).json({ 
                success: false,
                error: 'Username, email, contraseña y nombre completo son requeridos' 
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false,
                error: 'Formato de email inválido' 
            });
        }

        // Validar longitud de contraseña
        if (password.length < 6) {
            return res.status(400).json({ 
                success: false,
                error: 'La contraseña debe tener al menos 6 caracteres' 
            });
        }

        console.log('🔌 [auth/register] Conectando a base de datos...');
        const db = await connectToDatabase();
        
        if (!db) {
            return res.status(500).json({ 
                success: false,
                error: 'Error de conexión a base de datos' 
            });
        }
        
        console.log('🔍 [auth/register] Verificando usuario existente...');
        
        // Verificar si el usuario ya existe
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );

        if (existingUser.rows.length > 0) {
            console.log('❌ [auth/register] Usuario ya existe');
            return res.status(409).json({ 
                success: false,
                error: 'El email o username ya está registrado' 
            });
        }

        console.log('🔐 [auth/register] Hasheando contraseña...');
        
        // Hash de la contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        console.log('👤 [auth/register] Creando nuevo usuario...');
        
        // Insertar nuevo usuario
        const result = await db.query(
            `INSERT INTO users (username, email, password, full_name, phone, role, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
             RETURNING id, username, email, full_name, phone, role, created_at`,
            [username, email, hashedPassword, full_name, phone || '', 'customer']
        );

        const newUser = result.rows[0];
        console.log('✅ [auth/register] Usuario creado:', newUser.id);

        console.log('🔑 [auth/register] Generando token JWT...');
        
        // Generar token JWT
        const token = jwt.sign(
            { 
                userId: newUser.id, 
                email: newUser.email,
                role: newUser.role 
            },
            process.env.JWT_SECRET || 'dls_barber_secret_key_2024',
            { expiresIn: '7d' }
        );

        console.log('✅ [auth/register] Registro exitoso para usuario:', newUser.id);

        return res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            token,
            user: newUser
        });

    } catch (error) {
        console.error('❌ [auth/register] Error:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        
        if (error.code === '23505') { // Violación de restricción única
            return res.status(409).json({ 
                success: false,
                error: 'El email o username ya está registrado' 
            });
        }

        return res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
}
