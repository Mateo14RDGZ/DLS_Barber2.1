const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

// Determinar qué base de datos usar
const usePostgreSQL = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.NODE_ENV === 'production';
const useMySQL = process.env.DB_HOST && !usePostgreSQL;

// Configuración de SQLite para desarrollo local
const dbPath = path.join(__dirname, '..', 'database', 'dls_barber.db');
const sqlite = new sqlite3.Database(dbPath);

// Configuración de PostgreSQL para Vercel
const postgresPool = usePostgreSQL ? new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
}) : null;

// Configuración de MySQL para producción alternativa
const mysqlConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dls_barber',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000
};

// Determinar qué base de datos usar según el entorno
let pool = null;

if (usePostgreSQL) {
    console.log('🐘 Configurando PostgreSQL para producción');
} else if (useMySQL) {
    console.log('🐬 Configurando MySQL para producción');
    pool = mysql.createPool(mysqlConfig);
} else {
    console.log('🗃️ Usando SQLite para desarrollo local');
}

// Inicializar SQLite con las tablas necesarias
const initializeSQLite = () => {
    sqlite.serialize(() => {
        // Tabla de usuarios
        sqlite.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                phone TEXT,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de barberos
        sqlite.run(`
            CREATE TABLE IF NOT EXISTS barbers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                specialty TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de servicios
        sqlite.run(`
            CREATE TABLE IF NOT EXISTS services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                duration_minutes INTEGER NOT NULL,
                price DECIMAL(10,2),
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de reservas
        sqlite.run(`
            CREATE TABLE IF NOT EXISTS reservations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                barber_id INTEGER,
                service_id INTEGER,
                reservation_date DATE NOT NULL,
                reservation_time TIME NOT NULL,
                client_name TEXT NOT NULL,
                client_phone TEXT NOT NULL,
                client_email TEXT,
                notes TEXT,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (barber_id) REFERENCES barbers(id),
                FOREIGN KEY (service_id) REFERENCES services(id)
            )
        `);

        // Tabla de horarios disponibles
        sqlite.run(`
            CREATE TABLE IF NOT EXISTS available_hours (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                day_of_week TEXT NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                barber_id INTEGER,
                is_active BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (barber_id) REFERENCES barbers(id)
            )
        `);

        // Insertar datos iniciales
        sqlite.run(`
            INSERT OR IGNORE INTO barbers (id, name, email, phone, specialty) 
            VALUES (1, 'Samuel', 'samuel@dlsbarber.com', '092870198', 'Barbero Profesional')
        `);

        sqlite.run(`
            INSERT OR IGNORE INTO services (id, name, description, duration_minutes, price) VALUES 
            (1, 'Corte de cabello', 'Corte profesional personalizado', 30, 800.00),
            (2, 'Arreglo de barba', 'Arreglo y diseño de barba', 20, 500.00),
            (3, 'Afeitado clásico', 'Afeitado tradicional con navaja', 25, 600.00),
            (4, 'Diseños personalizados', 'Diseños creativos en cabello', 45, 1200.00),
            (5, 'Cortes ejecutivos', 'Cortes profesionales para ejecutivos', 35, 1000.00)
        `);

        // Insertar horarios disponibles
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const hours = {
            'monday': ['08:00:00', '21:30:00'],
            'tuesday': ['08:00:00', '21:30:00'],
            'wednesday': ['08:00:00', '21:30:00'],
            'thursday': ['08:00:00', '21:30:00'],
            'friday': ['08:00:00', '21:30:00'],
            'saturday': ['08:00:00', '20:00:00'],
            'sunday': ['09:00:00', '18:00:00']
        };

        days.forEach(day => {
            sqlite.run(`
                INSERT OR IGNORE INTO available_hours (day_of_week, start_time, end_time, barber_id) 
                VALUES (?, ?, ?, 1)
            `, [day, hours[day][0], hours[day][1]]);
        });

        console.log('✅ Base de datos SQLite inicializada correctamente');
    });
};

// Función para probar la conexión
const testConnection = async () => {
    try {
        if (usePostgreSQL) {
            const client = await postgresPool.connect();
            await client.query('SELECT NOW()');
            client.release();
            console.log('✅ Conexión exitosa a PostgreSQL');
            return true;
        } else if (useMySQL) {
            const connection = await pool.promise().getConnection();
            console.log('✅ Conexión exitosa a MySQL');
            connection.release();
            return true;
        } else {
            console.log('✅ Usando SQLite para desarrollo');
            initializeSQLite();
            return true;
        }
    } catch (error) {
        console.error('❌ Error conectando a la base de datos:', error.message);
        return false;
    }
};

// Función para ejecutar queries
const executeQuery = async (query, params = []) => {
    try {
        if (usePostgreSQL) {
            const client = await postgresPool.connect();
            try {
                // Convertir query de SQLite a PostgreSQL
                let pgQuery = query;
                
                // Convertir password_hash a password
                pgQuery = pgQuery.replace(/password_hash/g, 'password');
                
                // Para INSERT, añadir RETURNING id si no está presente
                if (pgQuery.trim().toUpperCase().startsWith('INSERT') && !pgQuery.toUpperCase().includes('RETURNING')) {
                    pgQuery = pgQuery.replace(/;?\s*$/, ' RETURNING id;');
                }
                
                const result = await client.query(pgQuery, params);
                
                // Si es un INSERT, devolver formato compatible
                if (pgQuery.trim().toUpperCase().startsWith('INSERT')) {
                    return {
                        insertId: result.rows[0]?.id || null,
                        affectedRows: result.rowCount
                    };
                }
                
                return result.rows;
            } finally {
                client.release();
            }
        } else if (useMySQL) {
            const [results] = await pool.promise().execute(query, params);
            return results;
        } else {
            return new Promise((resolve, reject) => {
                // Convertir query de MySQL a SQLite si es necesario
                const sqliteQuery = query.replace(/AUTO_INCREMENT/g, 'AUTOINCREMENT');
                
                if (query.toLowerCase().includes('insert')) {
                    sqlite.run(sqliteQuery, params, function(err) {
                        if (err) reject(err);
                        else resolve({ insertId: this.lastID, affectedRows: this.changes });
                    });
                } else {
                    sqlite.all(sqliteQuery, params, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                }
            });
        }
    } catch (error) {
        console.error('Error ejecutando query:', error);
        throw error;
    }
};

// Función para ejecutar queries con transacciones
const executeTransaction = async (queries) => {
    try {
        if (useMySQL) {
            const connection = await pool.promise().getConnection();
            try {
                await connection.beginTransaction();
                
                const results = [];
                for (const { query, params } of queries) {
                    const [result] = await connection.execute(query, params);
                    results.push(result);
                }
                
                await connection.commit();
                return results;
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } else {
            return new Promise((resolve, reject) => {
                sqlite.serialize(() => {
                    sqlite.run("BEGIN TRANSACTION");
                    
                    const results = [];
                    let error = null;
                    
                    queries.forEach(({ query, params }, index) => {
                        sqlite.run(query, params, function(err) {
                            if (err) {
                                error = err;
                                return;
                            }
                            results.push({ insertId: this.lastID, affectedRows: this.changes });
                        });
                    });
                    
                    if (error) {
                        sqlite.run("ROLLBACK");
                        reject(error);
                    } else {
                        sqlite.run("COMMIT");
                        resolve(results);
                    }
                });
            });
        }
    } catch (error) {
        throw error;
    }
};

// Función para inicializar PostgreSQL
const initializePostgreSQL = async () => {
    try {
        const client = await postgresPool.connect();
        
        try {
            // Crear tabla de usuarios
            await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    full_name VARCHAR(100) NOT NULL,
                    phone VARCHAR(20),
                    role VARCHAR(10) DEFAULT 'user',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Crear tabla de barberos
            await client.query(`
                CREATE TABLE IF NOT EXISTS barbers (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    email VARCHAR(100),
                    phone VARCHAR(20),
                    specialty VARCHAR(200),
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Crear tabla de servicios
            await client.query(`
                CREATE TABLE IF NOT EXISTS services (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    duration_minutes INTEGER NOT NULL,
                    price DECIMAL(10,2),
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Crear tabla de reservas
            await client.query(`
                CREATE TABLE IF NOT EXISTS reservations (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    barber_id INTEGER REFERENCES barbers(id),
                    service_id INTEGER REFERENCES services(id),
                    reservation_date DATE NOT NULL,
                    reservation_time TIME NOT NULL,
                    client_name VARCHAR(100) NOT NULL,
                    client_phone VARCHAR(20) NOT NULL,
                    client_email VARCHAR(100),
                    notes TEXT,
                    status VARCHAR(20) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Crear tabla de horarios disponibles
            await client.query(`
                CREATE TABLE IF NOT EXISTS available_hours (
                    id SERIAL PRIMARY KEY,
                    day_of_week VARCHAR(20) NOT NULL,
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    barber_id INTEGER REFERENCES barbers(id),
                    is_active BOOLEAN DEFAULT true
                )
            `);

            console.log('✅ Tablas de PostgreSQL creadas correctamente');
            
            // Insertar datos iniciales si no existen
            await insertInitialData(client);
            
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Error inicializando PostgreSQL:', error);
        throw error;
    }
};

// Función para insertar datos iniciales en PostgreSQL
const insertInitialData = async (client) => {
    try {
        // Verificar si ya hay datos
        const userCount = await client.query('SELECT COUNT(*) FROM users');
        if (userCount.rows[0].count > 0) {
            console.log('✅ Datos iniciales ya existen en PostgreSQL');
            return;
        }

        // Insertar barbero inicial
        await client.query(`
            INSERT INTO barbers (name, email, phone, specialty, is_active) 
            VALUES ('Carlos Mendoza', 'carlos@dlsbarber.com', '555-0101', 'Cortes modernos y clásicos', true)
            ON CONFLICT DO NOTHING
        `);

        // Insertar servicios iniciales
        const services = [
            ['Corte de cabello', 'Corte profesional de cabello para hombre', 30, 800.00],
            ['Arreglo de barba', 'Arreglo y diseño de barba', 20, 500.00],
            ['Afeitado clásico', 'Afeitado tradicional con navaja', 25, 600.00],
            ['Diseños personalizados', 'Diseños creativos en cabello', 45, 1200.00],
            ['Cortes ejecutivos', 'Cortes profesionales para ejecutivos', 35, 1000.00]
        ];

        for (const service of services) {
            await client.query(`
                INSERT INTO services (name, description, duration_minutes, price) 
                VALUES ($1, $2, $3, $4)
                ON CONFLICT DO NOTHING
            `, service);
        }

        // Insertar horarios disponibles
        const hours = {
            'monday': ['10:00:00', '18:00:00'],
            'tuesday': ['10:00:00', '18:00:00'],
            'wednesday': ['10:00:00', '18:00:00'],
            'thursday': ['10:00:00', '18:00:00'],
            'friday': ['10:00:00', '18:00:00'],
            'saturday': ['10:00:00', '15:00:00']
        };

        for (const [day, times] of Object.entries(hours)) {
            await client.query(`
                INSERT INTO available_hours (day_of_week, start_time, end_time, barber_id) 
                VALUES ($1, $2, $3, 1)
                ON CONFLICT DO NOTHING
            `, [day, times[0], times[1]]);
        }

        console.log('✅ Datos iniciales insertados en PostgreSQL');
    } catch (error) {
        console.error('⚠️ Error insertando datos iniciales:', error);
        // No lanzar error para permitir que la aplicación continúe
    }
};

module.exports = {
    pool: useMySQL ? pool.promise() : null,
    postgresPool,
    sqlite,
    testConnection,
    executeQuery,
    executeTransaction,
    initializePostgreSQL,
    useMySQL,
    usePostgreSQL,
    databaseType: usePostgreSQL ? 'PostgreSQL' : (useMySQL ? 'MySQL' : 'SQLite')
};
