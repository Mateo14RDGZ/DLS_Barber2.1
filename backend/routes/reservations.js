const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');
const {
    validateReservation,
    handleValidationErrors,
    authenticateToken
} = require('../middleware/auth');

// Obtener horarios disponibles para una fecha específica
router.get('/available-hours/:date/:barberId', async (req, res) => {
    try {
        const { date, barberId } = req.params;
        
        // Obtener día de la semana
        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        console.log(`🔍 Buscando horarios para: ${date} (${dayOfWeek}) - Barbero: ${barberId}`);
        
        // Obtener horarios configurados para el barbero y día
        const availableHours = await executeQuery(`
            SELECT start_time 
            FROM available_hours 
            WHERE barber_id = ? AND day_of_week = ? AND is_active = 1
            ORDER BY start_time
        `, [barberId, dayOfWeek]);
        
        console.log(`📅 Horarios encontrados en BD:`, availableHours.length);
        
        if (availableHours.length === 0) {
            console.log(`⚠️ No hay horarios configurados para ${dayOfWeek}`);
            return res.json({ available_hours: [] });
        }
        
        // Obtener reservas existentes para esa fecha
        const reservations = await executeQuery(`
            SELECT reservation_time 
            FROM reservations 
            WHERE barber_id = ? AND reservation_date = ? AND status != 'cancelled'
        `, [barberId, date]);
        
        console.log(`📋 Reservas existentes:`, reservations.length);
        
        // Filtrar horarios que no estén reservados
        const reservedTimes = reservations.map(r => r.reservation_time.slice(0, 5));
        const availableSlots = availableHours
            .map(hour => hour.start_time)
            .filter(time => !reservedTimes.includes(time));
        
        console.log(`✅ Horarios disponibles:`, availableSlots.length);
        
        res.json({ available_hours: availableSlots });
    } catch (error) {
        console.error('❌ Error obteniendo horarios disponibles:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Crear nueva reserva
router.post('/', authenticateToken, validateReservation, handleValidationErrors, async (req, res) => {
    try {
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
        
        const user_id = req.user.id;
        
        // Verificar si el horario está disponible
        const existingReservation = await executeQuery(`
            SELECT id FROM reservations 
            WHERE barber_id = ? AND reservation_date = ? AND reservation_time = ? AND status != 'cancelled'
        `, [barber_id, reservation_date, reservation_time]);
        
        if (existingReservation.length > 0) {
            return res.status(400).json({ error: 'El horario seleccionado ya está ocupado' });
        }
        
        // Crear la reserva
        const result = await executeQuery(`
            INSERT INTO reservations 
            (user_id, barber_id, service_id, reservation_date, reservation_time, client_name, client_phone, client_email, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [user_id, barber_id, service_id, reservation_date, reservation_time, client_name, client_phone, client_email, notes]);
        
        // Obtener datos completos de la reserva
        const reservation = await executeQuery(`
            SELECT 
                r.id,
                r.reservation_date,
                r.reservation_time,
                r.client_name,
                r.client_phone,
                r.client_email,
                r.notes,
                r.status,
                r.created_at,
                b.name as barber_name,
                s.name as service_name,
                s.duration_minutes,
                s.price
            FROM reservations r
            JOIN barbers b ON r.barber_id = b.id
            JOIN services s ON r.service_id = s.id
            WHERE r.id = ?
        `, [result.insertId]);
        
        res.status(201).json({
            message: 'Reserva creada exitosamente',
            reservation: reservation[0]
        });
    } catch (error) {
        console.error('Error creando reserva:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener reservas del usuario actual
router.get('/my-reservations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const reservations = await executeQuery(`
            SELECT 
                r.id,
                r.reservation_date,
                r.reservation_time,
                r.client_name,
                r.client_phone,
                r.client_email,
                r.notes,
                r.status,
                r.created_at,
                b.name as barber_name,
                s.name as service_name,
                s.duration_minutes,
                s.price
            FROM reservations r
            JOIN barbers b ON r.barber_id = b.id
            JOIN services s ON r.service_id = s.id
            WHERE r.user_id = ?
            ORDER BY r.reservation_date DESC, r.reservation_time DESC
        `, [userId]);
        
        res.json({ reservations });
    } catch (error) {
        console.error('Error obteniendo reservas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener todas las reservas (solo admin)
router.get('/all', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        
        const reservations = await executeQuery(`
            SELECT 
                r.id,
                r.reservation_date,
                r.reservation_time,
                r.client_name,
                r.client_phone,
                r.client_email,
                r.notes,
                r.status,
                r.created_at,
                b.name as barber_name,
                s.name as service_name,
                s.duration_minutes,
                s.price,
                u.username,
                u.email as user_email
            FROM reservations r
            JOIN barbers b ON r.barber_id = b.id
            JOIN services s ON r.service_id = s.id
            LEFT JOIN users u ON r.user_id = u.id
            ORDER BY r.reservation_date DESC, r.reservation_time DESC
        `);
        
        res.json({ reservations });
    } catch (error) {
        console.error('Error obteniendo todas las reservas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar estado de reserva (solo admin)
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }
        
        await executeQuery(
            'UPDATE reservations SET status = ? WHERE id = ?',
            [status, id]
        );
        
        res.json({ message: 'Estado de reserva actualizado exitosamente' });
    } catch (error) {
        console.error('Error actualizando estado de reserva:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Cancelar reserva (usuario puede cancelar sus propias reservas)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        // Verificar si la reserva pertenece al usuario o si es admin
        const reservation = await executeQuery(
            'SELECT user_id FROM reservations WHERE id = ?',
            [id]
        );
        
        if (reservation.length === 0) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }
        
        if (reservation[0].user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'No tienes permisos para cancelar esta reserva' });
        }
        
        // Actualizar estado a cancelado
        await executeQuery(
            'UPDATE reservations SET status = "cancelled" WHERE id = ?',
            [id]
        );
        
        res.json({ message: 'Reserva cancelada exitosamente' });
    } catch (error) {
        console.error('Error cancelando reserva:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
