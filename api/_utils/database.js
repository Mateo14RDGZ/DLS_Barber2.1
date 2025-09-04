const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

// Variables para mantener las conexiones
let pgPool;
let sqliteDb;
let dbType;

// Función para determinar qué base de datos usar
const determineDbType = () => {
  // En Vercel (producción) siempre usar PostgreSQL
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    if (!process.env.DATABASE_URL) {
      console.error('⚠️ ADVERTENCIA: DATABASE_URL no configurada en producción');
    }
    return 'postgres';
  }
  // En desarrollo, usaremos SQLite
  return 'sqlite';
};

// Conectar a PostgreSQL (optimizado para Neon)
const connectToPostgres = async () => {
  if (!pgPool) {
    // Configuración específica para Neon
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
    
    console.log('🔌 Configurando pool de conexiones para Neon PostgreSQL');
  }
  
  // Probar la conexión
  try {
    const client = await pgPool.connect();
    console.log('✅ Cliente PostgreSQL conectado exitosamente');
    client.release();
    console.log('✅ Conexión a Neon PostgreSQL establecida');
    
    return {
      query: async (text, params) => {
        console.log('🔍 Ejecutando query:', text.substring(0, 50) + '...');
        const result = await pgPool.query(text, params);
        console.log('✅ Query ejecutada, filas afectadas:', result.rowCount);
        return result;
      },
      close: () => pgPool.end()
    };
  } catch (error) {
    console.error('❌ Error conectando a Neon PostgreSQL:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    throw error;
  }
};

// Conectar a SQLite
const connectToSqlite = async () => {
  if (!sqliteDb) {
    const dbPath = path.join(process.cwd(), 'database', 'dls_barber.sqlite');
    
    try {
      sqliteDb = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
      
      console.log('✅ Conexión a SQLite exitosa');
    } catch (error) {
      console.error('❌ Error conectando a SQLite:', error);
      throw error;
    }
  }
  
  // Adaptar la interfaz para que sea similar a PostgreSQL
  return {
    query: async (text, params = []) => {
      // Convertir placeholder de PostgreSQL ($1, $2) a SQLite (?, ?)
      const sqliteQuery = text.replace(/\$(\d+)/g, '?');
      
      try {
        if (text.trim().toUpperCase().startsWith('SELECT')) {
          const rows = await sqliteDb.all(sqliteQuery, params);
          return { rows, rowCount: rows.length };
        } else {
          const result = await sqliteDb.run(sqliteQuery, params);
          return { 
            rows: result.lastID ? [{ id: result.lastID }] : [],
            rowCount: result.changes
          };
        }
      } catch (error) {
        console.error('❌ Error ejecutando query en SQLite:', error);
        throw error;
      }
    },
    close: async () => {
      if (sqliteDb) {
        await sqliteDb.close();
        sqliteDb = null;
      }
    }
  };
};

// Función principal para conectar a la base de datos
const connectToDatabase = async () => {
  try {
    // Determinar qué base de datos usar si aún no se ha decidido
    if (!dbType) {
      dbType = determineDbType();
      console.log(`🔍 Usando ${dbType === 'postgres' ? 'PostgreSQL (Neon)' : 'SQLite'} para la conexión`);
      console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🚀 Plataforma: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
      
      if (dbType === 'postgres') {
        const hasDbUrl = !!process.env.DATABASE_URL;
        console.log(`🔌 URL de conexión Neon: ${hasDbUrl ? 'Configurada ✅' : 'No configurada ❌'}`);
        
        if (hasDbUrl) {
          // Mostrar info básica de la URL sin revelar credenciales
          const url = new URL(process.env.DATABASE_URL);
          console.log(`📡 Host: ${url.hostname}`);
          console.log(`🔐 SSL: ${url.searchParams.get('sslmode') || 'habilitado'}`);
        }
      }
    }
    
    // Conectar a la base de datos apropiada
    if (dbType === 'postgres') {
      return await connectToPostgres();
    } else {
      return await connectToSqlite();
    }
  } catch (error) {
    console.error('❌ Error crítico al conectar a la base de datos:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Retornar un objeto que no fallará pero registrará el error
    return {
      query: async () => {
        console.error('❌ Intento de consulta a base de datos fallida - conexión no establecida');
        throw new Error(`No se pudo establecer conexión con la base de datos: ${error.message}`);
      },
      close: () => {}
    };
  }
};

module.exports = {
  connectToDatabase,
  determineDbType
};
