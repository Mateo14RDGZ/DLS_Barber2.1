const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

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

            // Generar token
            const token = jwt.sign(
                { userId: user.id, role: user.role },
                process.env.JWT_SECRET || 'dlsbarber_fallback_secret',
                { expiresIn: '24h' }
            );

            res.status(200).json({
                message: 'Login exitoso',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    phone: user.phone,
                    role: user.role
                }
            });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
