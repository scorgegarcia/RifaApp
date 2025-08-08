const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Token de acceso requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario aún existe y está activo
    const conn = await getConnection();
    const [users] = await conn.execute(
      'SELECT id, email, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0 || !users[0].is_active) {
      return res.status(401).json({ message: 'Token inválido o usuario inactivo' });
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: users[0].role
    };
    
    req.user = {
      userId: decoded.userId,
      email: users[0].email,
      role: users[0].role
    };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    
    console.error('Error en autenticación:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Middleware para verificar rol de administrador
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de administrador' });
  }
  next();
};

// Middleware para verificar que el usuario es propietario del recurso o admin
const isOwnerOrAdmin = (resourceUserIdField = 'created_by') => {
  return async (req, res, next) => {
    try {
      // Si es admin, permitir acceso
      if (req.user.role === 'admin') {
        return next();
      }

      // Obtener el ID del recurso desde los parámetros
      const resourceId = req.params.id;
      if (!resourceId) {
        return res.status(400).json({ message: 'ID del recurso requerido' });
      }

      // Verificar propiedad del recurso (esto se debe personalizar según la tabla)
      const conn = await getConnection();
      let query, params;
      
      // Determinar la tabla basada en la ruta
      if (req.baseUrl.includes('/rifas')) {
        query = `SELECT ${resourceUserIdField} FROM rifas WHERE id = ?`;
        params = [resourceId];
      } else {
        return res.status(400).json({ message: 'Tipo de recurso no soportado' });
      }

      const [rows] = await conn.execute(query, params);
      
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Recurso no encontrado' });
      }



      // Convertir ambos a números para comparación
      const resourceUserId = parseInt(rows[0][resourceUserIdField]);
      const requestUserId = parseInt(req.user.userId);
      
      if (resourceUserId !== requestUserId) {
        console.log('Access denied - user IDs do not match');
        return res.status(403).json({ message: 'No tienes permisos para acceder a este recurso' });
      }
      
      console.log('Access granted - user is owner');

      next();
    } catch (error) {
      console.error('Error en verificación de propiedad:', error);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  };
};

// Middleware opcional de autenticación (para rutas públicas que pueden beneficiarse de info del usuario)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const conn = await getConnection();
      const [users] = await conn.execute(
        'SELECT id, email, role, is_active FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (users.length > 0 && users[0].is_active) {
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: users[0].role
        };
      }
    }
    
    next();
  } catch (error) {
    // En caso de error, simplemente continuar sin usuario autenticado
    next();
  }
};

module.exports = {
  authenticateToken,
  isAdmin,
  isOwnerOrAdmin,
  optionalAuth
};