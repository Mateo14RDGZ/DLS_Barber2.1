const { Pool } = require('pg');
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

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Verificar token de autenticación
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const client = await pool.connect();
        
        try {
            // Obtener reservas del usuario con información completa
            const result = await client.query(`
                SELECT 
                    r.id,
                    r.reservation_date,
                    r.reservation_time,
                    r.client_name,
                    r.client_phone,
                    r.status,
                    r.notes,
                    r.created_at,
                    b.name as barber_name,
                    s.name as service_name,
                    s.duration_minutes,
                    s.price
                FROM reservations r
                LEFT JOIN barbers b ON r.barber_id = b.id
                LEFT JOIN services s ON r.service_id = s.id
                WHERE r.user_id = $1
                ORDER BY r.reservation_date DESC, r.reservation_time DESC
            `, [userId]);
            
            res.json({ reservations: result.rows });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error obteniendo reservas del usuario:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token inválido' });
        }
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
};
