const { connectToDatabase } = require('../_utils/database');
const { verifyToken } = require('../_utils/auth');

module.exports = async (req, res) => {
  // Configuración CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Manejar preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Redirigir a la función correcta según el endpoint
  const { endpoint } = req.query;
  
  switch(endpoint) {
    case 'update-reservation-status':
      return await updateReservationStatus(req, res);
    default:
      return res.status(404).json({ error: 'Endpoint no encontrado' });
  }
};

// Función para actualizar el estado de una reserva
async function updateReservationStatus(req, res) {
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
    
    const { id } = req.query;
    const { status } = req.body;
    
    // Validar estado
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!id || !status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Datos inválidos', 
        details: 'Se requiere un ID de reserva válido y un estado válido (pending, confirmed, completed, cancelled)'
      });
    }
    
    // Conectar a base de datos
    const db = await connectToDatabase();
    
    // Actualizar estado de la reserva
    const updateResult = await db.query(
      'UPDATE reservations SET status = $1 WHERE id = $2 RETURNING id, status',
      [status, id]
    );
    
    if (!updateResult.rowCount) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    
    return res.status(200).json({ 
      message: 'Estado de reserva actualizado exitosamente',
      reservation: updateResult.rows[0]
    });
    
  } catch (error) {
    console.error('Error actualizando estado de reserva:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
