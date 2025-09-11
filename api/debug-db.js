const { connectToDatabase } = require('./_utils/database');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('🔍 [debug] Probando conexión a base de datos...');
        
        const db = await connectToDatabase();
        
        if (!db) {
            return res.status(500).json({
                success: false,
                error: 'No se pudo conectar a la base de datos',
                db: null
            });
        }

        // Probar una consulta simple
        const testQuery = await db.query('SELECT NOW() as current_time');
        
        // Verificar si existe la tabla users
        const usersTable = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `);

        return res.status(200).json({
            success: true,
            message: 'Conexión a base de datos exitosa',
            current_time: testQuery.rows[0]?.current_time,
            users_table_columns: usersTable.rows,
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                VERCEL: !!process.env.VERCEL,
                DATABASE_URL_exists: !!process.env.DATABASE_URL
            }
        });

    } catch (error) {
        console.error('❌ [debug] Error:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Error en debug',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
