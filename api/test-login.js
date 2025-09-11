// Endpoint de prueba para verificar conectividad
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    return res.status(200).json({
        success: true,
        message: 'Test endpoint funcionando',
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString()
    });
};
