# 🚀 Guía de Migración a Vercel

## 📋 Resumen de la migración

Tu aplicación ahora está **100% lista para producción** con soporte dual:

- ✅ **SQLite** para desarrollo local
- ✅ **PostgreSQL** para producción en Vercel

## 🔄 Cómo funciona la migración automática

### **En desarrollo local (sin POSTGRES_URL)**

```
🗃️ Usando SQLite para desarrollo local
🔧 Inicializando servidor con SQLite...
✅ Base de datos: SQLite
```

### **En producción Vercel (con POSTGRES_URL)**

```
🐘 Usando PostgreSQL para la base de datos
🔧 Inicializando servidor con PostgreSQL...
✅ Base de datos: PostgreSQL
```

## 🛠️ Pasos para desplegar en Vercel

### **1. Configurar base de datos PostgreSQL**

#### **Opción A: Vercel Postgres (Recomendado)**

```bash
# Instalar Vercel CLI
npm install -g vercel

# Crear base de datos
vercel postgres create dls-barber-db

# Conectar al proyecto
vercel postgres connect dls-barber-db
```

#### **Opción B: Supabase (Alternativo)**

1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta gratuita
3. Crea nuevo proyecto
4. Copia la URL de conexión PostgreSQL

### **2. Configurar variables de entorno en Vercel**

En el dashboard de Vercel, configura:

```
POSTGRES_URL=postgresql://user:pass@host:port/db
JWT_SECRET=tu_secret_super_seguro
NODE_ENV=production
```

### **3. Migrar datos de SQLite a PostgreSQL**

```bash
# Configurar POSTGRES_URL en .env
echo "POSTGRES_URL=tu_url_postgres" >> backend/.env

# Ejecutar migración
cd backend
node migrate.js
```

### **4. Desplegar en Vercel**

```bash
# Conectar repositorio con Vercel
vercel

# Deploy a producción
vercel --prod
```

## 🔧 Cambios técnicos realizados

### **✅ Configuración de base de datos dual**

- `database.js` detecta automáticamente el entorno
- `usePostgreSQL` cuando hay `POSTGRES_URL` o `NODE_ENV=production`
- `useSQLite` en desarrollo local

### **✅ Compatibilidad de queries**

- Conversión automática de `password_hash` → `password`
- Queries compatibles entre SQLite y PostgreSQL
- Manejo de `RETURNING id` para INSERT

### **✅ Inicialización automática**

- PostgreSQL se inicializa automáticamente en primer arranque
- Datos iniciales se insertan automáticamente
- Manejo de errores robusto

### **✅ Archivos de configuración**

- `vercel.json` - Configuración de despliegue
- `.env.example` - Variables de entorno de ejemplo
- `migrate.js` - Script de migración de datos

## 📊 Estado actual

### **✅ Funcionalidades preservadas**

- ✅ Sistema de autenticación
- ✅ Gestión de reservas
- ✅ Panel administrativo
- ✅ API completa
- ✅ Datos existentes

### **✅ Mejoras añadidas**

- ✅ Soporte para producción
- ✅ Base de datos escalable
- ✅ Deploy automático
- ✅ Variables de entorno seguras

## 🎯 Próximos pasos

1. **Crear repositorio en GitHub**
2. **Configurar Vercel Postgres**
3. **Ejecutar migración de datos**
4. **Deploy a producción**
5. **Configurar dominio personalizado** (opcional)

## 🛟 Solución de problemas

### **Si aparece error de conexión a PostgreSQL:**

```bash
# Verificar variables de entorno
echo $POSTGRES_URL

# Probar conexión manual
psql $POSTGRES_URL
```

### **Si hay conflictos en migración:**

```bash
# Limpiar tablas PostgreSQL
psql $POSTGRES_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Re-ejecutar migración
node migrate.js
```

### **Para volver a SQLite en desarrollo:**

```bash
# Remover/comentar POSTGRES_URL del .env local
# El sistema automáticamente usará SQLite
```

## 📞 Contacto

Si necesitas ayuda con la migración, tienes toda la documentación aquí y el código está preparado para un deploy sin problemas.
