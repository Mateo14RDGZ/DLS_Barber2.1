const { connectToDatabase } = require('./_utils/database');
const { verifyToken } = require('./_utils/auth');

module.exports = async (req, res) => {
  // Configuración CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  
  console.log('🔍 [my-reservations] === INICIANDO ENDPOINT ===');
  console.log('📋 [my-reservations] Método:', req.method);
  console.log('📦 [my-reservations] URL:', req.url);
  console.log('🔑 [my-reservations] Authorization header:', req.headers.authorization ? 'PRESENTE' : 'AUSENTE');
  
  // Manejar preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('✅ [my-reservations] Respondiendo a preflight OPTIONS');
    return res.status(200).end();
  }
  
  // Solo permitir GET para este endpoint
  if (req.method !== 'GET') {
    console.log('❌ [my-reservations] Método no permitido:', req.method);
    return res.status(405).json({ 
      success: false,
      error: 'Método no permitido',
      message: `Método ${req.method} no permitido. Use GET.` 
    });
  }

  try {
    // Verificar token
    console.log('🔐 [my-reservations] === VERIFICANDO AUTENTICACIÓN ===');
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('❌ [my-reservations] No hay header de autorización');
      return res.status(401).json({ 
        success: false,
        error: 'No autorizado',
        message: 'Token de autorización requerido' 
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    console.log('🔐 [my-reservations] Token extraído, longitud:', token.length);
    
    const decoded = verifyToken(token);
    console.log('🔓 [my-reservations] Token decodificado:', decoded ? 'VÁLIDO' : 'INVÁLIDO');
    
    if (!decoded) {
      console.log('❌ [my-reservations] Token inválido (verifyToken retornó null)');
      return res.status(401).json({ 
        success: false,
        error: 'Token inválido',
        message: 'Token de autorización inválido' 
      });
    }
    
    console.log('📋 [my-reservations] Propiedades del token decodificado:', Object.keys(decoded));
    console.log('👤 [my-reservations] UserId del token:', decoded.userId);
    
    if (!decoded.userId) {
      console.log('❌ [my-reservations] Token no contiene userId');
      return res.status(401).json({ 
        success: false,
        error: 'Token inválido',
        message: 'Token de autorización no contiene información de usuario' 
      });
    }
    
    const userId = decoded.userId;
    console.log('✅ [my-reservations] Usuario autenticado:', userId);
    
    // Conectar a base de datos
    console.log('🔌 [my-reservations] === CONECTANDO A BASE DE DATOS ===');
    const db = await connectToDatabase();
    
    if (!db) {
      console.error('❌ [my-reservations] Error: connectToDatabase retornó null/undefined');
      return res.status(500).json({ 
        success: false,
        error: 'Error de conexión',
        message: 'No se pudo conectar a la base de datos' 
      });
    }
    
    console.log('✅ [my-reservations] Conexión a base de datos establecida');
    
    // Obtener reservas del usuario
    console.log('📊 [my-reservations] === EJECUTANDO CONSULTA ===');
    console.log('📊 [my-reservations] Usuario ID para consulta:', userId);
    
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
        r.user_id,
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
    
    console.log('📝 [my-reservations] Ejecutando consulta SQL...');
    const result = await db.query(query, [userId]);
    
    console.log('📊 [my-reservations] === RESULTADO DE CONSULTA ===');
    console.log('📊 [my-reservations] Filas encontradas:', result.rows?.length || 0);
    console.log('📊 [my-reservations] RowCount:', result.rowCount);
    
    if (result.rows && result.rows.length > 0) {
      console.log('📋 [my-reservations] Primera reserva como ejemplo:', {
        id: result.rows[0].id,
        user_id: result.rows[0].user_id,
        client_name: result.rows[0].client_name,
        reservation_date: result.rows[0].reservation_date
      });
    }
    
    const reservations = result.rows || [];
    
    // Formatear las reservas
    console.log('🔄 [my-reservations] === FORMATEANDO DATOS ===');
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
    
    console.log('✅ [my-reservations] === RESPUESTA EXITOSA ===');
    console.log('📋 [my-reservations] Reservas formateadas:', formattedReservations.length);
    
    // Cambiar la estructura de respuesta para coincidir con lo que espera el frontend
    return res.status(200).json({
      success: true,
      message: 'Reservas obtenidas exitosamente',
      reservations: formattedReservations,
      count: formattedReservations.length
    });
    
  } catch (error) {
    console.error('❌ [my-reservations] === ERROR CRÍTICO ===');
    console.error('❌ [my-reservations] Error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      name: error.name
    });
    
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'Error al obtener las reservas del usuario',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};
