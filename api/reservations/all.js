const { connectToDatabase } = require('../_utils/database');
const { verifyToken, isAdmin } = require('../_utils/auth');

module.exports = async (req, res) => {
  // Configuración CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  
  console.log('🔍 [all-reservations] Iniciando función para obtener todas las reservas');
  console.log('📋 [all-reservations] Método:', req.method);
  console.log('🔑 [all-reservations] Headers de autorización:', req.headers.authorization ? 'Presente' : 'Ausente');
  
  // Manejar preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('✅ [all-reservations] Respondiendo a preflight OPTIONS');
    return res.status(200).end();
  }
  
  // Solo permitir GET
  if (req.method !== 'GET') {
    console.log('❌ [all-reservations] Método no permitido:', req.method);
    return res.status(405).json({ 
      success: false,
      error: 'Método no permitido',
      message: `Método ${req.method} no permitido. Use GET.` 
    });
  }

  try {
    // Verificar token de administrador
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('❌ [all-reservations] Token no proporcionado');
      return res.status(401).json({ 
        success: false,
        error: 'No autorizado',
        message: 'Token de autorización requerido' 
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    console.log('🔐 [all-reservations] Verificando token de administrador...');
    
    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('❌ [all-reservations] Token inválido');
      return res.status(401).json({ 
        success: false,
        error: 'Token inválido',
        message: 'Token de autorización inválido' 
      });
    }
    
    if (!isAdmin(decoded)) {
      console.log('❌ [all-reservations] Usuario no es administrador:', decoded.role);
      return res.status(403).json({ 
        success: false,
        error: 'Acceso denegado',
        message: 'Se requieren permisos de administrador' 
      });
    }
    
    console.log('👤 [all-reservations] Administrador autenticado:', decoded.email);
    
    // Conectar a base de datos
    console.log('🔌 [all-reservations] Conectando a base de datos...');
    const db = await connectToDatabase();
    
    if (!db) {
      console.error('❌ [all-reservations] No se pudo conectar a la base de datos');
      return res.status(500).json({ 
        success: false,
        error: 'Error de conexión',
        message: 'No se pudo conectar a la base de datos' 
      });
    }
    
    console.log('✅ [all-reservations] Conexión a base de datos establecida');
    
    // Obtener todas las reservas
    console.log('📊 [all-reservations] Ejecutando consulta para obtener todas las reservas');
    
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
        u.email as user_email,
        u.username as user_name,
        b.name as barber_name,
        s.name as service_name,
        s.duration_minutes,
        s.price
      FROM reservations r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN barbers b ON r.barber_id = b.id
      LEFT JOIN services s ON r.service_id = s.id
      ORDER BY r.reservation_date DESC, r.reservation_time DESC
    `;
    
    console.log('📝 [all-reservations] Query SQL:', query);
    
    const result = await db.query(query);
    
    console.log('📊 [all-reservations] Resultado de la consulta:');
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
      user: {
        email: reservation.user_email,
        name: reservation.user_name
      },
      barber: {
        name: reservation.barber_name
      },
      service: {
        name: reservation.service_name,
        duration_minutes: reservation.duration_minutes,
        price: reservation.price
      }
    }));
    
    console.log('✅ [all-reservations] Reservas obtenidas exitosamente');
    console.log('📋 [all-reservations] Total de reservas:', formattedReservations.length);
    
    return res.status(200).json({
      success: true,
      message: 'Todas las reservas obtenidas exitosamente',
      data: formattedReservations,
      count: formattedReservations.length
    });
    
  } catch (error) {
    console.error('❌ [all-reservations] Error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'Error al obtener todas las reservas',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};
