const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear/conectar a la base de datos SQLite
const dbPath = path.join(__dirname, '..', 'database', 'dls_barber.db');
const db = new sqlite3.Database(dbPath);

// Función para inicializar la base de datos
const initDatabase = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Crear tabla de usuarios
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                role VARCHAR(10) DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Crear tabla de barberos
            db.run(`CREATE TABLE IF NOT EXISTS barbers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100),
                phone VARCHAR(20),
                specialty VARCHAR(200),
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Crear tabla de servicios
            db.run(`CREATE TABLE IF NOT EXISTS services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                duration_minutes INTEGER NOT NULL,
                price DECIMAL(10,2),
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Crear tabla de reservas
            db.run(`CREATE TABLE IF NOT EXISTS reservations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                barber_id INTEGER,
                service_id INTEGER,
                reservation_date DATE NOT NULL,
                reservation_time TIME NOT NULL,
                client_name VARCHAR(100) NOT NULL,
                client_phone VARCHAR(20) NOT NULL,
                client_email VARCHAR(100),
                notes TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (barber_id) REFERENCES barbers(id),
                FOREIGN KEY (service_id) REFERENCES services(id)
            )`);

            // Crear tabla de horarios disponibles
            db.run(`CREATE TABLE IF NOT EXISTS available_hours (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                day_of_week VARCHAR(20) NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                barber_id INTEGER,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (barber_id) REFERENCES barbers(id)
            )`);

            // Insertar datos iniciales
            db.run(`INSERT OR IGNORE INTO barbers (id, name, email, phone, specialty) 
                   VALUES (1, 'Samuel', 'samuel@dlsbarber.com', '098863041', 'Barbero Profesional')`);

            db.run(`INSERT OR IGNORE INTO services (id, name, description, duration_minutes, price) VALUES 
                   (1, 'Corte de cabello', 'Corte profesional personalizado', 30, 800.00),
                   (2, 'Arreglo de barba', 'Arreglo y diseño de barba', 20, 500.00),
                   (3, 'Afeitado clásico', 'Afeitado tradicional con navaja', 25, 600.00),
                   (4, 'Diseños personalizados', 'Diseños creativos en cabello', 45, 1200.00),
                   (5, 'Cortes ejecutivos', 'Cortes profesionales para ejecutivos', 35, 1000.00)`);

            // Insertar horarios disponibles
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const hours = {
                'monday': { start: '08:00:00', end: '21:30:00' },
                'tuesday': { start: '08:00:00', end: '21:30:00' },
                'wednesday': { start: '08:00:00', end: '21:30:00' },
                'thursday': { start: '08:00:00', end: '21:30:00' },
                'friday': { start: '08:00:00', end: '21:30:00' },
                'saturday': { start: '08:00:00', end: '20:00:00' },
                'sunday': { start: '09:00:00', end: '18:00:00' }
            };

            days.forEach(day => {
                db.run(`INSERT OR IGNORE INTO available_hours (day_of_week, start_time, end_time, barber_id) 
                       VALUES (?, ?, ?, 1)`, [day, hours[day].start, hours[day].end]);
            });

            console.log('✅ Base de datos SQLite inicializada correctamente');
            resolve();
        });
    });
};

// Función para ejecutar queries
const executeQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        if (query.trim().toUpperCase().startsWith('SELECT')) {
            db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        } else {
            db.run(query, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ insertId: this.lastID, changes: this.changes });
                }
            });
        }
    });
};

// Función para probar la conexión
const testConnection = async () => {
    try {
        await initDatabase();
        console.log('✅ Conexión exitosa a SQLite');
        return true;
    } catch (error) {
        console.error('❌ Error conectando a SQLite:', error.message);
        return false;
    }
};

// Función para transacciones (simplificada para SQLite)
const executeTransaction = async (queries) => {
    const results = [];
    
    for (const { query, params } of queries) {
        try {
            const result = await executeQuery(query, params);
            results.push(result);
        } catch (error) {
            throw error;
        }
    }
    
    return results;
};

module.exports = {
    db,
    testConnection,
    executeQuery,
    executeTransaction,
    initDatabase
};
