// Endpoint de compatibilidad - mismo código que /api/my-reservations.js
const { connectToDatabase } = require('../_utils/database');
const { verifyToken } = require('../_utils/auth');

module.exports = async (req, res) => {
  // Configuración CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  
  console.log('🔍 [my-reservations-legacy] Endpoint de compatibilidad activado');
  console.log('📋 [my-reservations-legacy] Método:', req.method);
  console.log('� [my-reservations-legacy] URL:', req.url);
  console.log('�🔑 [my-reservations-legacy] Headers de autorización:', req.headers.authorization ? 'Presente' : 'Ausente');
  
  // Manejar preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('✅ [my-reservations-legacy] Respondiendo a preflight OPTIONS');
    return res.status(200).end();
  }
  
  // Solo permitir GET para este endpoint
  if (req.method !== 'GET') {
    console.log('❌ [my-reservations-legacy] Método no permitido:', req.method);
    return res.status(405).json({ 
      success: false,
      error: 'Método no permitido',
      message: `Método ${req.method} no permitido. Use GET.` 
    });
  }

  try {
    // Verificar token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('❌ [my-reservations-legacy] Token no proporcionado');
      return res.status(401).json({ 
        success: false,
        error: 'No autorizado',
        message: 'Token de autorización requerido' 
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    console.log('🔐 [my-reservations-legacy] Verificando token...');
    
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      console.log('❌ [my-reservations-legacy] Token inválido');
      return res.status(401).json({ 
        success: false,
        error: 'Token inválido',
        message: 'Token de autorización inválido' 
      });
    }
    
    const userId = decoded.id;
    console.log('👤 [my-reservations-legacy] Usuario autenticado:', userId);
    
    // Conectar a base de datos
    console.log('🔌 [my-reservations-legacy] Conectando a base de datos...');
    const db = await connectToDatabase();
    
    if (!db) {
      console.error('❌ [my-reservations-legacy] No se pudo conectar a la base de datos');
      return res.status(500).json({ 
        success: false,
        error: 'Error de conexión',
        message: 'No se pudo conectar a la base de datos' 
      });
    }
    
    console.log('✅ [my-reservations-legacy] Conexión a base de datos establecida');
    
    // Obtener reservas del usuario
    console.log('📊 [my-reservations-legacy] Ejecutando consulta de reservas para usuario:', userId);
    
    const query = `
      SELECT 
        r.id,
        r.client_name,
        r.client_phone,
        r.reservation_date,
        r.reservation_time,
        r.status,
        r.notes,
        r.created_at,
        r.updated_at,
        b.name as barber_name,
        s.name as service_name,
        s.duration_minutes,
        s.price
      FROM reservations r
      LEFT JOIN barbers b ON r.barber_id = b.id
      LEFT JOIN services s ON r.service_id = s.id
      WHERE r.user_id = $1
      ORDER BY r.reservation_date DESC, r.reservation_time DESC
    `;
    
    console.log('📝 [my-reservations-legacy] Query SQL:', query);
    console.log('📋 [my-reservations-legacy] Parámetros:', [userId]);
    
    const result = await db.query(query, [userId]);
    
    console.log('📊 [my-reservations-legacy] Resultado de la consulta:');
    console.log('- Filas encontradas:', result.rows?.length || 0);
    console.log('- RowCount:', result.rowCount);
    
    const reservations = result.rows || [];
    
    // Formatear las reservas
    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id,
      client_name: reservation.client_name,
      client_phone: reservation.client_phone,
      reservation_date: reservation.reservation_date,
      reservation_time: reservation.reservation_time,
      status: reservation.status,
      notes: reservation.notes,
      created_at: reservation.created_at,
      updated_at: reservation.updated_at,
      barber: {
        name: reservation.barber_name
      },
      service: {
        name: reservation.service_name,
        duration_minutes: reservation.duration_minutes,
        price: reservation.price
      }
    }));
    
    console.log('✅ [my-reservations-legacy] Reservas obtenidas exitosamente');
    console.log('📋 [my-reservations-legacy] Datos formateados:', formattedReservations.length, 'reservas');
    
    // Mantener la estructura de respuesta que espera el frontend
    return res.status(200).json({
      success: true,
      message: 'Reservas obtenidas exitosamente',
      reservations: formattedReservations,
      count: formattedReservations.length
    });
    
  } catch (error) {
    console.error('❌ [my-reservations-legacy] Error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'Error al obtener las reservas del usuario',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};
