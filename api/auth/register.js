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
    
    // Solo permitir POST para registro
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false,
            error: 'Método no permitido',
            message: 'Solo se permite POST para registro' 
        });
    }

    try {
        console.log('📝 [auth/register] === INICIANDO REGISTRO ===');
        
        const { username, email, password, full_name, phone } = req.body;

        // Validar campos requeridos
        if (!username || !email || !password || !full_name) {
            console.log('❌ [auth/register] Campos requeridos faltantes');
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
            console.error('❌ [auth/register] Error de conexión a base de datos');
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
            `INSERT INTO users (username, email, password_hash, full_name, phone, role, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
             RETURNING id, username, email, full_name, phone, role, created_at`,
            [username, email, hashedPassword, full_name, phone || '', 'user']
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
        console.error('❌ [auth/register] Error crítico:', {
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
};
