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
        // Verificar token de autenticación y rol de admin
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar que el usuario sea admin
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
        }

        const client = await pool.connect();
        
        try {
            // Obtener todas las reservas con información completa
            const reservations = await client.query(`
                SELECT 
                    r.id,
                    r.reservation_date,
                    r.reservation_time,
                    r.client_name,
                    r.client_phone,
                    r.client_email,
                    r.status,
                    r.notes,
                    r.created_at,
                    r.updated_at,
                    b.name as barber_name,
                    s.name as service_name,
                    s.duration_minutes,
                    s.price,
                    u.username as user_username,
                    u.email as user_email
                FROM reservations r
                LEFT JOIN barbers b ON r.barber_id = b.id
                LEFT JOIN services s ON r.service_id = s.id
                LEFT JOIN users u ON r.user_id = u.id
                ORDER BY r.reservation_date DESC, r.reservation_time DESC
            `);
            
            // Agregar estadísticas
            const stats = await client.query(`
                SELECT 
                    COUNT(*) as total_reservations,
                    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                    COUNT(CASE WHEN reservation_date = CURRENT_DATE THEN 1 END) as today,
                    COUNT(CASE WHEN reservation_date > CURRENT_DATE THEN 1 END) as upcoming
                FROM reservations
            `);
            
            res.json({ 
                reservations: reservations.rows,
                statistics: stats.rows[0]
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error obteniendo todas las reservas:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token inválido' });
        }
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
};
