// Variables globales
let selectedDate = null;
let selectedHour = null;
let barbers = [];
let currentUser = null;

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    if (!requireAuth()) return;
    
    // Cargar datos del usuario
    currentUser = storage.get('user');
    console.log('👤 Usuario actual:', currentUser);
    console.log('🔑 Token actual:', storage.get('token'));
    
    if (currentUser) {
        document.getElementById('user-name').textContent = currentUser.full_name;
        
        // Mostrar botón de admin si es administrador
        if (currentUser.role === 'admin') {
            document.getElementById('admin-panel-btn').style.display = 'block';
        }
        
        // Pre-llenar formulario con datos del usuario
        document.getElementById('client_name').value = currentUser.full_name;
        document.getElementById('client_phone').value = currentUser.phone || '';
        document.getElementById('client_email').value = currentUser.email || '';
    }
    
    // Inicializar AOS
    AOS.init();
    
    // Cargar datos iniciales
    loadInitialData();
    
    // Inicializar formulario de reserva
    initReservationForm();
    
    // Cargar historial de reservas
    loadUserReservations();
});

// Cargar datos iniciales (solo barberos)
async function loadInitialData() {
    try {
        // Cargar barberos
        const barbersData = await apiRequest('/');
        barbers = barbersData.barbers;
        
        console.log('✅ Barberos cargados:', barbers.length);
        
    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        showMessage('Error cargando datos. Por favor, recarga la página.');
    }
}

// Inicializar formulario de reserva
function initReservationForm() {
    // Inicializar Flatpickr para fecha
    flatpickr("#fecha", {
        dateFormat: "Y-m-d",
        minDate: "today",
        maxDate: new Date().fp_incr(30),
        onChange: function(selectedDates, dateStr, instance) {
            selectedDate = dateStr;
            console.log('📅 Fecha seleccionada:', selectedDate);
            
            if (selectedDate) {
                loadAvailableHours(selectedDate);
            }
        }
    });
    
    // Event listener para botón de confirmación
    document.getElementById('confirm-appointment').addEventListener('click', confirmReservation);
    
    // Validación en tiempo real del formulario
    const formInputs = ['client_name', 'client_phone'];
    formInputs.forEach(inputId => {
        document.getElementById(inputId).addEventListener('input', validateForm);
    });
}

// Cargar horarios disponibles
async function loadAvailableHours(date) {
    try {
        console.log('🔍 Cargando horarios para fecha:', date);
        
        if (!barbers.length) {
            console.error('❌ No hay barberos disponibles');
            showMessage('No hay barberos disponibles.');
            return;
        }
        
        // Usar el primer barbero disponible (Samuel)
        const barberId = barbers[0].id;
        console.log('👨‍💼 Usando barbero ID:', barberId);
        
        console.log('📡 Haciendo petición a API...');
        const data = await apiRequest(`/reservations/available-hours/${date}/${barberId}`);
        console.log('✅ Respuesta de API:', data);
        
        const availableHours = data.available_hours;
        console.log('⏰ Horarios disponibles:', availableHours);
        
        const horariosContainer = document.getElementById('horarios-container');
        const horasDisponibles = document.getElementById('horas-disponibles');
        
        if (!horariosContainer || !horasDisponibles) {
            console.error('❌ Elementos del DOM no encontrados');
            return;
        }
        
        horasDisponibles.innerHTML = '';
        
        if (availableHours.length === 0) {
            console.log('⚠️ No hay horarios disponibles');
            horasDisponibles.innerHTML = '<p style="color: var(--color-white); text-align: center;">No hay horarios disponibles para esta fecha</p>';
        } else {
            console.log('✅ Mostrando', availableHours.length, 'horarios disponibles');
            availableHours.forEach(hour => {
                const hourBtn = document.createElement('button');
                hourBtn.className = 'hora-btn';
                hourBtn.textContent = hour;
                hourBtn.setAttribute('data-hour', hour);
                hourBtn.addEventListener('click', (event) => {
                    event.preventDefault();
                    selectHour(hour);
                });
                horasDisponibles.appendChild(hourBtn);
            });
        }
        
        horariosContainer.style.display = 'block';
        console.log('✅ Contenedor de horarios mostrado');
        
    } catch (error) {
        console.error('❌ Error cargando horarios:', error);
        showMessage('Error cargando horarios disponibles: ' + error.message);
    }
}

// Seleccionar hora
function selectHour(hour) {
    selectedHour = hour;
    console.log('⏰ Hora seleccionada:', selectedHour);
    
    // Actualizar UI
    document.querySelectorAll('.hora-btn').forEach(btn => {
        btn.classList.remove('selected');
        btn.style.background = '';
        btn.style.color = '';
    });
    
    // Agregar clase selected al botón clickeado
    const selectedBtn = document.querySelector(`[data-hour="${hour}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
        selectedBtn.style.background = '#ef4444';
        selectedBtn.style.color = 'white';
        selectedBtn.style.transform = 'scale(1.05)';
    }
    
    // Mostrar mensaje de confirmación
    const message = document.getElementById('message-container');
    if (message) {
        message.innerHTML = `
            <div class="success-message">
                ✅ Horario ${hour} seleccionado. Completa tus datos para confirmar la reserva.
            </div>
        `;
        setTimeout(() => {
            message.innerHTML = '';
        }, 3000);
    }
    
    // Mostrar directamente el modal de datos del cliente
    console.log('📝 Mostrando modal de datos del cliente');
    setTimeout(() => {
        showClientDataForm();
    }, 200);
}

// Mostrar formulario de datos del cliente
function showClientDataForm() {
    console.log('📝 Mostrando formulario de datos del cliente');
    console.log('🔍 Datos disponibles - Fecha:', selectedDate, 'Hora:', selectedHour);
    
    const clientDataContainer = document.getElementById('client-data-container');
    if (clientDataContainer) {
        // Forzar que se muestre el modal
        clientDataContainer.style.display = 'block';
        clientDataContainer.style.opacity = '0';
        clientDataContainer.style.transform = 'translateY(20px)';
        
        // Animación de aparición
        setTimeout(() => {
            clientDataContainer.style.transition = 'all 0.3s ease';
            clientDataContainer.style.opacity = '1';
            clientDataContainer.style.transform = 'translateY(0)';
        }, 50);
        
        console.log('✅ Contenedor de datos del cliente mostrado');
        console.log('🎨 Estilos aplicados:', {
            display: clientDataContainer.style.display,
            opacity: clientDataContainer.style.opacity,
            transform: clientDataContainer.style.transform
        });
        
        // Scroll suave hacia el modal
        setTimeout(() => {
            clientDataContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 100);
    } else {
        console.error('❌ Elemento client-data-container no encontrado');
        return;
    }
    
    // Actualizar información seleccionada (sin servicio)
    updateSelectedInfo();
    validateForm();
}

// Actualizar información seleccionada
function updateSelectedInfo() {
    const selectedInfoText = document.getElementById('selected-info-text');
    if (selectedInfoText && selectedDate && selectedHour) {
        selectedInfoText.textContent = `📅 ${selectedDate} a las ${selectedHour} ⏰`;
        console.log('✅ Información actualizada:', selectedInfoText.textContent);
    } else {
        console.log('⚠️ Información incompleta - Fecha:', selectedDate, 'Hora:', selectedHour);
    }
}

// Validar formulario
function validateForm() {
    const name = document.getElementById('client_name').value.trim();
    const phone = document.getElementById('client_phone').value.trim();
    const confirmBtn = document.getElementById('confirm-appointment');
    
    const isValid = name && phone && selectedDate && selectedHour;
    
    confirmBtn.disabled = !isValid;
    confirmBtn.style.opacity = isValid ? '1' : '0.6';
    
    if (isValid) {
        console.log('✅ Formulario válido - botón habilitado');
    } else {
        console.log('❌ Formulario incompleto - botón deshabilitado');
    }
}

// Confirmar reserva
async function confirmReservation() {
    try {
        const client_name = document.getElementById('client_name').value.trim();
        const client_phone = document.getElementById('client_phone').value.trim();
        const client_email = document.getElementById('client_email').value.trim();
        const notes = document.getElementById('notes').value.trim();
        
        console.log('📋 Confirmando reserva:', {
            barber_id: barbers[0].id,
            service_id: 1, // Servicio por defecto
            reservation_date: selectedDate,
            reservation_time: selectedHour,
            client_name,
            client_phone,
            client_email,
            notes
        });
        
        // Validar datos requeridos
        if (!client_name || !client_phone || !selectedDate || !selectedHour) {
            showMessage('Por favor, completa todos los campos requeridos.');
            return;
        }
        
        // Crear reserva (usar servicio por defecto - Corte de cabello)
        const reservationData = {
            barber_id: barbers[0].id,
            service_id: 1, // Servicio por defecto
            reservation_date: selectedDate,
            reservation_time: selectedHour,
            client_name,
            client_phone,
            client_email: client_email || null,
            notes: notes || null
        };
        
        const result = await apiRequest('/reservations', {
            method: 'POST',
            body: JSON.stringify(reservationData)
        });
        
        console.log('✅ Reserva creada exitosamente:', result);
        showMessage('¡Reserva confirmada exitosamente!', 'success');
        
        // Recargar las reservas del usuario
        console.log('🔄 Recargando lista de reservas...');
        await loadUserReservations();
        
        // Debug: Verificar valores antes de crear el mensaje
        console.log('📧 Creando mensaje de WhatsApp con:', {
            selectedDate,
            selectedHour,
            client_name,
            client_phone,
            client_email,
            notes
        });
        
        // Crear mensaje de WhatsApp ANTES de limpiar el formulario
        const mensaje = `🔥 NUEVA RESERVA - DLS BARBER 💈

📅 Fecha: ${selectedDate}
⏰ Hora: ${selectedHour}
👤 Cliente: ${client_name}
📞 Teléfono: ${client_phone}
${client_email ? `📧 Email: ${client_email}` : ''}
${notes ? `📝 Notas: ${notes}` : ''}

¡Reserva confirmada! 🎉`;
        
        console.log('📱 Mensaje de WhatsApp creado:', mensaje);
        
        // Abrir WhatsApp
        const whatsappUrl = `https://wa.me/598092870198?text=${encodeURIComponent(mensaje)}`;
        window.open(whatsappUrl, '_blank');
        
        // Limpiar formulario DESPUÉS de crear el mensaje
        resetForm();
        
        // Recargar reservas
        loadUserReservations();
        
    } catch (error) {
        console.error('Error confirmando reserva:', error);
        showMessage(error.message || 'Error al confirmar la reserva. Intenta nuevamente.');
    }
}

// Limpiar formulario
function resetForm() {
    selectedDate = null;
    selectedHour = null;
    
    document.getElementById('fecha').value = '';
    document.getElementById('notes').value = '';
    
    document.getElementById('horarios-container').style.display = 'none';
    document.getElementById('client-data-container').style.display = 'none';
    
    document.getElementById('horas-disponibles').innerHTML = '';
    document.getElementById('selected-info-text').textContent = '';
    
    // Mantener datos del usuario
    document.getElementById('client_name').value = currentUser.full_name;
    document.getElementById('client_phone').value = currentUser.phone || '';
    document.getElementById('client_email').value = currentUser.email || '';
}

// Cargar reservas del usuario
async function loadUserReservations() {
    try {
        console.log('🔄 Cargando reservas del usuario...');
        const data = await apiRequest('/reservations/my-reservations');
        console.log('📨 Respuesta del servidor:', data);
        const reservations = data.reservations;
        console.log('📋 Reservas encontradas:', reservations?.length || 0);
        
        const reservationsList = document.getElementById('reservations-list');
        
        if (!reservations || reservations.length === 0) {
            console.log('ℹ️ No hay reservas para mostrar');
            reservationsList.innerHTML = '<div class="no-reservations">No tienes reservas aún</div>';
            return;
        }
        
        console.log('✅ Mostrando', reservations.length, 'reservas');
        reservationsList.innerHTML = reservations.map(reservation => `
            <div class="reservation-card">
                <h4>${reservation.service_name}</h4>
                <p><strong>📅 Fecha:</strong> ${reservation.reservation_date}</p>
                <p><strong>⏰ Hora:</strong> ${reservation.reservation_time}</p>
                <p><strong>✂️ Barbero:</strong> ${reservation.barber_name}</p>
                <p><strong>👤 Cliente:</strong> ${reservation.client_name}</p>
                <p><strong>📱 Teléfono:</strong> ${reservation.client_phone}</p>
                ${reservation.notes ? `<p><strong>📝 Notas:</strong> ${reservation.notes}</p>` : ''}
                <p><strong>Estado:</strong> <span class="status-badge status-${reservation.status}">${getStatusText(reservation.status)}</span></p>
                <p><strong>Creada:</strong> ${new Date(reservation.created_at).toLocaleDateString()}</p>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando reservas:', error);
        const reservationsList = document.getElementById('reservations-list');
        reservationsList.innerHTML = '<div class="no-reservations">Error cargando reservas</div>';
    }
}

// Obtener texto del estado
function getStatusText(status) {
    const statusMap = {
        'pending': 'Pendiente',
        'confirmed': 'Confirmada',
        'completed': 'Completada',
        'cancelled': 'Cancelada'
    };
    return statusMap[status] || status;
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

// Función para ir al panel de administrador
function goToAdminPanel() {
    window.location.href = 'admin.html';
}

console.log('🚀 Dashboard DLS BARBER - Cargado con autenticación!');
