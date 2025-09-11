const { connectToDatabase } = require('./_utils/database');

module.exports = async (req, res) => {
    try {
        console.log('🧪 [test-connection] === PROBANDO CONEXIÓN ===');
        
        // Configuración CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Content-Type', 'application/json');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        
        console.log('🔌 [test-connection] Conectando a base de datos...');
        const db = await connectToDatabase();
        
        console.log('📊 [test-connection] Probando consulta simple...');
        const result = await db.query('SELECT COUNT(*) as total_users FROM users');
        
        console.log('✅ [test-connection] Consulta exitosa');
        
        return res.status(200).json({
            success: true,
            message: 'Conexión a base de datos exitosa',
            totalUsers: result.rows[0].total_users,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ [test-connection] Error:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Error de conexión',
            message: error.message,
            details: error.stack
        });
    }
};
