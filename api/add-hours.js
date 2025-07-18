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
            
            // Generar horarios cada 45 minutos
            function generateTimeSlots(startHour, startMinute, endHour, endMinute) {
                const slots = [];
                let currentHour = startHour;
                let currentMinute = startMinute;
                
                while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
                    const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}:00`;
                    slots.push(timeString);
                    
                    // Agregar 45 minutos
                    currentMinute += 45;
                    if (currentMinute >= 60) {
                        currentHour += Math.floor(currentMinute / 60);
                        currentMinute = currentMinute % 60;
                    }
                }
                
                return slots;
            }
            
            // Horarios de lunes a viernes: 10:00 AM - 6:00 PM
            const weekdaySlots = generateTimeSlots(10, 0, 18, 0);
            
            // Horarios de sábado: 10:00 AM - 3:00 PM  
            const saturdaySlots = generateTimeSlots(10, 0, 15, 0);
            
            console.log('📅 Horarios de lunes a viernes:', weekdaySlots);
            console.log('📅 Horarios de sábado:', saturdaySlots);
            
            const workDays = {
                'monday': weekdaySlots,
                'tuesday': weekdaySlots, 
                'wednesday': weekdaySlots,
                'thursday': weekdaySlots,
                'friday': weekdaySlots,
                'saturday': saturdaySlots
            };
            
            // Obtener todos los barberos
            const barbers = await client.query('SELECT id FROM barbers WHERE is_active = true');
            
            let insertedCount = 0;
            
            for (const barber of barbers.rows) {
                for (const [day, timeSlots] of Object.entries(workDays)) {
                    for (const timeSlot of timeSlots) {
                        // Calcular end_time (45 minutos después)
                        const [startHour, startMinute] = timeSlot.split(':').map(Number);
                        let endHour = startHour;
                        let endMinute = startMinute + 45;
                        
                        if (endMinute >= 60) {
                            endHour += Math.floor(endMinute / 60);
                            endMinute = endMinute % 60;
                        }
                        
                        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;
                        
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
                message: 'Horarios de 45 minutos agregados correctamente',
                inserted_hours: insertedCount,
                total_hours_in_db: parseInt(totalHours.rows[0].total),
                schedule: {
                    'monday_to_friday': {
                        hours: '10:00 AM - 6:00 PM',
                        slots: weekdaySlots,
                        duration: '45 minutes each'
                    },
                    'saturday': {
                        hours: '10:00 AM - 3:00 PM', 
                        slots: saturdaySlots,
                        duration: '45 minutes each'
                    }
                },
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
