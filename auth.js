// Configuración de la API - Detecta automáticamente el entorno
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' 
    : '/api';

console.log('🔧 auth.js cargado');
console.log('🌐 Hostname actual:', window.location.hostname);
console.log('🔗 API_BASE_URL configurada:', API_BASE_URL);

// Utilidades para el localStorage
const storage = {
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    get: (key) => {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    },
    remove: (key) => localStorage.removeItem(key),
    clear: () => localStorage.clear()
};

// Función para hacer peticiones a la API
async function apiRequest(endpoint, options = {}) {
    const token = storage.get('token');
    
    // Determinar URL base y construir URL completa
    let url;
    if (endpoint.startsWith('/api')) {
        // Si ya tiene el prefijo /api, no lo añadimos de nuevo
        url = endpoint;
        console.log('⚠️ Endpoint ya tiene prefijo /api, usando directamente:', url);
    } else {
        // Añadir el prefijo API_BASE_URL
        url = `${API_BASE_URL}${endpoint}`;
        console.log('✅ Construyendo URL con prefijo API_BASE_URL:', url);
    }
    
    console.log(`🔄 Haciendo petición a: ${url}`);
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
        },
        ...options
    };

    try {
        const response = await fetch(url, config);
        
        // Verificar si la respuesta es JSON válida
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('❌ Respuesta no es JSON:', text);
            console.error('⚠️ Detalles de la petición:', {
                url: url,
                método: options.method || 'GET',
                estado: response.status,
                contentType: contentType,
                headers: Object.fromEntries(response.headers.entries())
            });
            throw new Error(`Respuesta inválida del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('❌ Respuesta de error del servidor:', data);
            
            // Si hay detalles de validación, incluirlos en el error
            if (data.details && Array.isArray(data.details) && data.details.length > 0) {
                const errorMessages = data.details.map(detail => detail.msg).join(', ');
                throw new Error(errorMessages);
            } else {
                // Usar el mensaje de error del servidor o uno genérico
                const errorMessage = data.error || data.message || 'Error en la petición';
                throw new Error(errorMessage);
            }
        }
        
        return data;
    } catch (error) {
        console.error('Error en API:', error);
        throw error;
    }
}

// Función para mostrar mensajes
function showMessage(message, type = 'error') {
    const container = document.getElementById('message-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="${type}-message">
            ${message}
        </div>
    `;
    
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

// Función para validar token
function isAuthenticated() {
    const token = storage.get('token');
    if (!token) return false;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp > Date.now() / 1000;
    } catch (error) {
        return false;
    }
}

// Función para logout
function logout() {
    storage.clear();
    window.location.href = 'login.html';
}

// Función para redirect si no está autenticado
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Función para redirect si ya está autenticado
function requireGuest() {
    if (isAuthenticated()) {
        window.location.href = 'dashboard.html';
        return false;
    }
    return true;
}

// Manejo del formulario de login
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado, inicializando auth.js');
    
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    console.log('🔍 Formularios encontrados:', { 
        login: !!loginForm, 
        register: !!registerForm 
    });
    
    if (loginForm) {
        requireGuest();
        
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const data = await apiRequest('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });
                
                storage.set('token', data.token);
                storage.set('user', data.user);
                
                showMessage('Login exitoso. Redirigiendo...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
                
            } catch (error) {
                showMessage(error.message);
            }
        });
    }
    
    if (registerForm) {
        console.log('📝 Formulario de registro encontrado');
        requireGuest();
        
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('🚀 Procesando registro...');
            
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const full_name = document.getElementById('full_name').value;
            const phone = document.getElementById('phone').value;
            
            console.log('📋 Datos del formulario:', { username, email, full_name, phone });
            
            try {
                const data = await apiRequest('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({
                        username,
                        email,
                        password,
                        full_name,
                        phone
                    })
                });
                
                console.log('✅ Registro exitoso:', data);
                
                storage.set('token', data.token);
                storage.set('user', data.user);
                
                showMessage('Registro exitoso. Redirigiendo...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
                
            } catch (error) {
                console.error('❌ Error en registro:', error);
                showMessage(error.message);
            }
        });
    } else {
        console.log('ℹ️ Formulario de registro no encontrado - esto es normal en algunas páginas');
    }
});
