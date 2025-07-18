const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear la base de datos SQLite
const dbPath = path.join(__dirname, 'barber.db');
const db = new sqlite3.Database(dbPath);

// Función para inicializar la base de datos
function initDatabase() {
    console.log('Inicializando base de datos SQLite...');
    
    // Crear tabla de usuarios
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla de barberos
        db.run(`
            CREATE TABLE IF NOT EXISTS barbers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                specialty VARCHAR(100),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla de servicios
        db.run(`
            CREATE TABLE IF NOT EXISTS services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                duration_minutes INTEGER NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla de reservas
        db.run(`
            CREATE TABLE IF NOT EXISTS reservations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                barber_id INTEGER NOT NULL,
                service_id INTEGER NOT NULL,
                date DATE NOT NULL,
                time TIME NOT NULL,
                status VARCHAR(20) DEFAULT 'confirmed',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (barber_id) REFERENCES barbers(id),
                FOREIGN KEY (service_id) REFERENCES services(id)
            )
        `);

        // Insertar datos iniciales
        db.run(`
            INSERT OR IGNORE INTO barbers (id, name, specialty) VALUES
            (1, 'Carlos Mendoza', 'Cortes clásicos'),
            (2, 'Miguel Santos', 'Barba y bigote'),
            (3, 'Juan Pérez', 'Cortes modernos')
        `);

        db.run(`
            INSERT OR IGNORE INTO services (id, name, price, duration_minutes, description) VALUES
            (1, 'Corte de Cabello', 15.00, 30, 'Corte de cabello profesional'),
            (2, 'Afeitado', 10.00, 20, 'Afeitado tradicional con navaja'),
            (3, 'Corte + Barba', 20.00, 45, 'Corte de cabello y arreglo de barba'),
            (4, 'Lavado + Corte', 18.00, 40, 'Lavado y corte de cabello'),
            (5, 'Peinado', 8.00, 15, 'Peinado y styling')
        `);

        console.log('Base de datos inicializada correctamente');
    });
}

// Función para obtener la instancia de la base de datos
function getDatabase() {
    return db;
}

// Función para cerrar la base de datos
function closeDatabase() {
    db.close((err) => {
        if (err) {
            console.error('Error al cerrar la base de datos:', err);
        } else {
            console.log('Base de datos cerrada correctamente');
        }
    });
}

// Exportar funciones
module.exports = {
    initDatabase,
    getDatabase,
    closeDatabase
};

// Si se ejecuta directamente, inicializar la base de datos
if (require.main === module) {
    initDatabase();
}
