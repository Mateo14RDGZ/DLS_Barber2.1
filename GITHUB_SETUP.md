# 🚀 Comandos para conectar con GitHub

# Una vez que hayas creado el repositorio en GitHub, ejecuta:

# 1. Conectar con el repositorio remoto

git remote add origin https://github.com/TU-USUARIO/dls-barber-system.git

# 2. Verificar la conexión

git remote -v

# 3. Subir el código

git branch -M main
git push -u origin main

# 4. Verificar que se subió correctamente

# Ve a tu repositorio en GitHub y deberías ver todos los archivos

# 🎯 Siguiente paso: Configurar Vercel

# 1. Ve a vercel.com

# 2. Conecta tu cuenta de GitHub

# 3. Importa el repositorio recién creado

# 4. Configura las variables de entorno:

# - POSTGRES_URL (de Vercel Postgres)

# - JWT_SECRET (genera uno seguro)

# - NODE_ENV=production

# 📝 Notas importantes:

# - El archivo vercel.json ya está configurado

# - La migración de base de datos es automática

# - Todas las funcionalidades están preservadas
