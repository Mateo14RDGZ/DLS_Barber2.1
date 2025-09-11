// Endpoint super simple para test
module.exports = async (req, res) => {
    try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Content-Type', 'application/json');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        return res.status(200).json({
            success: true,
            message: 'Test endpoint funcionando correctamente',
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url,
            vercel: !!process.env.VERCEL,
            node_env: process.env.NODE_ENV
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
