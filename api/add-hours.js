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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const client = await pool.connect();
        
        try {
            // Limpiar horarios existentes
            await client.query('DELETE FROM available_hours');
            console.log('🗑️ Horarios anteriores eliminados');
            
            // Definir horarios por día (9:00 AM - 6:00 PM)
            const timeSlots = [
                '09:00:00', '10:00:00', '11:00:00', '12:00:00', 
                '13:00:00', '14:00:00', '15:00:00', '16:00:00', 
                '17:00:00', '18:00:00'
            ];
            
            const workDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            
            // Obtener todos los barberos
            const barbers = await client.query('SELECT id FROM barbers WHERE is_active = true');
            
            let insertedCount = 0;
            
            for (const barber of barbers.rows) {
                for (const day of workDays) {
                    // Sábado solo hasta las 3:00 PM
                    const availableSlots = day === 'saturday' 
                        ? timeSlots.filter(time => time <= '15:00:00')
                        : timeSlots;
                    
                    for (const timeSlot of availableSlots) {
                        // Calcular end_time (1 hora después)
                        const startHour = parseInt(timeSlot.split(':')[0]);
                        const endTime = `${(startHour + 1).toString().padStart(2, '0')}:00:00`;
                        
                        await client.query(`
                            INSERT INTO available_hours (day_of_week, start_time, end_time, barber_id, is_active) 
                            VALUES ($1, $2, $3, $4, true)
                        `, [day, timeSlot, endTime, barber.id]);
                        
                        insertedCount++;
                    }
                }
            }
            
            console.log(`✅ ${insertedCount} horarios insertados`);
            
            // Verificar inserción
            const totalHours = await client.query('SELECT COUNT(*) as total FROM available_hours');
            
            res.json({
                message: 'Horarios agregados correctamente',
                inserted_hours: insertedCount,
                total_hours_in_db: parseInt(totalHours.rows[0].total),
                available_time_slots: timeSlots,
                work_days: workDays,
                barbers_count: barbers.rows.length
            });
            
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error agregando horarios:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
};
