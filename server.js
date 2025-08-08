const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { checkDatabaseConnection, initializeDatabase } = require('./config/database');
const authRoutes = require('./routes/auth');
const rifaRoutes = require('./routes/rifas');
const ticketRoutes = require('./routes/tickets');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const configRoutes = require('./routes/config');
const setupRoutes = require('./routes/setup');
const checkSetup = require('./middleware/setup');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de seguridad (configuración para desarrollo)
if (process.env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.paypal.com", "https://api.sandbox.paypal.com"],
        fontSrc: ["'self'", "https:", "data:"]
      }
    }
  }));
} else {
  // Configuración más permisiva para desarrollo
  app.use(helmet({
    contentSecurityPolicy: false,
    hsts: false
  }));
}

// Rate limiting (configuración diferente para desarrollo y producción)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 para desarrollo, 100 para producción
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Middleware básico
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));





// Servir archivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas de setup (sin middleware de verificación)
app.use('/api/setup', setupRoutes);

// Servir archivos estáticos específicos (CSS, JS, imágenes) - no HTML
if (process.env.NODE_ENV !== 'production') {
  app.use('/assets', express.static(path.join(__dirname, 'frontend/dist/assets'), {
    setHeaders: (res, path) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Surrogate-Control', 'no-store');
    }
  }));
  app.use('/vite.svg', express.static(path.join(__dirname, 'frontend/dist/vite.svg'), {
    setHeaders: (res, path) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Surrogate-Control', 'no-store');
    }
  }));
} else {
  app.use('/assets', express.static(path.join(__dirname, 'frontend/dist/assets')));
  app.use('/vite.svg', express.static(path.join(__dirname, 'frontend/dist/vite.svg')));
}

// Ruta específica para setup (antes del middleware)
app.get('/setup', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// Middleware de verificación de setup (aplicado a rutas de navegación)
app.use(checkSetup);

// Rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/rifas', rifaRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);

// Ruta catch-all para React Router (después del middleware)
app.get('*', (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
  }
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
  });
});

// Función para inicializar la aplicación
async function startServer() {
  try {
    // Verificar si el setup está completado
    const fs = require('fs');
    const envPath = path.join(__dirname, '.env');
    let setupCompleted = false;
    
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      setupCompleted = envContent.includes('SETUP_COMPLETED=true');
    } catch (error) {
      console.log('⚠️ Archivo .env no encontrado, se requiere configuración inicial');
    }
    
    if (setupCompleted) {
      try {
        // Verificar conexión a la base de datos
        await checkDatabaseConnection();
        console.log('✅ Conexión a la base de datos establecida');
        
        // Inicializar base de datos si es necesario
        await initializeDatabase();
        console.log('✅ Base de datos inicializada');
      } catch (error) {
        console.error('❌ Error de base de datos:', error.message);
        console.log('🔧 Puede que necesites reconfigurar la base de datos en /setup');
      }
    } else {
      console.log('🔧 Setup pendiente - La aplicación redirigirá a /setup');
    }
    
    // Crear directorio de uploads si no existe
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Directorio de uploads creado');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
      console.log(`📱 Frontend disponible en http://localhost:${PORT}`);
      console.log(`🔧 API disponible en http://localhost:${PORT}/api`);
      if (!setupCompleted) {
        console.log(`⚙️ Configuración inicial en http://localhost:${PORT}/setup`);
      }
    });
  } catch (error) {
    console.error('❌ Error al inicializar el servidor:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;