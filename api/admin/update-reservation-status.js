const { connectToDatabase } = require('../_utils/database');
const { verifyToken } = require('../_utils/auth');

module.exports = async (req, res) => {
  // Configuración CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  console.log(`🔍 [update-reservation-status] Recibida solicitud: ${req.method}`);
  console.log(`📝 [update-reservation-status] Query params:`, req.query);
  console.log(`📦 [update-reservation-status] Ruta completa:`, req.url);
  
  // Manejar preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Solo permitir métodos PUT
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  
  try {
    // Verificar token y rol de administrador
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado - Token no proporcionado' });
    }
    
    const token = authHeader.split(' ')[1];
    const decodedToken = verifyToken(token);
    
    if (!decodedToken || decodedToken.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado - Se requiere rol de administrador' });
    }
    
    // Obtener el ID de la reserva y el nuevo estado
    const { id } = req.query;
    
    // Asegurarse de que el cuerpo de la solicitud se analice correctamente
    let status;
    try {
      // Comprobar si el cuerpo ya está analizado
      if (typeof req.body === 'object' && req.body !== null) {
        status = req.body.status;
      } else if (typeof req.body === 'string') {
        // Intentar analizar el cuerpo como JSON
        const parsedBody = JSON.parse(req.body);
        status = parsedBody.status;
      }
      
      console.log(`🔍 Datos analizados: ID=${id}, Estado=${status}, Tipo de body:`, typeof req.body);
    } catch (parseError) {
      console.error('❌ Error al analizar el cuerpo de la solicitud:', parseError, 'Body recibido:', req.body);
      return res.status(400).json({ 
        error: 'Error al procesar la solicitud',
        details: 'No se pudo analizar el cuerpo de la solicitud como JSON válido'
      });
    }
    
    // Validar estado
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    
    if (!id) {
      console.error('❌ Error: ID de reserva no proporcionado');
      return res.status(400).json({ 
        error: 'ID de reserva no proporcionado', 
        details: 'Se requiere el parámetro id en la URL'
      });
    }
    
    if (!status || !validStatuses.includes(status)) {
      console.error(`❌ Error: Estado inválido: ${status}`);
      return res.status(400).json({ 
        error: 'Estado inválido', 
        details: `El estado debe ser uno de: ${validStatuses.join(', ')}`
      });
    }
    
    // Conectar a base de datos
    console.log('🔌 Intentando conectar a la base de datos...');
    const db = await connectToDatabase();
    
    // Verificar conexión
    if (!db) {
      console.error('❌ Error: No se pudo obtener conexión a la base de datos');
      return res.status(500).json({ 
        error: 'Error al conectar con la base de datos',
        details: 'No se pudo establecer una conexión válida'
      });
    }
    
    // Imprimir los parámetros para depuración
    console.log('🔄 Parámetros para la consulta SQL:', {
      status: status,
      id: id,
      queryType: typeof id
    });
    // Actualizar estado de la reserva
    try {
      // Asegurarse de que el ID sea un número
      const reservationId = parseInt(id, 10);
      
      if (isNaN(reservationId)) {
        console.error(`❌ Error: ID inválido: ${id} no es un número`);
        return res.status(400).json({ 
          error: 'ID de reserva inválido',
          details: 'El ID debe ser un número válido'
        });
      }
      
      console.log(`🔄 Ejecutando actualización: UPDATE reservations SET status = '${status}' WHERE id = ${reservationId}`);
      
      // Ejecutar la consulta
      const updateResult = await db.query(
        'UPDATE reservations SET status = $1 WHERE id = $2 RETURNING id, status',
        [status, reservationId]
      );
      
      console.log(`📊 Resultado de actualización:`, updateResult);
      
      if (!updateResult.rowCount) {
        console.error(`❌ Error: Reserva con ID ${id} no encontrada`);
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }
      
      console.log(`✅ Reserva actualizada exitosamente: ID=${id}, Nuevo estado=${status}`);
      return res.status(200).json({ 
        message: 'Estado de reserva actualizado exitosamente',
        reservation: updateResult.rows[0]
      });
    } catch (dbError) {
      console.error('❌ Error en la consulta a la base de datos:', dbError);
      return res.status(500).json({ 
        error: 'Error en la base de datos',
        details: dbError.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error general actualizando estado de reserva:', error);
    console.error('Detalles adicionales:', {
      url: req.url,
      method: req.method,
      query: req.query,
      bodyPresent: !!req.body,
      bodyType: typeof req.body,
      errorName: error.name,
      errorMessage: error.message
    });
    
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message,
      details: 'Se produjo un error al procesar la solicitud. Ver logs para más información.',
      errorType: error.name
    });
  }
};
