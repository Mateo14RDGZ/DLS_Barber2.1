// Script para inicializar PostgreSQL en producción
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_i8UCrBnaO7po@ep-purple-credit-ae5g7qn8-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
    ssl: {
        rejectUnauthorized: false
    }
});

async function initializeProductionDB() {
    try {
        console.log('🚀 Inicializando base de datos de producción...');
        
        const client = await pool.connect();
        
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
            console.log('✅ Tabla users creada');

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
            console.log('✅ Tabla barbers creada');

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
            console.log('✅ Tabla services creada');

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
            console.log('✅ Tabla reservations creada');

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
            console.log('✅ Tabla available_hours creada');

            // Insertar datos iniciales
            await insertInitialData(client);
            
            console.log('🎉 Base de datos inicializada correctamente');
            
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
    } finally {
        await pool.end();
    }
}

async function insertInitialData(client) {
    try {
        // Verificar si ya hay datos
        const userCount = await client.query('SELECT COUNT(*) FROM users');
        if (userCount.rows[0].count > 0) {
            console.log('✅ Datos iniciales ya existen');
            return;
        }

        // Insertar barbero inicial
        await client.query(`
            INSERT INTO barbers (name, email, phone, specialty, is_active) 
            VALUES ('Samuel DLS', 'samuel@dlsbarber.com', '555-0101', 'Cortes modernos y clásicos', true)
            ON CONFLICT DO NOTHING
        `);
        console.log('✅ Barbero inicial insertado');

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
        console.log('✅ Servicios iniciales insertados');

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
        console.log('✅ Horarios iniciales insertados');

        // Insertar usuario admin
        const bcrypt = require('bcryptjs');
        const adminPassword = await bcrypt.hash('Samuel_14', 12);
        
        await client.query(`
            INSERT INTO users (username, email, password, full_name, phone, role) 
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT DO NOTHING
        `, ['samuel_admin', 'samuel@dlsbarber.com', adminPassword, 'Samuel Admin', '555-0100', 'admin']);
        console.log('✅ Usuario admin insertado');

    } catch (error) {
        console.error('⚠️ Error insertando datos iniciales:', error);
    }
}

// Ejecutar inicialización
initializeProductionDB();
