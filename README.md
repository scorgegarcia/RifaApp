# Sistema de Rifas

Una aplicación web completa para gestionar rifas con React, Express.js y MariaDB.

## Características

- 🎯 **Gestión de Rifas**: Crear, editar y administrar rifas
- 👥 **Sistema de Usuarios**: Registro, login y perfiles de usuario
- 🛡️ **Panel de Administración**: Gestión completa del sistema
- 💳 **Pagos con PayPal**: Integración completa de pagos
- 📱 **Responsive**: Diseño adaptable a todos los dispositivos
- ⚙️ **Setup Automático**: Configuración inicial guiada

## Configuración Inicial

### Requisitos Previos

- Node.js (v16 o superior)
- MariaDB/MySQL (v10.4 o superior)
- npm o yarn

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/scorgegarcia/RifaApp.git
   cd RifaApp
   ```

2. **Instalar dependencias**
   ```bash
   npm run install:all
   ```

3. **Iniciar la aplicación**
   ```bash
   npm run dev
   ```

4. **Configuración inicial**
   - Abre tu navegador en `http://localhost:3000`
   - La aplicación te redirigirá automáticamente a `/setup`
   - Sigue el asistente de configuración paso a paso:

### Asistente de Setup

#### Paso 1: Conexión al Servidor MariaDB
- **Servidor**: IP o hostname de tu servidor MariaDB (ej: `localhost`)
- **Puerto**: Puerto del servidor (por defecto: `3306`)
- **Usuario Root**: Usuario administrador de MariaDB
- **Contraseña Root**: Contraseña del usuario administrador

> ⚠️ **Importante**: Las credenciales de root solo se usan para crear la base de datos y el usuario. No se guardan en el sistema.

#### Paso 2: Configuración de Base de Datos
- **Nombre de la Base de Datos**: Nombre para tu base de datos (ej: `rifa_system`)
- **Usuario de la Aplicación**: Usuario que creará el sistema (ej: `rifa_user`)
- **Contraseña del Usuario**: Contraseña segura para el usuario

El sistema:
- Detectará si la base de datos ya existe
- Creará la base de datos si no existe
- Creará un usuario específico con permisos solo para esa base de datos
- Configurará automáticamente las tablas necesarias

#### Paso 3: Finalización
- Verificación de la configuración
- Creación de tablas automática
- Redirección a la aplicación principal

## Estructura del Proyecto

```
rifa-system/
├── frontend/                 # Aplicación React
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   ├── pages/          # Páginas de la aplicación
│   │   ├── contexts/       # Contextos de React
│   │   └── ...
│   └── ...
├── routes/                  # Rutas del API
├── middleware/             # Middlewares de Express
├── config/                 # Configuración de la aplicación
├── uploads/               # Archivos subidos
├── .env                   # Variables de entorno
└── server.js             # Servidor principal
```

## Scripts Disponibles

- `npm run dev` - Inicia frontend y backend en modo desarrollo
- `npm run dev:backend` - Solo el servidor backend
- `npm run dev:frontend` - Solo el frontend
- `npm run build` - Construye la aplicación para producción
- `npm start` - Inicia el servidor en modo producción
- `npm run setup` - Ejecuta el script de configuración de base de datos

## Configuración de PayPal

Después del setup inicial, configura PayPal editando el archivo `.env`:

```env
PAYPAL_CLIENT_ID=tu_client_id_aqui
PAYPAL_CLIENT_SECRET=tu_client_secret_aqui
PAYPAL_MODE=sandbox  # o 'live' para producción
```

## Funcionalidades

### Para Usuarios
- Registro y login
- Ver rifas disponibles
- Comprar boletos
- Gestionar perfil
- Historial de compras

### Para Administradores
- Dashboard con estadísticas
- Gestión de usuarios
- Gestión de rifas
- Control de pagos
- Reportes del sistema

## Tecnologías Utilizadas

### Frontend
- React 18
- React Router DOM
- Tailwind CSS
- Axios
- React Hook Form
- React Hot Toast
- Lucide React (iconos)

### Backend
- Express.js
- MariaDB/MySQL
- JWT para autenticación
- Multer para subida de archivos
- PayPal REST SDK
- Helmet para seguridad
- Rate limiting

## Seguridad

- Autenticación JWT
- Validación de datos
- Rate limiting
- Helmet para headers de seguridad
- Sanitización de inputs
- Protección CSRF

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## Soporte

Si tienes problemas con la configuración:

1. Verifica que MariaDB esté ejecutándose
2. Confirma las credenciales de acceso
3. Revisa los logs del servidor en la consola
4. Si persisten los problemas, puedes reconfigurar visitando `/setup`

---

**¡Disfruta creando rifas con este sistema!** 🎉
