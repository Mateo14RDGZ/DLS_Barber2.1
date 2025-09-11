const { connectToDatabase } = require('./_utils/database');

module.exports = async (req, res) => {
    try {
        console.log('🧪 [test-login] === PROBANDO LOGIN COMPLETO ===');
        
        // Configuración CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Content-Type', 'application/json');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        
        console.log('🔌 [test-login] Conectando a base de datos...');
        const db = await connectToDatabase();
        
        console.log('📊 [test-login] Listando usuarios disponibles...');
        const usersResult = await db.query('SELECT id, email, username, role FROM users LIMIT 5');
        
        console.log('🔍 [test-login] Verificando estructura de tabla...');
        const schemaResult = await db.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        return res.status(200).json({
            success: true,
            message: 'Test de login completado',
            users: usersResult.rows,
            schema: schemaResult.rows,
            totalUsers: usersResult.rowCount,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ [test-login] Error:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Error en test de login',
            message: error.message,
            details: error.stack
        });
    }
};
