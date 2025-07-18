const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Configuración de base de datos adaptativa
const { testConnection, initializePostgreSQL, usePostgreSQL, databaseType } = require('./config/database');
const authRoutes = require('./routes/auth');
const reservationRoutes = require('./routes/reservations');
const generalRoutes = require('./routes/general');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de seguridad
app.use(helmet());

// Configuración de CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://dls-barber-kktiktqqnp-mateos-projects-8a61dba7.vercel.app', 'https://tu-dominio.com']
        : true, // Permitir todos los orígenes en desarrollo
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
    message: 'Demasiadas peticiones desde esta IP, intenta de nuevo en 15 minutos.'
});
app.use('/api', limiter);

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para logs
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api', generalRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.json({ 
        message: 'DLS Barber API funcionando correctamente',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Ruta para servir archivos estáticos (frontend)
app.use(express.static('public'));

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((error, req, res, next) => {
    console.error('Error global:', error);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Ha ocurrido un error'
    });
});

// Inicializar servidor
const startServer = async () => {
    try {
        console.log(`🔧 Inicializando servidor con ${databaseType}...`);
        
        // Probar conexión a la base de datos
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error('❌ No se pudo conectar a la base de datos');
            process.exit(1);
        }
        
        // Inicializar PostgreSQL si es necesario
        if (usePostgreSQL) {
            console.log('🐘 Inicializando PostgreSQL...');
            await initializePostgreSQL();
        }
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
            console.log(`📍 API disponible en: http://localhost:${PORT}/api`);
            console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
            console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🗄️ Base de datos: ${databaseType}`);
        });
    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
};

// Manejo de señales de terminación
process.on('SIGTERM', () => {
    console.log('🛑 Servidor terminado por SIGTERM');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Servidor terminado por SIGINT');
    process.exit(0);
});

// Iniciar servidor
startServer();
