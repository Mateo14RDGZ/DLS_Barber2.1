// Login súper simplificado para debugging
module.exports = async (req, res) => {
    try {
        console.log('🔥 [simple-login] === INICIO ===');
        
        // CORS básico
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Content-Type', 'application/json');
        
        if (req.method === 'OPTIONS') {
            console.log('🔥 [simple-login] OPTIONS request');
            return res.status(200).end();
        }
        
        if (req.method !== 'POST') {
            console.log('🔥 [simple-login] Método no POST:', req.method);
            return res.status(405).json({ error: 'Solo POST permitido' });
        }
        
        console.log('🔥 [simple-login] Body:', JSON.stringify(req.body));
        
        const { email, password } = req.body || {};
        
        if (!email || !password) {
            console.log('🔥 [simple-login] Faltan credenciales');
            return res.status(400).json({ error: 'Email y password requeridos' });
        }
        
        // Por ahora, aceptar cualquier login para probar
        console.log('🔥 [simple-login] Login simulado exitoso');
        
        return res.status(200).json({
            success: true,
            message: 'Login simulado exitoso',
            token: 'test-token-123',
            user: {
                id: 1,
                email: email,
                username: 'testuser',
                role: 'admin'
            }
        });
        
    } catch (error) {
        console.error('🔥 [simple-login] Error:', error);
        return res.status(500).json({ 
            error: 'Error interno', 
            message: error.message 
        });
    }
};
