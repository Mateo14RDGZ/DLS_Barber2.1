const { connectToDatabase } = require('./_utils/database');

module.exports = async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');
    
    console.log('🔍 [general] Iniciando endpoint general');
    console.log('📋 [general] Método:', req.method);
    console.log('📦 [general] URL:', req.url);
    
    if (req.method === 'OPTIONS') {
        console.log('✅ [general] Respondiendo a preflight OPTIONS');
        return res.status(200).end();
    }

    const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const action = searchParams.get('action');
    
    console.log('🔍 [general] pathname:', pathname, 'action:', action);
    
    // Determinar la acción basada en la URL
    if (action === 'barbers' || pathname.includes('/barbers')) {
        return await handleBarbers(req, res);
    } else if (action === 'services' || pathname.includes('/services')) {
        return await handleServices(req, res);
    } else {
        // Acción por defecto - devolver barberos y servicios
        return await handleDefault(req, res);
    }
};

async function handleBarbers(req, res) {
    if (req.method !== 'GET') {
        console.log('❌ [general/barbers] Método no permitido:', req.method);
        return res.status(405).json({ 
            success: false,
            error: 'Método no permitido' 
        });
    }

    try {
        console.log('🔌 [general/barbers] Conectando a base de datos...');
        const db = await connectToDatabase();
        
        if (!db) {
            console.error('❌ [general/barbers] No se pudo conectar a la base de datos');
            return res.status(500).json({ 
                success: false,
                error: 'Error de conexión a base de datos' 
            });
        }
        
        console.log('📊 [general/barbers] Obteniendo barberos...');
        
        // Obtener todos los barberos
        const result = await db.query(`
            SELECT 
                b.id,
                b.name,
                b.email,
                b.phone,
                b.specialty,
                COUNT(r.id) as total_reservations
            FROM barbers b
            LEFT JOIN reservations r ON b.id = r.barber_id
            GROUP BY b.id, b.name, b.email, b.phone, b.specialty
            ORDER BY b.name
        `);
        
        console.log('✅ [general/barbers] Barberos obtenidos:', result.rows?.length || 0);
        
        return res.status(200).json({ 
            success: true,
            barbers: result.rows || [] 
        });
        
    } catch (error) {
        console.error('❌ [general/barbers] Error:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        
        return res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
}

async function handleServices(req, res) {
    if (req.method !== 'GET') {
        console.log('❌ [general/services] Método no permitido:', req.method);
        return res.status(405).json({ 
            success: false,
            error: 'Método no permitido' 
        });
    }

    try {
        console.log('🔌 [general/services] Conectando a base de datos...');
        const db = await connectToDatabase();
        
        if (!db) {
            console.error('❌ [general/services] No se pudo conectar a la base de datos');
            return res.status(500).json({ 
                success: false,
                error: 'Error de conexión a base de datos' 
            });
        }
        
        console.log('📊 [general/services] Obteniendo servicios...');
        
        // Obtener todos los servicios
        const result = await db.query(`
            SELECT 
                s.id,
                s.name,
                s.description,
                s.duration_minutes,
                s.price,
                COUNT(r.id) as total_reservations
            FROM services s
            LEFT JOIN reservations r ON s.id = r.service_id
            GROUP BY s.id, s.name, s.description, s.duration_minutes, s.price
            ORDER BY s.name
        `);
        
        console.log('✅ [general/services] Servicios obtenidos:', result.rows?.length || 0);
        
        return res.status(200).json({ 
            success: true,
            services: result.rows || [] 
        });
        
    } catch (error) {
        console.error('❌ [general/services] Error:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        
        return res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
}

async function handleDefault(req, res) {
    if (req.method !== 'GET') {
        console.log('❌ [general/default] Método no permitido:', req.method);
        return res.status(405).json({ 
            success: false,
            error: 'Método no permitido' 
        });
    }

    try {
        console.log('🔌 [general/default] Conectando a base de datos...');
        const db = await connectToDatabase();
        
        if (!db) {
            console.error('❌ [general/default] No se pudo conectar a la base de datos');
            return res.status(500).json({ 
                success: false,
                error: 'Error de conexión a base de datos' 
            });
        }
        
        console.log('📊 [general/default] Obteniendo barberos y servicios...');
        
        // Obtener barberos
        const barbersResult = await db.query(`
            SELECT 
                id,
                name,
                email,
                phone,
                specialty
            FROM barbers 
            ORDER BY name
        `);
        
        // Obtener servicios
        const servicesResult = await db.query(`
            SELECT 
                id,
                name,
                description,
                duration_minutes,
                price
            FROM services 
            ORDER BY name
        `);
        
        console.log('✅ [general/default] Datos obtenidos:', {
            barberos: barbersResult.rows?.length || 0,
            servicios: servicesResult.rows?.length || 0
        });
        
        return res.status(200).json({ 
            success: true,
            barbers: barbersResult.rows || [],
            services: servicesResult.rows || []
        });
        
    } catch (error) {
        console.error('❌ [general/default] Error:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        
        return res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
}
