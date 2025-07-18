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
        // Extraer parámetros de la query string
        const { date, barberId } = req.query;

        if (!date || !barberId) {
            return res.status(400).json({ error: 'Fecha y barbero son requeridos' });
        }

        const client = await pool.connect();
        
        try {
            // Obtener día de la semana
            const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            console.log(`🔍 Buscando horarios para: ${date} (${dayOfWeek}) - Barbero: ${barberId}`);
            
            // Obtener horarios configurados para el barbero y día
            const availableHours = await client.query(`
                SELECT DISTINCT start_time 
                FROM available_hours 
                WHERE barber_id = $1 AND day_of_week = $2 AND is_active = true
                ORDER BY start_time
            `, [barberId, dayOfWeek]);
            
            console.log(`📅 Horarios encontrados en BD:`, availableHours.rows.length);
            
            if (availableHours.rows.length === 0) {
                console.log(`⚠️ No hay horarios configurados para ${dayOfWeek}`);
                return res.json({ available_hours: [] });
            }
            
            // Obtener reservas existentes para esa fecha
            const reservations = await client.query(`
                SELECT reservation_time 
                FROM reservations 
                WHERE barber_id = $1 AND reservation_date = $2 AND status != 'cancelled'
            `, [barberId, date]);
            
            console.log(`📋 Reservas existentes:`, reservations.rows.length);
            
            // Formatear horarios y filtrar los que no estén reservados
            const reservedTimes = reservations.rows.map(r => r.reservation_time.slice(0, 5));
            const availableSlots = availableHours.rows
                .map(hour => hour.start_time.slice(0, 5)) // Formatear a HH:MM
                .filter(time => !reservedTimes.includes(time))
                .filter((time, index, array) => array.indexOf(time) === index); // Eliminar duplicados adicionales
            
            console.log(`✅ Horarios disponibles:`, availableSlots.length);
            
            res.json({ available_hours: availableSlots });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Error obteniendo horarios disponibles:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
};
