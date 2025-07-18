# 💈 DLS Barber - Sistema de Reservas

<div align="center">
  <img src="dls-logo-updated.png" alt="DLS Barber Logo" width="200"/>
</div>

<div align="center">

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green?logo=node.js)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue?logo=postgresql)](https://postgresql.org)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

</div>

## 🚀 Descripción

Sistema web completo para gestión de reservas de barbería desarrollado con tecnologías modernas. Incluye panel administrativo, sistema de autenticación y gestión completa de citas.

## ✨ Características

- 🔐 **Sistema de autenticación** completo con JWT
- 📅 **Gestión de reservas** con calendario interactivo
- 👨‍💼 **Panel administrativo** para gestionar citas y usuarios
- 📱 **Diseño responsive** optimizado para móvil y desktop
- 🗄️ **Base de datos dual** (SQLite desarrollo, PostgreSQL producción)
- 🔄 **Deploy automático** con Vercel
- ⚡ **API REST** completa y documentada

## 🛠️ Tecnologías

### Frontend
- **HTML5** + **CSS3** + **JavaScript ES6**
- **Responsive Design** con Flexbox y Grid
- **Fetch API** para comunicación con backend

### Backend
- **Node.js** + **Express.js**
- **JWT** para autenticación
- **bcryptjs** para hash de contraseñas
- **CORS** configurado para desarrollo y producción

### Base de Datos
- **SQLite** para desarrollo local
- **PostgreSQL** para producción (Vercel Postgres)
- **Migración automática** según entorno

### DevOps
- **Vercel** para hosting y deployment
- **Git** para control de versiones
- **Environment Variables** para configuración

## 🏗️ Estructura del Proyecto

```
DLS Barber/
├── 📁 backend/
│   ├── 📁 config/
│   │   ├── database.js          # Configuración dual de BD
│   │   ├── database_sqlite.js   # Configuración SQLite
│   │   └── database_postgres.js # Configuración PostgreSQL
│   ├── 📁 middleware/
│   │   └── auth.js              # Middleware de autenticación
│   ├── 📁 routes/
│   │   ├── auth.js              # Rutas de autenticación
│   │   ├── reservations.js      # Rutas de reservas
│   │   └── general.js           # Rutas generales
│   ├── 📁 database/
│   │   └── dls_barber.db        # Base de datos SQLite
│   ├── server.js                # Servidor principal
│   ├── migrate.js               # Script de migración
│   └── package.json             # Dependencias backend
├── 📄 Frontend Files
│   ├── index.html               # Página principal
│   ├── login.html               # Página de login
│   ├── register.html            # Página de registro
│   ├── dashboard.html           # Panel de usuario
│   ├── admin.html               # Panel administrativo
│   ├── styles.css               # Estilos principales
│   ├── script.js                # Scripts principales
│   ├── auth.js                  # Autenticación frontend
│   ├── dashboard.js             # Lógica del dashboard
│   └── admin.js                 # Lógica del admin
├── vercel.json                  # Configuración Vercel
├── .gitignore                   # Archivos ignorados
├── README.md                    # Este archivo
└── MIGRATION_GUIDE.md           # Guía de migración
```

## 🚀 Instalación y Uso

### Prerrequisitos
- Node.js 16 o superior
- Git
- Cuenta en Vercel (para producción)

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/dls-barber.git
cd dls-barber
```

### 2. Instalar dependencias
```bash
cd backend
npm install
```

### 3. Configurar variables de entorno
```bash
cp backend/.env.example backend/.env
# Editar .env con tus configuraciones
```

### 4. Iniciar en desarrollo
```bash
cd backend
npm start
```

El servidor estará disponible en `http://localhost:5000`

## 🌐 Deploy en Producción

### Opción 1: Deploy automático con Vercel (Recomendado)

1. **Conectar con GitHub:**
   - Fork o clona este repositorio
   - Ve a [vercel.com](https://vercel.com)
   - Conecta tu repositorio

2. **Configurar base de datos:**
   ```bash
   # Crear Vercel Postgres
   vercel postgres create dls-barber-db
   vercel postgres connect dls-barber-db
   ```

3. **Configurar variables de entorno en Vercel:**
   ```
   POSTGRES_URL=tu_url_postgres
   JWT_SECRET=tu_secret_seguro
   NODE_ENV=production
   ```

4. **Deploy:**
   ```bash
   vercel --prod
   ```

### Opción 2: Deploy manual

Ver [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) para instrucciones detalladas.

## 📊 Funcionalidades

### 👤 Sistema de Usuarios
- ✅ Registro de nuevos usuarios
- ✅ Login/logout seguro
- ✅ Gestión de perfiles
- ✅ Roles (usuario/admin)

### 📅 Gestión de Reservas
- ✅ Crear reservas con formulario intuitivo
- ✅ Ver historial de citas
- ✅ Cancelar reservas
- ✅ Estados de reserva (pendiente, confirmada, completada)

### 👨‍💼 Panel Administrativo
- ✅ Dashboard con estadísticas
- ✅ Gestión completa de reservas
- ✅ Administración de usuarios
- ✅ Configuración de horarios
- ✅ Reportes y análisis

### 🔧 Características Técnicas
- ✅ Autenticación JWT
- ✅ Validación de datos
- ✅ Manejo de errores
- ✅ Rate limiting
- ✅ Seguridad con Helmet
- ✅ CORS configurado

## 🔒 Seguridad

- **Autenticación JWT** con tokens seguros
- **Hash de contraseñas** con bcryptjs
- **Validación de entrada** en todas las rutas
- **Rate limiting** para prevenir ataques
- **CORS** configurado correctamente
- **Headers de seguridad** con Helmet

## 🤝 Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 👨‍💻 Desarrollador

Desarrollado con ❤️ por [Tu Nombre]

## 📞 Contacto

- 💼 LinkedIn: [Tu LinkedIn]
- 📧 Email: [tu-email@ejemplo.com]
- 🐱 GitHub: [Tu GitHub]

## 🙏 Agradecimientos

- Gracias a la comunidad de Node.js
- Vercel por el excelente hosting
- Todos los contribuidores

---

<div align="center">
  <strong>⭐ Si este proyecto te fue útil, ¡dale una estrella! ⭐</strong>
</div>
