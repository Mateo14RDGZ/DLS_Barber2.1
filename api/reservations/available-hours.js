const { connectToDatabase } = require('../_utils/database');

module.exports = async (req, res) => {
  // Configuración CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  
  console.log('🔍 [available-hours] Iniciando función para obtener horas disponibles');
  console.log('📋 [available-hours] Método:', req.method);
  console.log('📦 [available-hours] Query params:', req.query);
  
  // Manejar preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('✅ [available-hours] Respondiendo a preflight OPTIONS');
    return res.status(200).end();
  }
  
  // Solo permitir GET
  if (req.method !== 'GET') {
    console.log('❌ [available-hours] Método no permitido:', req.method);
    return res.status(405).json({ 
      success: false,
      error: 'Método no permitido',
      message: `Método ${req.method} no permitido. Use GET.` 
    });
  }

  try {
    const { date, barber_id } = req.query;
    
    // Validaciones
    if (!date) {
      console.log('❌ [available-hours] Fecha no proporcionada');
      return res.status(400).json({
        success: false,
        error: 'Parámetros faltantes',
        message: 'La fecha es requerida'
      });
    }
    
    console.log('📅 [available-hours] Parámetros recibidos:', { date, barber_id });
    
    // Conectar a base de datos
    console.log('🔌 [available-hours] Conectando a base de datos...');
    const db = await connectToDatabase();
    
    if (!db) {
      console.error('❌ [available-hours] No se pudo conectar a la base de datos');
      return res.status(500).json({ 
        success: false,
        error: 'Error de conexión',
        message: 'No se pudo conectar a la base de datos' 
      });
    }
    
    console.log('✅ [available-hours] Conexión a base de datos establecida');
    
    // Obtener horarios ocupados para la fecha
    let query;
    let params;
    
    if (barber_id) {
      query = `
        SELECT reservation_time 
        FROM reservations 
        WHERE reservation_date = $1 
        AND barber_id = $2 
        AND status IN ('pending', 'confirmed')
      `;
      params = [date, barber_id];
    } else {
      query = `
        SELECT reservation_time 
        FROM reservations 
        WHERE reservation_date = $1 
        AND status IN ('pending', 'confirmed')
      `;
      params = [date];
    }
    
    console.log('📝 [available-hours] Query SQL:', query);
    console.log('📋 [available-hours] Parámetros:', params);
    
    const result = await db.query(query, params);
    
    const occupiedHours = result.rows.map(row => row.reservation_time);
    console.log('⏰ [available-hours] Horas ocupadas:', occupiedHours);
    
    // Horarios de trabajo (9:00 AM a 6:00 PM)
    const workingHours = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
    ];
    
    // Filtrar horas disponibles
    const availableHours = workingHours.filter(hour => 
      !occupiedHours.includes(hour)
    );
    
    console.log('✅ [available-hours] Horas disponibles:', availableHours);
    
    return res.status(200).json({
      success: true,
      message: 'Horas disponibles obtenidas exitosamente',
      data: {
        date: date,
        barber_id: barber_id || null,
        available_hours: availableHours,
        occupied_hours: occupiedHours,
        total_available: availableHours.length
      }
    });
    
  } catch (error) {
    console.error('❌ [available-hours] Error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'Error al obtener las horas disponibles',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};
