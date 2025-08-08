const express = require('express');
const { body, validationResult } = require('express-validator');
const { getConnection } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Ruta pública para obtener configuraciones básicas
router.get('/public', async (req, res) => {
  try {
    const conn = await getConnection();
    const [configs] = await conn.execute(
      "SELECT config_key, config_value FROM config WHERE config_key IN ('app_title', 'app_logo_url')"
    );
    
    const configObj = {};
    configs.forEach(config => {
      configObj[config.config_key] = config.config_value;
    });
    
    // Agregar configuración de PayPal para el frontend
    configObj.paypal_client_id = process.env.PAYPAL_CLIENT_ID || 'sb';
    configObj.paypal_mode = process.env.PAYPAL_MODE || 'sandbox';
    
    res.json({
      success: true,
      data: configObj
    });
  } catch (error) {
    console.error('Error al obtener configuraciones públicas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Aplicar middleware de autenticación y autorización para rutas protegidas
router.use(authenticateToken);
router.use(isAdmin);

// Actualizar variables de entorno (solo admin con verificación de contraseña)
router.put('/env', [
  body('password').notEmpty().withMessage('La contraseña es requerida'),
  body('envVars').isObject().withMessage('Las variables de entorno deben ser un objeto')
], async (req, res) => {
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { password, envVars } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Verificar contraseña del usuario
    const conn = await getConnection();
    const [users] = await conn.execute(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const isValidPassword = await bcrypt.compare(password, users[0].password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña incorrecta'
      });
    }

    const allowedVars = [
      'PAYPAL_CLIENT_ID',
      'PAYPAL_CLIENT_SECRET', 
      'PAYPAL_MODE',
      'DB_HOST',
      'DB_PORT',
      'DB_USER',
      'DB_PASSWORD',
      'DB_NAME',
      'JWT_SECRET',
      'JWT_EXPIRES_IN',
      'PORT',
      'NODE_ENV',
      'IMGBB_API_KEY'
    ];

    // Validar que solo se actualicen variables permitidas
    const invalidVars = Object.keys(envVars).filter(key => !allowedVars.includes(key));
    if (invalidVars.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Variables no permitidas: ${invalidVars.join(', ')}`
      });
    }

    // Leer archivo .env actual
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    // Actualizar líneas existentes y agregar nuevas
    const updatedLines = [];
    const processedVars = new Set();
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key] = trimmedLine.split('=');
        if (allowedVars.includes(key) && envVars.hasOwnProperty(key)) {
          updatedLines.push(`${key}=${envVars[key]}`);
          processedVars.add(key);
        } else {
          updatedLines.push(line);
        }
      } else {
        updatedLines.push(line);
      }
    });
    
    // Agregar variables nuevas que no existían
    Object.keys(envVars).forEach(key => {
      if (!processedVars.has(key)) {
        updatedLines.push(`${key}=${envVars[key]}`);
      }
    });
    
    // Escribir archivo .env actualizado
    fs.writeFileSync(envPath, updatedLines.join('\n'));

    res.json({
      success: true,
      message: 'Variables de entorno actualizadas exitosamente. Reinicia el servidor para aplicar los cambios.'
    });
  } catch (error) {
    console.error('Error al actualizar variables de entorno:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener todas las configuraciones (solo admin)
router.get('/', async (req, res) => {
  try {
    const conn = await getConnection();
    const [configs] = await conn.execute(
      "SELECT * FROM config ORDER BY config_key"
    );
    
    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error('Error al obtener configuraciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});



// Actualizar configuración (solo admin)
router.put('/:key', [
  body('value').exists().withMessage('El valor es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { key } = req.params;
    const { value } = req.body;
    
    const conn = await getConnection();
    
    // Verificar si la configuración existe
    const [existing] = await conn.execute(
      "SELECT id FROM config WHERE config_key = ?",
      [key]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }
    
    // Actualizar la configuración
    await conn.execute(
      "UPDATE config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?",
      [value, key]
    );
    
    res.json({
      success: true,
      message: 'Configuración actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Crear nueva configuración (solo admin)
router.post('/', [
  body('config_key').notEmpty().withMessage('La clave es requerida'),
  body('config_value').notEmpty().withMessage('El valor es requerido'),
  body('description').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { config_key, config_value, description } = req.body;
    
    const conn = await getConnection();
    
    // Verificar si la configuración ya existe
    const [existing] = await conn.execute(
      "SELECT id FROM config WHERE config_key = ?",
      [config_key]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'La configuración ya existe'
      });
    }
    
    // Crear la configuración
    await conn.execute(
      "INSERT INTO config (config_key, config_value, description) VALUES (?, ?, ?)",
      [config_key, config_value, description || null]
    );
    
    res.status(201).json({
      success: true,
      message: 'Configuración creada exitosamente'
    });
  } catch (error) {
    console.error('Error al crear configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Eliminar configuración (solo admin)
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const conn = await getConnection();
    
    // Verificar si la configuración existe
    const [existing] = await conn.execute(
      "SELECT id FROM config WHERE config_key = ?",
      [key]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }
    
    // Eliminar la configuración
    await conn.execute(
      "DELETE FROM config WHERE config_key = ?",
      [key]
    );
    
    res.json({
      success: true,
      message: 'Configuración eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener variables de entorno (solo admin con verificación de contraseña)
router.post('/env', [
  body('password').notEmpty().withMessage('La contraseña es requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { password } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Verificar contraseña del usuario
    const conn = await getConnection();
    const [users] = await conn.execute(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const isValidPassword = await bcrypt.compare(password, users[0].password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña incorrecta'
      });
    }

    // Leer variables de entorno del archivo .env
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const envVars = {};
    const lines = envContent.split('\n');
    
    const allowedVars = [
      'PAYPAL_CLIENT_ID',
      'PAYPAL_CLIENT_SECRET', 
      'PAYPAL_MODE',
      'DB_HOST',
      'DB_PORT',
      'DB_USER',
      'DB_PASSWORD',
      'DB_NAME',
      'JWT_SECRET',
      'JWT_EXPIRES_IN',
      'PORT',
      'NODE_ENV',
      'IMGBB_API_KEY'
    ];
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=');
        if (allowedVars.includes(key)) {
          envVars[key] = value || '';
        }
      }
    });

    res.json({
      success: true,
      data: envVars
    });
  } catch (error) {
    console.error('Error al obtener variables de entorno:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;