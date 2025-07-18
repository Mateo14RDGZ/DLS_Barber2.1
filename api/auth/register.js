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
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { username, email, password, full_name, phone } = req.body;

        if (!username || !email || !password || !full_name || !phone) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        const client = await pool.connect();
        
        try {
            // Verificar si el usuario ya existe
            const existingUser = await client.query(
                'SELECT id FROM users WHERE username = $1 OR email = $2',
                [username, email]
            );

            if (existingUser.rows.length > 0) {
                return res.status(400).json({ error: 'El usuario o email ya existe' });
            }

            // Hashear la contraseña
            const passwordHash = await bcrypt.hash(password, 12);

            // Crear usuario
            const result = await client.query(
                'INSERT INTO users (username, email, password, full_name, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [username, email, passwordHash, full_name, phone]
            );

            const newUserId = result.rows[0].id;

            // Generar token
            const token = jwt.sign(
                { userId: newUserId, role: 'user' },
                process.env.JWT_SECRET || 'dlsbarber_fallback_secret',
                { expiresIn: '24h' }
            );

            res.status(201).json({
                message: 'Usuario registrado exitosamente',
                token,
                user: {
                    id: newUserId,
                    username,
                    email,
                    full_name,
                    phone,
                    role: 'user'
                }
            });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
