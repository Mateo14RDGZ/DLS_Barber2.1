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

    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    
    // Determinar la acción basada en la URL y método
    if (pathname.includes('/my-reservations')) {
        return await handleMyReservations(req, res);
    } else if (pathname.includes('/all')) {
        return await handleAllReservations(req, res);
    } else if (pathname.includes('/available-hours-query')) {
        return await handleAvailableHoursQuery(req, res);
    } else if (pathname.includes('/available-hours')) {
        return await handleAvailableHours(req, res);
    } else if (req.method === 'POST') {
        return await handleCreateReservation(req, res);
    } else {
        return res.status(404).json({ error: 'Endpoint not found' });
    }
};

// Verificar autenticación
function verifyAuth(req) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        throw new Error('Token no proporcionado');
    }
    return jwt.verify(token, process.env.JWT_SECRET || 'dls_barber_secret_key_2024');
}

async function handleCreateReservation(req, res) {
    try {
        const decoded = verifyAuth(req);
        const userId = decoded.userId;

        const {
            barber_id,
            service_id,
            reservation_date,
            reservation_time,
            client_name,
            client_phone,
            client_email,
            notes
        } = req.body;

        // Validaciones básicas
        if (!barber_id || !service_id || !reservation_date || !reservation_time || !client_name || !client_phone) {
            return res.status(400).json({ error: 'Todos los campos requeridos deben ser proporcionados' });
        }

        const client = await pool.connect();
        
        try {
            // Verificar si el horario está disponible
            const existingReservation = await client.query(`
                SELECT id FROM reservations 
                WHERE barber_id = $1 AND reservation_date = $2 AND reservation_time = $3 AND status != 'cancelled'
            `, [barber_id, reservation_date, reservation_time]);
            
            if (existingReservation.rows.length > 0) {
                return res.status(400).json({ error: 'El horario seleccionado ya está ocupado' });
            }
            
            // Crear la reserva
            const result = await client.query(`
                INSERT INTO reservations 
                (user_id, barber_id, service_id, reservation_date, reservation_time, client_name, client_phone, client_email, notes) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            `, [userId, barber_id, service_id, reservation_date, reservation_time, client_name, client_phone, client_email, notes]);
            
            // Obtener datos completos de la reserva creada
            const reservation = await client.query(`
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
                WHERE r.id = $1
            `, [result.rows[0].id]);
            
            res.status(201).json({
                message: 'Reserva creada exitosamente',
                reservation: reservation.rows[0]
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error creando reserva:', error);
        if (error.message === 'Token no proporcionado') {
            return res.status(401).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

async function handleMyReservations(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const decoded = verifyAuth(req);
        const userId = decoded.userId;

        const client = await pool.connect();
        
        try {
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
            
            res.json({ reservations: reservations.rows });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error obteniendo mis reservas:', error);
        if (error.message === 'Token no proporcionado') {
            return res.status(401).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

async function handleAllReservations(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        verifyAuth(req); // Solo verificar que esté autenticado

        const client = await pool.connect();
        
        try {
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
                    b.name as barber_name,
                    s.name as service_name,
                    s.duration_minutes,
                    s.price,
                    u.username
                FROM reservations r
                LEFT JOIN barbers b ON r.barber_id = b.id
                LEFT JOIN services s ON r.service_id = s.id
                LEFT JOIN users u ON r.user_id = u.id
                ORDER BY r.reservation_date DESC, r.reservation_time DESC
            `);
            
            res.json({ reservations: reservations.rows });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error obteniendo todas las reservas:', error);
        if (error.message === 'Token no proporcionado') {
            return res.status(401).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

async function handleAvailableHours(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
        const date = searchParams.get('date');
        const barber_id = searchParams.get('barber_id');

        if (!date || !barber_id) {
            return res.status(400).json({ error: 'Fecha y barbero son requeridos' });
        }

        const client = await pool.connect();
        
        try {
            // Generar horarios disponibles (10:00 AM - 6:00 PM, Lun-Vie; 10:00 AM - 3:00 PM, Sáb)
            const requestDate = new Date(date);
            const dayOfWeek = requestDate.getDay(); // 0 = Domingo, 6 = Sábado
            
            let endHour = 18; // 6:00 PM por defecto
            if (dayOfWeek === 6) { // Sábado
                endHour = 15; // 3:00 PM
            } else if (dayOfWeek === 0) { // Domingo
                return res.json({ available_hours: [] }); // Cerrado los domingos
            }

            const availableHours = [];
            for (let hour = 10; hour < endHour; hour++) {
                for (let minute = 0; minute < 60; minute += 45) {
                    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                    availableHours.push(timeString);
                }
            }

            // Obtener reservas existentes para este barbero y fecha
            const existingReservations = await client.query(
                'SELECT reservation_time FROM reservations WHERE barber_id = $1 AND reservation_date = $2 AND status != $3',
                [barber_id, date, 'cancelled']
            );

            const reservedHours = existingReservations.rows.map(row => row.reservation_time.slice(0, 5));
            const finalAvailableHours = availableHours.filter(hour => !reservedHours.includes(hour));

            res.json({ available_hours: finalAvailableHours });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error obteniendo horarios disponibles:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

async function handleAvailableHoursQuery(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { date, barber_id } = req.body;

        if (!date || !barber_id) {
            return res.status(400).json({ error: 'Fecha y barbero son requeridos' });
        }

        const client = await pool.connect();
        
        try {
            // Misma lógica que handleAvailableHours pero con POST
            const requestDate = new Date(date);
            const dayOfWeek = requestDate.getDay();
            
            let endHour = 18;
            if (dayOfWeek === 6) {
                endHour = 15;
            } else if (dayOfWeek === 0) {
                return res.json({ available_hours: [] });
            }

            const availableHours = [];
            for (let hour = 10; hour < endHour; hour++) {
                for (let minute = 0; minute < 60; minute += 45) {
                    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                    availableHours.push(timeString);
                }
            }

            const existingReservations = await client.query(
                'SELECT reservation_time FROM reservations WHERE barber_id = $1 AND reservation_date = $2 AND status != $3',
                [barber_id, date, 'cancelled']
            );

            const reservedHours = existingReservations.rows.map(row => row.reservation_time.slice(0, 5));
            const finalAvailableHours = availableHours.filter(hour => !reservedHours.includes(hour));

            res.json({ available_hours: finalAvailableHours });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error obteniendo horarios disponibles (query):', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
