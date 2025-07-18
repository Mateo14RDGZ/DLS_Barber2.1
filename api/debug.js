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
            // Obtener todos los horarios configurados
            const allHours = await client.query(`
                SELECT barber_id, day_of_week, start_time, is_active
                FROM available_hours 
                ORDER BY barber_id, day_of_week, start_time
            `);
            
            // Obtener barberos
            const barbers = await client.query(`
                SELECT id, name FROM barbers ORDER BY id
            `);
            
            // Obtener reservas para hoy y próximos días
            const reservations = await client.query(`
                SELECT barber_id, reservation_date, reservation_time, status
                FROM reservations
                WHERE reservation_date >= CURRENT_DATE
                ORDER BY reservation_date, reservation_time
            `);
            
            res.json({
                available_hours: allHours.rows,
                barbers: barbers.rows,
                upcoming_reservations: reservations.rows,
                debug_info: {
                    total_available_hours: allHours.rows.length,
                    total_barbers: barbers.rows.length,
                    total_reservations: reservations.rows.length
                }
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error en debug:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
};
