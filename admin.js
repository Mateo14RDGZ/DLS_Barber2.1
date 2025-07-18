// Variables globales
let allReservations = [];
let filteredReservations = [];
let barbers = [];

// Verificar autenticación de administrador al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛡️ Iniciando panel de administrador...');
    
    if (!requireAuth()) {
        console.log('❌ No autenticado, redirigiendo...');
        return;
    }
    
    // Verificar si el usuario es administrador
    const currentUser = storage.get('user');
    console.log('👤 Usuario actual:', currentUser);
    
    if (!currentUser || currentUser.role !== 'admin') {
        console.log('❌ Acceso denegado - No es administrador');
        showMessage('Acceso denegado. Solo administradores pueden acceder a esta página.', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        return;
    }
    
    console.log('✅ Acceso de administrador confirmado');
    
    // Inicializar AOS
    AOS.init();
    
    // Cargar datos iniciales
    loadInitialData();
});

// Cargar datos iniciales
async function loadInitialData() {
    try {
        console.log('📊 Cargando datos iniciales...');
        
        // Cargar barberos para el filtro
        await loadBarbers();
        
        // Cargar todas las reservas
        await loadAllReservations();
        
        // Calcular estadísticas
        updateStats();
        
    } catch (error) {
        console.error('❌ Error cargando datos iniciales:', error);
        showMessage('Error cargando datos iniciales', 'error');
    }
}

// Cargar barberos
async function loadBarbers() {
    try {
        const data = await apiRequest('/general/barbers');
        barbers = data.barbers;
        
        // Llenar el filtro de barberos
        const barberFilter = document.getElementById('barber-filter');
        barberFilter.innerHTML = '<option value="">Todos</option>';
        
        barbers.forEach(barber => {
            const option = document.createElement('option');
            option.value = barber.id;
            option.textContent = barber.name;
            barberFilter.appendChild(option);
        });
        
        console.log('✅ Barberos cargados:', barbers.length);
    } catch (error) {
        console.error('❌ Error cargando barberos:', error);
    }
}

// Cargar todas las reservas
async function loadAllReservations() {
    try {
        console.log('📋 Cargando todas las reservas...');
        
        const loadingElement = document.getElementById('loading-reservations');
        const tableElement = document.getElementById('reservations-table');
        const noDataElement = document.getElementById('no-reservations');
        
        // Mostrar loading
        loadingElement.style.display = 'block';
        tableElement.style.display = 'none';
        noDataElement.style.display = 'none';
        
        const data = await apiRequest('/reservations/all');
        allReservations = data.reservations;
        filteredReservations = [...allReservations];
        
        console.log('✅ Reservas cargadas:', allReservations.length);
        
        // Ocultar loading
        loadingElement.style.display = 'none';
        
        if (allReservations.length === 0) {
            noDataElement.style.display = 'block';
        } else {
            tableElement.style.display = 'table';
            renderReservationsTable();
        }
        
    } catch (error) {
        console.error('❌ Error cargando reservas:', error);
        document.getElementById('loading-reservations').style.display = 'none';
        document.getElementById('no-reservations').style.display = 'block';
        showMessage('Error cargando reservas', 'error');
    }
}

// Renderizar tabla de reservas
function renderReservationsTable() {
    const tbody = document.getElementById('reservations-tbody');
    
    if (filteredReservations.length === 0) {
        document.getElementById('reservations-table').style.display = 'none';
        document.getElementById('no-reservations').style.display = 'block';
        return;
    }
    
    document.getElementById('reservations-table').style.display = 'table';
    document.getElementById('no-reservations').style.display = 'none';
    
    tbody.innerHTML = filteredReservations.map(reservation => `
        <tr>
            <td>${reservation.id}</td>
            <td>${reservation.reservation_date}</td>
            <td>${reservation.reservation_time}</td>
            <td>${reservation.client_name}</td>
            <td>${reservation.client_phone}</td>
            <td>${reservation.barber_name}</td>
            <td>${reservation.service_name}</td>
            <td>
                <span class="status-badge status-${reservation.status}">
                    ${getStatusText(reservation.status)}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    ${reservation.status === 'pending' ? `
                        <button class="btn-small btn-confirm" onclick="updateReservationStatus(${reservation.id}, 'confirmed')">
                            ✅ Confirmar
                        </button>
                        <button class="btn-small btn-cancel" onclick="updateReservationStatus(${reservation.id}, 'cancelled')">
                            ❌ Cancelar
                        </button>
                    ` : ''}
                    ${reservation.status === 'confirmed' ? `
                        <button class="btn-small btn-cancel" onclick="updateReservationStatus(${reservation.id}, 'cancelled')">
                            ❌ Cancelar
                        </button>
                    ` : ''}
                    ${reservation.status === 'cancelled' ? `
                        <button class="btn-small btn-confirm" onclick="updateReservationStatus(${reservation.id}, 'confirmed')">
                            ✅ Reactivar
                        </button>
                    ` : ''}
                    <button class="btn-small btn-details" onclick="showReservationDetails(${reservation.id})">
                        📋 Detalles
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Aplicar filtros
function applyFilters() {
    const statusFilter = document.getElementById('status-filter').value;
    const dateFilter = document.getElementById('date-filter').value;
    const barberFilter = document.getElementById('barber-filter').value;
    
    console.log('🔍 Aplicando filtros:', { statusFilter, dateFilter, barberFilter });
    
    filteredReservations = allReservations.filter(reservation => {
        let matches = true;
        
        if (statusFilter && reservation.status !== statusFilter) {
            matches = false;
        }
        
        if (dateFilter && reservation.reservation_date !== dateFilter) {
            matches = false;
        }
        
        if (barberFilter && reservation.barber_id.toString() !== barberFilter) {
            matches = false;
        }
        
        return matches;
    });
    
    console.log('📊 Reservas filtradas:', filteredReservations.length);
    renderReservationsTable();
    updateStats();
}

// Actualizar estadísticas
function updateStats() {
    const reservationsToAnalyze = filteredReservations.length > 0 ? filteredReservations : allReservations;
    
    const total = reservationsToAnalyze.length;
    const pending = reservationsToAnalyze.filter(r => r.status === 'pending').length;
    const confirmed = reservationsToAnalyze.filter(r => r.status === 'confirmed').length;
    const cancelled = reservationsToAnalyze.filter(r => r.status === 'cancelled').length;
    
    document.getElementById('total-reservations').textContent = total;
    document.getElementById('pending-reservations').textContent = pending;
    document.getElementById('confirmed-reservations').textContent = confirmed;
    document.getElementById('cancelled-reservations').textContent = cancelled;
}

// Actualizar estado de reserva
async function updateReservationStatus(reservationId, newStatus) {
    try {
        console.log(`🔄 Actualizando reserva ${reservationId} a estado: ${newStatus}`);
        
        const result = await apiRequest(`/reservations/${reservationId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        
        console.log('✅ Estado actualizado:', result);
        showMessage(`Reserva ${newStatus === 'confirmed' ? 'confirmada' : 'cancelada'} exitosamente`, 'success');
        
        // Recargar reservas
        await loadAllReservations();
        
    } catch (error) {
        console.error('❌ Error actualizando estado:', error);
        showMessage('Error actualizando el estado de la reserva', 'error');
    }
}

// Mostrar detalles de reserva
function showReservationDetails(reservationId) {
    const reservation = allReservations.find(r => r.id === reservationId);
    if (!reservation) return;
    
    const modal = document.getElementById('reservation-modal');
    const detailsContainer = document.getElementById('reservation-details');
    
    detailsContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <h3>Información de la Reserva</h3>
                <p><strong>ID:</strong> ${reservation.id}</p>
                <p><strong>Fecha:</strong> ${reservation.reservation_date}</p>
                <p><strong>Hora:</strong> ${reservation.reservation_time}</p>
                <p><strong>Estado:</strong> <span class="status-badge status-${reservation.status}">${getStatusText(reservation.status)}</span></p>
                <p><strong>Creada:</strong> ${new Date(reservation.created_at).toLocaleString()}</p>
            </div>
            <div>
                <h3>Información del Cliente</h3>
                <p><strong>Nombre:</strong> ${reservation.client_name}</p>
                <p><strong>Teléfono:</strong> ${reservation.client_phone}</p>
                <p><strong>Email:</strong> ${reservation.client_email || 'No proporcionado'}</p>
                ${reservation.notes ? `<p><strong>Notas:</strong> ${reservation.notes}</p>` : ''}
            </div>
        </div>
        <div style="margin-top: 20px;">
            <h3>Información del Servicio</h3>
            <p><strong>Barbero:</strong> ${reservation.barber_name}</p>
            <p><strong>Servicio:</strong> ${reservation.service_name}</p>
            <p><strong>Duración:</strong> ${reservation.duration_minutes} minutos</p>
            <p><strong>Precio:</strong> $${reservation.price}</p>
        </div>
    `;
    
    modal.style.display = 'block';
}

// Cerrar modal
function closeModal() {
    document.getElementById('reservation-modal').style.display = 'none';
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('reservation-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Función para obtener texto del estado
function getStatusText(status) {
    switch(status) {
        case 'pending': return 'Pendiente';
        case 'confirmed': return 'Confirmada';
        case 'cancelled': return 'Cancelada';
        default: return status;
    }
}

// Función de logout
function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        storage.clear();
        window.location.href = 'login.html';
    }
}

// Función para mostrar mensajes
function showMessage(message, type = 'error') {
    // Crear elemento de mensaje si no existe
    let messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        messageContainer.style.position = 'fixed';
        messageContainer.style.top = '20px';
        messageContainer.style.left = '50%';
        messageContainer.style.transform = 'translateX(-50%)';
        messageContainer.style.zIndex = '9999';
        document.body.appendChild(messageContainer);
    }
    
    const messageClass = type === 'success' ? 'success-message' : 'error-message';
    messageContainer.innerHTML = `
        <div class="message ${messageClass}" style="
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        ">
            ${message}
        </div>
    `;
    
    // Ocultar mensaje después de 3 segundos
    setTimeout(() => {
        messageContainer.innerHTML = '';
    }, 3000);
}
