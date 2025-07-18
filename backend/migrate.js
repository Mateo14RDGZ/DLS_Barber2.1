const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Configuración de bases de datos
const sqliteDb = new sqlite3.Database(path.join(__dirname, 'database', 'dls_barber.db'));

const postgresPool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
});

async function migrateData() {
    try {
        console.log('🚀 Iniciando migración de SQLite a PostgreSQL...');
        
        const client = await postgresPool.connect();
        
        try {
            // Migrar usuarios
            await migrateTable('users', client, [
                'id', 'username', 'email', 'password_hash as password', 'full_name', 'phone', 'role', 'created_at'
            ]);
            
            // Migrar barberos
            await migrateTable('barbers', client, [
                'id', 'name', 'email', 'phone', 'specialty', 'is_active', 'created_at'
            ]);
            
            // Migrar servicios
            await migrateTable('services', client, [
                'id', 'name', 'description', 'duration_minutes', 'price', 'is_active', 'created_at'
            ]);
            
            // Migrar horarios disponibles
            await migrateTable('available_hours', client, [
                'id', 'day_of_week', 'start_time', 'end_time', 'barber_id', 'is_active'
            ]);
            
            // Migrar reservas
            await migrateTable('reservations', client, [
                'id', 'user_id', 'barber_id', 'service_id', 'reservation_date', 
                'reservation_time', 'client_name', 'client_phone', 'client_email', 
                'notes', 'status', 'created_at', 'updated_at'
            ]);
            
            console.log('🎉 Migración completada exitosamente');
            
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('❌ Error en migración:', error);
    } finally {
        sqliteDb.close();
        await postgresPool.end();
    }
}

async function migrateTable(tableName, pgClient, columns) {
    return new Promise((resolve, reject) => {
        const selectColumns = columns.map(col => col.includes(' as ') ? col : col).join(', ');
        
        sqliteDb.all(`SELECT ${selectColumns} FROM ${tableName}`, async (err, rows) => {
            if (err) {
                console.error(`❌ Error leyendo ${tableName}:`, err);
                reject(err);
                return;
            }
            
            if (rows.length === 0) {
                console.log(`⚠️ No hay datos en ${tableName}`);
                resolve();
                return;
            }
            
            let migrated = 0;
            let skipped = 0;
            
            for (const row of rows) {
                try {
                    // Construir query INSERT dinámicamente
                    const columnNames = Object.keys(row).filter(key => key !== 'id');
                    const values = columnNames.map(col => row[col]);
                    const placeholders = columnNames.map((_, index) => `$${index + 1}`).join(', ');
                    
                    const insertQuery = `
                        INSERT INTO ${tableName} (${columnNames.join(', ')}) 
                        VALUES (${placeholders})
                        ON CONFLICT DO NOTHING
                    `;
                    
                    const result = await pgClient.query(insertQuery, values);
                    
                    if (result.rowCount > 0) {
                        migrated++;
                    } else {
                        skipped++;
                    }
                    
                } catch (error) {
                    console.error(`⚠️ Error migrando registro de ${tableName}:`, error);
                    skipped++;
                }
            }
            
            console.log(`✅ ${tableName}: ${migrated} migrados, ${skipped} omitidos`);
            resolve();
        });
    });
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
    if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
        console.error('❌ Error: Variable POSTGRES_URL o DATABASE_URL no configurada');
        console.log('💡 Configura la variable de entorno con la URL de tu base PostgreSQL');
        process.exit(1);
    }
    
    migrateData();
}

module.exports = { migrateData };
