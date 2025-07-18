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

    if (req.method !== 'POST') {
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
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token inválido' });
        }
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
};
