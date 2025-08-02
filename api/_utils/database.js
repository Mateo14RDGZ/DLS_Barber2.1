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
  // En producción (Vercel) usaremos PostgreSQL
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    return 'postgres';
  }
  // En desarrollo, usaremos SQLite
  return 'sqlite';
};

// Conectar a PostgreSQL
const connectToPostgres = async () => {
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Necesario para Heroku/Vercel
      }
    });
  }
  
  // Probar la conexión
  try {
    const client = await pgPool.connect();
    client.release();
    console.log('✅ Conexión a PostgreSQL exitosa');
    return {
      query: (text, params) => pgPool.query(text, params),
      close: () => pgPool.end()
    };
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error);
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
      console.log(`🔍 Usando ${dbType === 'postgres' ? 'PostgreSQL' : 'SQLite'} para la conexión`);
      console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);
      
      if (dbType === 'postgres') {
        console.log(`🔌 Verificando URL de conexión: ${process.env.DATABASE_URL ? 'Configurada' : 'No configurada'}`);
      }
    }
    
    // Conectar a la base de datos apropiada
    if (dbType === 'postgres') {
      return connectToPostgres();
    } else {
      return connectToSqlite();
    }
  } catch (error) {
    console.error('❌ Error crítico al conectar a la base de datos:', error);
    // Retornar un objeto que no fallará pero registrará el error
    return {
      query: async () => {
        console.error('❌ Intento de consulta a base de datos fallida - conexión no establecida');
        throw new Error('No se pudo establecer conexión con la base de datos');
      },
      close: () => {}
    };
  }
};

module.exports = {
  connectToDatabase,
  determineDbType
};
