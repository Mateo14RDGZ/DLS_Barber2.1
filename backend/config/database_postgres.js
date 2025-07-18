const { Pool } = require('pg');

// Configuración de PostgreSQL para producción
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Función para ejecutar queries en PostgreSQL
const executeQuery = async (query, params = []) => {
  const client = await pool.connect();
  try {
    // Convertir query de SQLite a PostgreSQL si es necesario
    const pgQuery = convertSQLiteToPostgreSQL(query);
    const result = await client.query(pgQuery, params);
    
    // Si es un INSERT, devolver formato compatible con SQLite
    if (pgQuery.trim().toUpperCase().startsWith('INSERT')) {
      return {
        insertId: result.rows[0]?.id || null,
        changes: result.rowCount
      };
    }
    
    return result.rows;
  } catch (error) {
    console.error('Error ejecutando query PostgreSQL:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Función para convertir queries de SQLite a PostgreSQL
const convertSQLiteToPostgreSQL = (query) => {
  let pgQuery = query;
  
  // Convertir AUTOINCREMENT a SERIAL
  pgQuery = pgQuery.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
  
  // Convertir DATETIME DEFAULT CURRENT_TIMESTAMP a TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  pgQuery = pgQuery.replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  
  // Convertir BOOLEAN DEFAULT 1/0 a BOOLEAN DEFAULT true/false
  pgQuery = pgQuery.replace(/BOOLEAN DEFAULT 1/gi, 'BOOLEAN DEFAULT true');
  pgQuery = pgQuery.replace(/BOOLEAN DEFAULT 0/gi, 'BOOLEAN DEFAULT false');
  
  // Cambiar password_hash a password para compatibilidad
  pgQuery = pgQuery.replace(/password_hash/gi, 'password');
  
  // Para INSERT RETURNING id (necesario para obtener insertId)
  if (pgQuery.trim().toUpperCase().startsWith('INSERT') && !pgQuery.toUpperCase().includes('RETURNING')) {
    pgQuery = pgQuery.replace(/;?\s*$/, ' RETURNING id;');
  }
  
  return pgQuery;
};

// Función para inicializar la base de datos PostgreSQL
const initDatabase = async () => {
  try {
    // Crear tabla de usuarios
    await executeQuery(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      role VARCHAR(10) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Crear tabla de barberos
    await executeQuery(`CREATE TABLE IF NOT EXISTS barbers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(20),
      specialty VARCHAR(200),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Crear tabla de servicios
    await executeQuery(`CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      duration_minutes INTEGER NOT NULL,
      price DECIMAL(10,2),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Crear tabla de horarios disponibles
    await executeQuery(`CREATE TABLE IF NOT EXISTS available_hours (
      id SERIAL PRIMARY KEY,
      barber_id INTEGER REFERENCES barbers(id),
      day_of_week INTEGER NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      is_available BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Crear tabla de reservas
    await executeQuery(`CREATE TABLE IF NOT EXISTS reservations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      barber_id INTEGER REFERENCES barbers(id),
      service_id INTEGER REFERENCES services(id),
      reservation_date DATE NOT NULL,
      reservation_time TIME NOT NULL,
      client_name VARCHAR(100) NOT NULL,
      client_phone VARCHAR(20) NOT NULL,
      client_email VARCHAR(100),
      status VARCHAR(20) DEFAULT 'pendiente',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('✅ Base de datos PostgreSQL inicializada correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error inicializando PostgreSQL:', error);
    throw error;
  }
};

// Función para probar la conexión
const testConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Conexión exitosa a PostgreSQL');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    return false;
  }
};

module.exports = {
  executeQuery,
  initDatabase,
  testConnection,
  pool
};
