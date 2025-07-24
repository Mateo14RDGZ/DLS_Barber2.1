const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

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
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        const client = await pool.connect();
        
        try {
            // Buscar usuario
            const userQuery = await client.query(
                'SELECT id, username, email, password, full_name, phone, role FROM users WHERE email = $1',
                [email]
            );

            if (userQuery.rows.length === 0) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            const user = userQuery.rows[0];

            // Verificar contraseña
            const isValidPassword = await bcrypt.compare(password, user.password);

            if (!isValidPassword) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
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

            res.status(200).json({
                message: 'Login exitoso',
                token,
                user: userWithoutPassword
            });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

async function handleRegister(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { username, email, password, full_name, phone } = req.body;

        // Validar campos requeridos
        if (!username || !email || !password || !full_name) {
            return res.status(400).json({ 
                error: 'Username, email, contraseña y nombre completo son requeridos' 
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Formato de email inválido' });
        }

        // Validar longitud de contraseña
        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'La contraseña debe tener al menos 6 caracteres' 
            });
        }

        const client = await pool.connect();
        
        try {
            // Verificar si el usuario ya existe
            const existingUser = await client.query(
                'SELECT id FROM users WHERE email = $1 OR username = $2',
                [email, username]
            );

            if (existingUser.rows.length > 0) {
                return res.status(409).json({ 
                    error: 'El email o username ya está registrado' 
                });
            }

            // Hash de la contraseña
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Insertar nuevo usuario
            const result = await client.query(
                `INSERT INTO users (username, email, password, full_name, phone, role, created_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
                 RETURNING id, username, email, full_name, phone, role, created_at`,
                [username, email, hashedPassword, full_name, phone || '', 'customer']
            );

            const newUser = result.rows[0];

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

            res.status(201).json({
                message: 'Usuario registrado exitosamente',
                token,
                user: newUser
            });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error en registro:', error);
        
        if (error.code === '23505') { // Violación de restricción única
            return res.status(409).json({ 
                error: 'El email o username ya está registrado' 
            });
        }

        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
