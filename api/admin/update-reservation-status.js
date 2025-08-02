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
    const { status } = req.body;
    
    console.log(`🔍 Solicitud de actualización recibida: ID=${id}, Estado=${status}`);
    
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
    const db = await connectToDatabase();
    
    // Actualizar estado de la reserva
    try {
      const updateResult = await db.query(
        'UPDATE reservations SET status = $1 WHERE id = $2 RETURNING id, status',
        [status, id]
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
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};
