// Inicializar AOS (Animate On Scroll) con configuración mejorada
AOS.init({
  duration: 1000,
  easing: 'ease-out-cubic',
  once: false,
  mirror: true,
  offset: 50
});

// Configuración
const numeroWhatsApp = "598092870198";
let selectedDate = null;
let selectedHour = null;

// Función para verificar si el formulario está completo
function checkFormCompletion() {
  const confirmBtn = document.getElementById('confirm-appointment');
  if (!confirmBtn) return;
  
  const name = document.getElementById('name')?.value.trim();
  const phone = document.getElementById('phone')?.value.trim();
  const barber = document.getElementById('barber')?.value;
  
  console.log('🔍 Verificando formulario:', { name, phone, barber, selectedDate, selectedHour });
  
  if (name && phone && barber && selectedDate && selectedHour) {
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
    console.log('✅ Formulario completo - botón habilitado');
  } else {
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.6';
    confirmBtn.style.cursor = 'not-allowed';
    console.log('❌ Formulario incompleto - botón deshabilitado');
  }
}

// Esperar a que el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {

// Crear efecto de cursor personalizado
function createCustomCursor() {
  const cursor = document.createElement('div');
  cursor.classList.add('custom-cursor');
  cursor.style.cssText = `
    position: fixed;
    width: 20px;
    height: 20px;
    background: radial-gradient(circle, rgba(29,161,242,0.8), rgba(29,161,242,0.2));
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
    mix-blend-mode: difference;
    transition: transform 0.1s ease;
  `;
  document.body.appendChild(cursor);
  
  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX - 10 + 'px';
    cursor.style.top = e.clientY - 10 + 'px';
  });
  
  document.addEventListener('mousedown', () => {
    cursor.style.transform = 'scale(1.5)';
  });
  
  document.addEventListener('mouseup', () => {
    cursor.style.transform = 'scale(1)';
  });
}

// Agregar efectos de sonido simulados (vibración en dispositivos móviles)
function addHapticFeedback() {
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
}

// Configurar Flatpickr con tema personalizado
flatpickr("#fecha", {
  minDate: "today",
  dateFormat: "Y-m-d",
  disableMobile: true,
  animate: true,
  onChange: function(selectedDates, dateStr) {
    selectedDate = dateStr;
    mostrarHorarios();
    addHapticFeedback();
    
    // Efecto visual cuando se selecciona una fecha
    const fechaInput = document.getElementById('fecha');
    fechaInput.style.transform = 'scale(1.02)';
    setTimeout(() => {
      fechaInput.style.transform = 'scale(1)';
    }, 200);
  }
});

// Horarios disponibles con más opciones
const horasDisponibles = [
  "08:00", "08:45", "09:30", "10:15", "11:00",
  "11:45", "14:30", "15:15", "16:00", "16:45",
  "17:30", "18:15", "19:00", "19:45", "20:30", "21:15"
];

// Referencias a elementos del DOM
const containerHoras = document.getElementById('horas-disponibles');
const contenedorHorarios = document.getElementById('horarios-container');

// Función mejorada para mostrar los horarios disponibles
function mostrarHorarios() {
  if (!selectedDate) return;
  
  // Limpiar contenido anterior
  containerHoras.innerHTML = "";
  selectedHour = null;
  
  // Ocultar contenedor de datos del cliente si estaba visible
  const clientDataContainer = document.getElementById('client-data-container');
  if (clientDataContainer) {
    clientDataContainer.style.display = "none";
  }
  
  // Mostrar contenedor de horarios con animación
  contenedorHorarios.style.display = "block";
  contenedorHorarios.style.opacity = "0";
  contenedorHorarios.style.transform = "translateY(20px)";
  
  setTimeout(() => {
    contenedorHorarios.style.transition = "all 0.5s ease";
    contenedorHorarios.style.opacity = "1";
    contenedorHorarios.style.transform = "translateY(0)";
  }, 100);
  
  // Generar botones de horarios con animación escalonada
  horasDisponibles.forEach((hora, index) => {
    const btn = document.createElement("button");
    btn.className = "hora-btn";
    btn.textContent = hora;
    btn.style.opacity = "0";
    btn.style.transform = "translateY(20px)";
    btn.setAttribute("aria-label", `Seleccionar horario ${hora}`);
    
    // Animación de aparición escalonada
    setTimeout(() => {
      btn.style.transition = "all 0.3s ease";
      btn.style.opacity = "1";
      btn.style.transform = "translateY(0)";
    }, index * 50);
    
    // Efectos hover mejorados
    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "translateY(-3px) scale(1.05)";
      btn.style.boxShadow = "0 8px 25px rgba(0,0,0,0.3)";
    });
    
    btn.addEventListener("mouseleave", () => {
      if (!btn.classList.contains("selected")) {
        btn.style.transform = "translateY(0) scale(1)";
        btn.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
      }
    });
    
    btn.addEventListener("click", () => {
      seleccionarHora(btn, hora);
    });
    
    containerHoras.appendChild(btn);
  });
}

// Función mejorada para seleccionar una hora
function seleccionarHora(btn, hora) {
  selectedHour = hora;
  addHapticFeedback();
  
  // Quitar clase selected de todos los botones con animación
  document.querySelectorAll(".hora-btn").forEach(b => {
    b.classList.remove("selected");
    if (b !== btn) {
      b.style.transform = 'scale(1)';
    }
  });
  
  // Agregar efecto de selección
  btn.classList.add("selected");
  btn.style.transform = 'scale(1.08)';
  
  // Mostrar contenedor de datos del cliente con animación
  setTimeout(() => {
    const clientDataContainer = document.getElementById('client-data-container');
    const selectedInfoText = document.getElementById('selected-info-text');
    
    // Actualizar texto informativo
    selectedInfoText.textContent = `📅 ${selectedDate} a las ${selectedHour} ⏰`;
    
    // Mostrar contenedor con animación
    clientDataContainer.style.display = "block";
    clientDataContainer.style.opacity = "0";
    clientDataContainer.style.transform = "translateY(20px)";
    
    setTimeout(() => {
      clientDataContainer.style.transition = "all 0.5s ease";
      clientDataContainer.style.opacity = "1";
      clientDataContainer.style.transform = "translateY(0)";
      
      // Agregar animación a cada campo del formulario
      const campos = clientDataContainer.querySelectorAll('input, select, textarea, button');
      campos.forEach((campo, index) => {
        campo.style.opacity = "0";
        campo.style.transform = "translateX(-20px)";
        setTimeout(() => {
          campo.style.transition = "all 0.3s ease";
          campo.style.opacity = "1";
          campo.style.transform = "translateX(0)";
        }, index * 100);
      });
      
      // Llamar a checkFormCompletion después de mostrar el formulario
      setTimeout(() => {
        checkFormCompletion();
      }, 500);
    }, 100);
  }, 300);
}

// Función para mostrar alertas personalizadas
function showCustomAlert(message, type) {
  const alertDiv = document.createElement('div');
  alertDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 20px;
    background: ${type === 'success' ? 'linear-gradient(145deg, #28a745, #20c44e)' : 'linear-gradient(145deg, #dc3545, #c82333)'};
    color: white;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 10000;
    font-weight: bold;
    font-size: 16px;
    max-width: 300px;
    animation: slideIn 0.5s ease-out;
  `;
  
  alertDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 20px;">${type === 'success' ? '✅' : '❌'}</span>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(alertDiv);
  
  // Auto-remover después de 4 segundos
  setTimeout(() => {
    alertDiv.style.animation = 'slideOut 0.5s ease-in';
    setTimeout(() => {
      document.body.removeChild(alertDiv);
    }, 500);
  }, 4000);
}

// Inicializar efectos cuando se carga la página
window.addEventListener('load', function() {
  // Crear cursor personalizado
  createCustomCursor();
  
  // Agregar efectos de parallax suave
  window.addEventListener('scroll', function() {
    const scrolled = window.pageYOffset;
    const parallax = document.querySelector('body::before');
    if (parallax) {
      document.body.style.backgroundPositionY = scrolled * 0.5 + 'px';
    }
  });
  
  // Precargar sonidos y animaciones
  console.log('🚀 DLS BARBER - Página cargada con efectos mejorados!');
  
  // ===== MANEJAR EL BOTÓN DE CONFIRMACIÓN DE CITA =====
  const confirmBtn = document.getElementById('confirm-appointment');
  console.log('🔍 Botón de confirmación encontrado:', confirmBtn);
  
  // Agregar listeners para verificar completitud del formulario
  ['name', 'phone', 'barber'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', checkFormCompletion);
      element.addEventListener('change', checkFormCompletion);
    }
  });
  
  // Manejar clic del botón de confirmación
  if (confirmBtn) {
    console.log('🔗 Agregando event listener al botón de confirmación');
    confirmBtn.addEventListener('click', function() {
      console.log('🖱️ Botón de confirmación clickeado');
      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const barber = document.getElementById('barber').value;
      const notes = document.getElementById('notes').value.trim();
      
      console.log('📋 Datos del formulario:', { name, phone, barber, notes, selectedDate, selectedHour });
      
      // Validación final
      if (!name || !phone || !barber || !selectedDate || !selectedHour) {
        console.log('❌ Validación fallida - campos faltantes');
        showCustomAlert("Por favor, completá todos los campos requeridos", "error");
        addHapticFeedback();
        return;
      }
      
      console.log('✅ Validación exitosa - procesando reserva');
      
      // Efecto de carga en el botón
      const originalText = confirmBtn.textContent;
      confirmBtn.style.background = 'linear-gradient(145deg, #dc2626, #991b1b)';
      confirmBtn.textContent = '⏳ Confirmando...';
      confirmBtn.disabled = true;
      
      // Simular procesamiento
      setTimeout(() => {
        // Construir mensaje para WhatsApp
        const mensaje = `🔥 NUEVA RESERVA - DLS BARBER 💈
        
📅 Fecha: ${selectedDate}
⏰ Hora: ${selectedHour}
👤 Cliente: ${name}
✂️ Barbero: ${barber}
📱 Teléfono: ${phone}
📝 Notas: ${notes || "Ninguna"}

¡Gracias por elegir DLS BARBER! 🚀`;
        
        const urlWhatsapp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
        
        // Mostrar mensaje de éxito
        showCustomAlert("¡Reserva confirmada! Redirigiendo a WhatsApp...", "success");
        
        setTimeout(() => {
          window.open(urlWhatsapp, "_blank");
          
          // Restaurar botón
          confirmBtn.style.background = 'linear-gradient(145deg, var(--color-primary-red), var(--color-dark-red))';
          confirmBtn.textContent = originalText;
          confirmBtn.disabled = false;
        }, 1500);
        
      }, 1000);
    });
  } else {
    console.error('❌ Error: No se encontró el botón de confirmación');
  }
  
  console.log('🚀 Event listeners configurados para el formulario de reserva');
});

}); // Cierre del DOMContentLoaded
