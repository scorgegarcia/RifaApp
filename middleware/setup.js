const fs = require('fs');
const path = require('path');

// Middleware para verificar si la aplicación necesita configuración inicial
const checkSetup = (req, res, next) => {
  // Rutas que no requieren verificación de setup
  const excludedPaths = ['/api/setup', '/setup', '/api/setup/test-connection', '/api/setup/create-database', '/api/payment/success', '/api/payment/cancel'];
  
  if (excludedPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  try {
    // Leer el archivo .env para verificar si el setup está completado
    const envPath = path.join(__dirname, '../.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Verificar si SETUP_COMPLETED está en true
    const setupCompleted = envContent.includes('SETUP_COMPLETED=true');
    
    if (!setupCompleted) {
      // Si es una petición API, devolver error JSON
      if (req.path.startsWith('/api/')) {
        return res.status(503).json({
          error: 'Setup requerido',
          message: 'La aplicación necesita ser configurada antes de usar.',
          setupRequired: true
        });
      }
      
      // Si es una petición web, redirigir al setup
      return res.redirect('/setup');
    }
    
    next();
  } catch (error) {
    console.error('Error verificando estado del setup:', error);
    
    // Si hay error leyendo .env, asumir que necesita setup
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({
        error: 'Setup requerido',
        message: 'La aplicación necesita ser configurada.',
        setupRequired: true
      });
    }
    
    return res.redirect('/setup');
  }
};

module.exports = checkSetup;