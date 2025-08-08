const express = require('express');
const { body, validationResult } = require('express-validator');
const { getConnection } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

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

// Aplicar middleware de autenticación y admin para las siguientes rutas
router.use(authenticateToken);
router.use(isAdmin);

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

module.exports = router;