// Script simple para verificar usuarios y crear uno de prueba
const { connectToDatabase } = require('./_utils/database');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
    try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Content-Type', 'application/json');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        console.log('🔍 [setup-user] === VERIFICANDO USUARIOS ===');
        
        const db = await connectToDatabase();
        
        if (!db) {
            return res.status(500).json({
                success: false,
                error: 'No se pudo conectar a la base de datos'
            });
        }

        // Verificar si existen usuarios
        const usersQuery = await db.query('SELECT id, email, username FROM users LIMIT 5');
        console.log('👥 [setup-user] Usuarios existentes:', usersQuery.rows.length);

        let result = {
            success: true,
            existing_users: usersQuery.rows,
            message: 'Verificación completa'
        };

        // Si no hay usuarios, crear uno de prueba
        if (usersQuery.rows.length === 0) {
            console.log('👤 [setup-user] Creando usuario de prueba...');
            
            const testEmail = 'admin@dlsbarber.com';
            const testPassword = '123456';
            const hashedPassword = await bcrypt.hash(testPassword, 10);
            
            const newUser = await db.query(
                `INSERT INTO users (username, email, password_hash, full_name, phone, role, created_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
                 RETURNING id, username, email, full_name, phone, role`,
                ['admin', testEmail, hashedPassword, 'Administrador DLS', '098863041', 'admin']
            );

            result.test_user_created = newUser.rows[0];
            result.test_credentials = {
                email: testEmail,
                password: testPassword
            };
            
            console.log('✅ [setup-user] Usuario de prueba creado:', newUser.rows[0].id);
        }

        return res.status(200).json(result);

    } catch (error) {
        console.error('❌ [setup-user] Error:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Error en setup de usuarios',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
