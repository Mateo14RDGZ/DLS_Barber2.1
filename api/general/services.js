const { Pool } = require('pg');

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
        const client = await pool.connect();
        
        try {
            // Obtener todos los servicios con estadísticas
            const services = await client.query(`
                SELECT 
                    s.id,
                    s.name,
                    s.description,
                    s.duration_minutes,
                    s.price,
                    s.is_active,
                    s.created_at,
                    COUNT(r.id) as total_reservations
                FROM services s
                LEFT JOIN reservations r ON s.id = r.service_id
                GROUP BY s.id, s.name, s.description, s.duration_minutes, s.price, s.is_active, s.created_at
                ORDER BY s.name
            `);
            
            res.json({ services: services.rows });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error obteniendo servicios:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
};
