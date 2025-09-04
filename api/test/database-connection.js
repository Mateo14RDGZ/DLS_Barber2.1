const { connectToDatabase } = require('../_utils/database');

module.exports = async (req, res) => {
  // Configuración CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  console.log('🧪 [test-database] Iniciando test de conexión a base de datos');
  
  // Manejar preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    console.log('🔌 [test-database] Intentando conectar a la base de datos...');
    
    // Verificar variables de entorno
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV || 'development',
      VERCEL: !!process.env.VERCEL,
      DATABASE_URL_CONFIGURED: !!process.env.DATABASE_URL,
      DATABASE_URL_LENGTH: process.env.DATABASE_URL?.length || 0
    };
    
    console.log('🌐 [test-database] Información del entorno:', envInfo);
    
    // Conectar a base de datos
    const db = await connectToDatabase();
    
    if (!db) {
      throw new Error('No se pudo obtener conexión a la base de datos');
    }
    
    console.log('✅ [test-database] Conexión establecida, probando consulta...');
    
    // Probar una consulta simple
    const testQuery = 'SELECT NOW() as current_time, version() as db_version';
    const result = await db.query(testQuery);
    
    console.log('✅ [test-database] Query de prueba exitosa');
    
    // Probar consulta a tabla de reservas
    let reservationsTest = null;
    try {
      const reservationsQuery = 'SELECT COUNT(*) as total_reservations FROM reservations';
      const reservationsResult = await db.query(reservationsQuery);
      reservationsTest = reservationsResult.rows[0];
      console.log('✅ [test-database] Acceso a tabla reservations exitoso');
    } catch (tableError) {
      console.log('⚠️ [test-database] Error accediendo tabla reservations:', tableError.message);
      reservationsTest = { error: tableError.message };
    }
    
    // Respuesta exitosa
    return res.status(200).json({
      success: true,
      message: 'Conexión a base de datos exitosa',
      environment: envInfo,
      database: {
        connected: true,
        serverTime: result.rows[0]?.current_time,
        version: result.rows[0]?.db_version,
        reservationsTable: reservationsTest
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [test-database] Error en test de conexión:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    return res.status(500).json({
      success: false,
      error: 'Error de conexión a base de datos',
      details: {
        message: error.message,
        code: error.code,
        environment: {
          NODE_ENV: process.env.NODE_ENV || 'development',
          VERCEL: !!process.env.VERCEL,
          DATABASE_URL_CONFIGURED: !!process.env.DATABASE_URL
        }
      },
      timestamp: new Date().toISOString()
    });
  }
};
