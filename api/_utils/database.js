const { Pool } = require('pg');

// Pool de conexiones global para Neon PostgreSQL
let pgPool;

// Conectar a Neon PostgreSQL - ÚNICA OPCIÓN DE BASE DE DATOS
const connectToPostgres = async () => {
  if (!pgPool) {
    console.log('🔌 [Neon] Inicializando pool de conexiones...');
    
    // Verificar que DATABASE_URL esté configurada
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL es requerida para conectar a Neon PostgreSQL');
    }
    
    // Configuración específica para Neon PostgreSQL
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Necesario para Neon/Vercel
      },
      // Configuraciones optimizadas para Neon serverless
      max: 1, // Máximo 1 conexión para serverless
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: true
    });
    
    console.log('✅ [Neon] Pool de conexiones configurado');
  }
  
  // Probar la conexión
  try {
    const client = await pgPool.connect();
    console.log('✅ [Neon] Cliente conectado exitosamente');
    client.release();
    console.log('✅ [Neon] Conexión verificada y liberada');
    
    return {
      query: async (text, params) => {
        console.log('🔍 [Neon Query] Ejecutando:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
        console.log('📋 [Neon Query] Parámetros:', params);
        
        try {
          const result = await pgPool.query(text, params);
          console.log('✅ [Neon Query] Ejecutada exitosamente, filas:', result.rowCount);
          return result;
        } catch (queryError) {
          console.error('❌ [Neon Query] Error:', {
            message: queryError.message,
            code: queryError.code,
            detail: queryError.detail,
            query: text.substring(0, 100)
          });
          throw queryError;
        }
      },
      close: () => {
        console.log('🔌 [Neon] Cerrando pool de conexiones');
        return pgPool.end();
      }
    };
  } catch (error) {
    console.error('❌ [Neon] Error conectando:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    throw error;
  }
};

// Función principal para conectar ÚNICAMENTE a Neon PostgreSQL
const connectToDatabase = async () => {
  try {
    console.log('🔍 [Database] === INICIANDO CONEXIÓN A NEON POSTGRESQL ===');
    
    // Verificar configuración
    if (!process.env.DATABASE_URL) {
      console.error('❌ [Database] DATABASE_URL no configurada');
      throw new Error('DATABASE_URL es requerida para conectar a Neon PostgreSQL');
    }
    
    // Mostrar información de conexión (sin credenciales)
    const url = new URL(process.env.DATABASE_URL);
    console.log('🌐 [Database] Información de conexión:');
    console.log(`   📡 Host: ${url.hostname}`);
    console.log(`   🏗️ Base de datos: ${url.pathname.substring(1)}`);
    console.log(`   🔐 SSL: Habilitado`);
    console.log(`   🚀 Plataforma: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
    console.log(`   🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    
    // Conectar a PostgreSQL (Neon) - ÚNICO MÉTODO SOPORTADO
    const db = await connectToPostgres();
    console.log('✅ [Database] === CONEXIÓN A NEON POSTGRESQL EXITOSA ===');
    
    return db;
    
  } catch (error) {
    console.error('❌ [Database] === ERROR CRÍTICO DE CONEXIÓN ===');
    console.error('❌ [Database] Error:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    
    // NO devolver un mock - fallar explícitamente para que se note el problema
    throw new Error(`Falla crítica de conexión a Neon PostgreSQL: ${error.message}`);
  }
};

module.exports = {
  connectToDatabase
};


