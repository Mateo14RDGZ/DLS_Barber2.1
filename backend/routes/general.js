const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');

// Obtener todos los barberos
router.get('/', async (req, res) => {
    try {
        const barbers = await executeQuery(`
            SELECT id, name, email, phone, specialty, is_active, created_at
            FROM barbers
            WHERE is_active = TRUE
            ORDER BY name
        `);
        
        res.json({ barbers });
    } catch (error) {
        console.error('Error obteniendo barberos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener todos los barberos (ruta alternativa)
router.get('/barbers', async (req, res) => {
    try {
        const barbers = await executeQuery(`
            SELECT id, name, email, phone, specialty, is_active, created_at
            FROM barbers
            WHERE is_active = TRUE
            ORDER BY name
        `);
        
        res.json({ barbers });
    } catch (error) {
        console.error('Error obteniendo barberos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener todos los servicios
router.get('/services', async (req, res) => {
    try {
        const services = await executeQuery(`
            SELECT id, name, description, duration_minutes, price, is_active, created_at
            FROM services
            WHERE is_active = TRUE
            ORDER BY name
        `);
        
        res.json({ services });
    } catch (error) {
        console.error('Error obteniendo servicios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
