const { connectToDatabase } = require('./_utils/database');
const { verifyToken } = require('./_utils/auth');

module.exports = async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const action = searchParams.get('action');
    
    console.log('🔍 Reservations API - pathname:', pathname, 'action:', action);
    
    // Determinar la acción basada en la URL y parámetros
    if (action === 'my-reservations' || pathname.includes('/my-reservations')) {
        return await handleMyReservations(req, res);
    } else if (action === 'all' || pathname.includes('/all')) {
        return await handleAllReservations(req, res);
    } else if (action === 'available-hours-query' || pathname.includes('/available-hours-query')) {
        return await handleAvailableHours(req, res);
    } else if (action === 'available-hours' || pathname.includes('/available-hours')) {
        return await handleAvailableHours(req, res);
    } else if (req.method === 'POST') {
        return await handleCreateReservation(req, res);
    } else {
        return res.status(404).json({ error: 'Endpoint not found' });
    }
};

async function handleCreateReservation(req, res) {
    try {
        console.log('🔍 [reservations/create] Iniciando creación de reserva');
        
        // Verificar token
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ 
                success: false,
                error: 'Token no proporcionado' 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const decoded = verifyToken(token);
        
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ 
                success: false,
                error: 'Token inválido' 
            });
        }
        
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

        console.log('📋 [reservations/create] Datos recibidos:', {
            barber_id, service_id, reservation_date, reservation_time, client_name, client_phone
        });

        // Validaciones básicas
        if (!barber_id || !service_id || !reservation_date || !reservation_time || !client_name || !client_phone) {
            return res.status(400).json({ 
                success: false,
                error: 'Todos los campos requeridos deben ser proporcionados' 
            });
        }

        console.log('🔌 [reservations/create] Conectando a base de datos...');
        const db = await connectToDatabase();
        
        if (!db) {
            return res.status(500).json({ 
                success: false,
                error: 'Error de conexión a base de datos' 
            });
        }
        
        // Verificar si el horario está disponible
        console.log('⏰ [reservations/create] Verificando disponibilidad...');
        const existingReservation = await db.query(`
            SELECT id FROM reservations 
            WHERE barber_id = $1 AND reservation_date = $2 AND reservation_time = $3 AND status != 'cancelled'
        `, [barber_id, reservation_date, reservation_time]);
        
        if (existingReservation.rows.length > 0) {
            return res.status(400).json({ 
                success: false,
                error: 'El horario seleccionado ya está ocupado' 
            });
        }
        
        // Crear la reserva
        console.log('✍️ [reservations/create] Creando reserva...');
        const result = await db.query(`
                INSERT INTO reservations 
                (user_id, barber_id, service_id, reservation_date, reservation_time, client_name, client_phone, client_email, notes) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            INSERT INTO reservations 
            (user_id, barber_id, service_id, reservation_date, reservation_time, client_name, client_phone, client_email, notes) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `, [userId, barber_id, service_id, reservation_date, reservation_time, client_name, client_phone, client_email, notes]);
        
        const reservationId = result.rows[0].id;
        console.log('✅ [reservations/create] Reserva creada con ID:', reservationId);
        
        // Obtener datos completos de la reserva creada
        const reservation = await db.query(`
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
        `, [reservationId]);
        
        console.log('✅ [reservations/create] Reserva creada exitosamente');
        
        return res.status(201).json({
            success: true,
            message: 'Reserva creada exitosamente',
            reservation: reservation.rows[0]
        });
        
    } catch (error) {
        console.error('❌ [reservations/create] Error:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        
        return res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
}

async function handleMyReservations(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false,
            error: 'Method not allowed' 
        });
    }

    try {
        console.log('🔍 [reservations/my] Obteniendo reservas del usuario');
        
        // Verificar token
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ 
                success: false,
                error: 'Token no proporcionado' 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const decoded = verifyToken(token);
        
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ 
                success: false,
                error: 'Token inválido' 
            });
        }
        
        const userId = decoded.userId;
        console.log('👤 [reservations/my] Usuario:', userId);

        console.log('🔌 [reservations/my] Conectando a base de datos...');
        const db = await connectToDatabase();
        
        if (!db) {
            return res.status(500).json({ 
                success: false,
                error: 'Error de conexión a base de datos' 
            });
        }
        
        const reservations = await db.query(`
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
        
        console.log('✅ [reservations/my] Reservas obtenidas:', reservations.rows?.length || 0);
        
        return res.json({ 
            success: true,
            reservations: reservations.rows || [] 
        });
        
    } catch (error) {
        console.error('❌ [reservations/my] Error:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        
        return res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
}

async function handleAllReservations(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false,
            error: 'Method not allowed' 
        });
    }

    try {
        console.log('🔍 [reservations/all] Obteniendo todas las reservas');
        
        // Verificar token (solo para autenticados)
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ 
                success: false,
                error: 'Token no proporcionado' 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({ 
                success: false,
                error: 'Token inválido' 
            });
        }

        console.log('🔌 [reservations/all] Conectando a base de datos...');
        const db = await connectToDatabase();
        
        if (!db) {
            return res.status(500).json({ 
                success: false,
                error: 'Error de conexión a base de datos' 
            });
        }
        
        const reservations = await db.query(`
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
        
        console.log('✅ [reservations/all] Reservas obtenidas:', reservations.rows?.length || 0);
        
        return res.json({ 
            success: true,
            reservations: reservations.rows || [] 
        });
        
    } catch (error) {
        console.error('❌ [reservations/all] Error:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        
        return res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
}

async function handleAvailableHours(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false,
            error: 'Method not allowed' 
        });
    }

    try {
        console.log('🔍 [reservations/available-hours] Obteniendo horarios disponibles');
        
        const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
        const date = searchParams.get('date');
        const barber_id = searchParams.get('barber_id');

        console.log('📋 [reservations/available-hours] Parámetros:', { date, barber_id });

        if (!date) {
            return res.status(400).json({ 
                success: false,
                error: 'Fecha es requerida' 
            });
        }

        console.log('🔌 [reservations/available-hours] Conectando a base de datos...');
        const db = await connectToDatabase();
        
        if (!db) {
            return res.status(500).json({ 
                success: false,
                error: 'Error de conexión a base de datos' 
            });
        }
        
        // Generar horarios disponibles (9:00 AM - 6:00 PM)
        const requestDate = new Date(date);
        const dayOfWeek = requestDate.getDay(); // 0 = Domingo, 6 = Sábado
        
        let endHour = 18; // 6:00 PM por defecto
        if (dayOfWeek === 6) { // Sábado
            endHour = 15; // 3:00 PM
        } else if (dayOfWeek === 0) { // Domingo
            console.log('📅 [reservations/available-hours] Domingo - cerrado');
            return res.json({ 
                success: true,
                available_hours: [] 
            }); // Cerrado los domingos
        }

        const availableHours = [];
        for (let hour = 9; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += 30) { // Cada 30 minutos
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                availableHours.push(timeString);
            }
        }

        console.log('⏰ [reservations/available-hours] Horarios base generados:', availableHours.length);

        // Obtener reservas existentes para esta fecha (y barbero si se especifica)
        let query = 'SELECT reservation_time FROM reservations WHERE reservation_date = $1 AND status NOT IN ($2, $3)';
        let params = [date, 'cancelled', 'completed'];
        
        if (barber_id) {
            query += ' AND barber_id = $4';
            params.push(barber_id);
        }

        const existingReservations = await db.query(query, params);
        const reservedHours = existingReservations.rows.map(row => row.reservation_time.slice(0, 5));
        const finalAvailableHours = availableHours.filter(hour => !reservedHours.includes(hour));

        console.log('✅ [reservations/available-hours] Horarios disponibles:', finalAvailableHours.length);
        console.log('📋 [reservations/available-hours] Reservados:', reservedHours);

        return res.json({ 
            success: true,
            available_hours: finalAvailableHours 
        });
        
    } catch (error) {
        console.error('❌ [reservations/available-hours] Error:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        
        return res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
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
