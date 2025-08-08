const express = require('express');
const { body, validationResult } = require('express-validator');
const { getConnection } = require('../config/database');
const { authenticateToken, isOwnerOrAdmin, isAdmin, optionalAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const bcrypt = require('bcrypt');

const router = express.Router();

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/rifas');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'rifa-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB por defecto
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Obtener todas las rifas (público)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status = 'active', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const conn = await getConnection();
    
    // Query base
    let query = `
      SELECT r.*, u.name as creator_name,
             (SELECT COUNT(*) FROM tickets t WHERE t.rifa_id = r.id AND t.payment_status = 'completed') as sold_tickets
      FROM rifas r
      JOIN users u ON r.created_by = u.id
    `;
    
    let params = [];
    
    if (status !== 'all') {
      query += ' WHERE r.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [rifas] = await conn.execute(query, params);
    
    // Obtener total de rifas para paginación
    let countQuery = 'SELECT COUNT(*) as total FROM rifas r';
    let countParams = [];
    
    if (status !== 'all') {
      countQuery += ' WHERE status = ?';
      countParams.push(status);
    }
    
    const [countResult] = await conn.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    console.log('Rifas encontradas:', rifas.length);
    console.log('Total rifas:', total);
    
    res.json({
      rifas,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('=== ERROR EN /my-rifas ===');
    console.error('Error completo:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener rifas del usuario autenticado
router.get('/my-rifas', authenticateToken, async (req, res) => {
  try {
    console.log('=== ENDPOINT /my-rifas ===');
    console.log('User ID:', req.user.userId);
    console.log('Query params:', req.query);
    
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const conn = await getConnection();
    
    const [rifas] = await conn.execute(`
      SELECT r.*,
             (SELECT COUNT(*) FROM tickets t WHERE t.rifa_id = r.id AND t.payment_status = 'completed') as sold_tickets
      FROM rifas r
      WHERE r.created_by = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.userId, parseInt(limit), parseInt(offset)]);
    
    const [countResult] = await conn.execute(
      'SELECT COUNT(*) as total FROM rifas WHERE created_by = ?',
      [req.user.userId]
    );
    
    const total = countResult[0].total;
    
    console.log('Rifas encontradas:', rifas.length);
    console.log('Total rifas:', total);
    
    res.json({
      rifas,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('=== ERROR EN /my-rifas ===');
    console.error('Error completo:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener una rifa específica (público)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const conn = await getConnection();
    
    // Obtener información de la rifa
    const [rifas] = await conn.execute(`
      SELECT r.*, u.name as creator_name,
             (SELECT COUNT(*) FROM tickets t WHERE t.rifa_id = r.id AND t.payment_status = 'completed') as sold_tickets
      FROM rifas r
      JOIN users u ON r.created_by = u.id
      WHERE r.id = ?
    `, [id]);
    
    if (rifas.length === 0) {
      return res.status(404).json({ message: 'Rifa no encontrada' });
    }
    
    const rifa = rifas[0];
    

    
    // Si el usuario está autenticado y es el creador, incluir información adicional
    if (req.user && (req.user.userId === rifa.created_by || req.user.role === 'admin')) {
      // Obtener tickets vendidos
      const [tickets] = await conn.execute(
        'SELECT ticket_number, buyer_name, buyer_email, payment_status, purchased_at FROM tickets WHERE rifa_id = ? ORDER BY ticket_number ASC',
        [id]
      );
      rifa.tickets = tickets;
    }
    
    res.json({ rifa });
  } catch (error) {
    console.error('Error al obtener rifa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Subir imagen a IMGBB
router.post('/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se proporcionó imagen' });
    }

    const formData = new FormData();
    formData.append('image', fs.createReadStream(req.file.path));
    formData.append('expiration', '15552000'); // 6 meses

    const response = await axios.post(
      `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 30000
      }
    );

    // Eliminar archivo temporal
    fs.unlinkSync(req.file.path);

    if (response.data && response.data.success && response.data.data) {
      res.json({ imageUrl: response.data.data.url });
    } else {
      throw new Error('Respuesta inválida del servidor de imágenes');
    }
  } catch (error) {
    console.error('Error al subir imagen a IMGBB:', error);
    
    // Limpiar archivo temporal en caso de error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    const message = error.response?.data?.error?.message || 'Error al subir imagen';
    res.status(500).json({ message });
  }
});

// Crear nueva rifa (solo administradores)
router.post('/', authenticateToken, isAdmin, [
  body('title').trim().isLength({ min: 3, max: 255 }),
  body('description').optional().trim(),
  body('total_tickets').isInt({ min: 1, max: 1000000 }),
  body('ticket_price').isFloat({ min: 0.01 }),
  body('min_tickets').optional().isInt({ min: 1 }),

  body('draw_date').isISO8601(),
  body('image_url').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      total_tickets,
      ticket_price,
      min_tickets = 1,

      draw_date,
      image_url
    } = req.body;

    // Verificar que la fecha del sorteo sea futura
    const drawDate = new Date(draw_date);
    if (drawDate <= new Date()) {
      return res.status(400).json({ message: 'La fecha del sorteo debe ser futura' });
    }

    const conn = await getConnection();

    // Crear la rifa
    const [result] = await conn.execute(`
      INSERT INTO rifas (title, description, image_url, total_tickets, ticket_price, min_tickets, draw_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title,
      description || null,
      image_url || null,
      total_tickets,
      ticket_price,
      min_tickets,
      draw_date,
      req.user.userId
    ]);

    res.status(201).json({
      message: 'Rifa creada exitosamente',
      rifa: {
        id: result.insertId,
        title,
        description,
        image_url: image_url || null,
        total_tickets,
        ticket_price,
        min_tickets,
        draw_date,
        status: 'active'
      }
    });
  } catch (error) {
    console.error('Error al crear rifa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar rifa
router.put('/:id', authenticateToken, isOwnerOrAdmin(), upload.single('image'), [
  body('title').optional().trim().isLength({ min: 3, max: 255 }),
  body('description').optional().trim(),
  body('total_tickets').optional().isInt({ min: 1, max: 1000000 }),
  body('ticket_price').optional().isFloat({ min: 0.01 }),
  body('min_tickets').optional().isInt({ min: 1 }),

  body('draw_date').optional().isISO8601(),
  body('password').notEmpty().withMessage('La contraseña es requerida para confirmar los cambios')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { password } = req.body;
    const conn = await getConnection();
    
    // Verificar la contraseña del usuario
    const [users] = await conn.execute(
      'SELECT password FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    const isValidPassword = await bcrypt.compare(password, users[0].password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Contraseña incorrecta' });
    }
    
    // Verificar que no hay tickets vendidos si se quiere cambiar total_tickets o ticket_price
    if (req.body.total_tickets !== undefined || req.body.ticket_price !== undefined) {
      const [soldTickets] = await conn.execute(
        'SELECT COUNT(*) as count FROM tickets WHERE rifa_id = ? AND payment_status = "completed"',
        [id]
      );
      
      if (soldTickets[0].count > 0) {
        return res.status(400).json({ 
          message: 'No se puede modificar el número de tickets o el precio cuando ya hay tickets vendidos' 
        });
      }
    }

    const updates = {};
    
    // Permitir actualizar más campos
    const allowedFields = ['title', 'description', 'total_tickets', 'ticket_price', 'min_tickets', 'draw_date'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Manejar imagen
    if (req.file) {
      updates.image_url = `/uploads/rifas/${req.file.filename}`;
    } else if (req.body.image_url !== undefined) {
      updates.image_url = req.body.image_url;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    // Verificar fecha del sorteo si se está actualizando
    if (updates.draw_date) {
      const drawDate = new Date(updates.draw_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      drawDate.setHours(0, 0, 0, 0);
      
      if (drawDate <= today) {
        return res.status(400).json({ message: 'La fecha del sorteo debe ser futura' });
      }
    }
    
    // Construir query dinámicamente
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    await conn.execute(
      `UPDATE rifas SET ${setClause} WHERE id = ?`,
      values
    );

    res.json({ message: 'Rifa actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar rifa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar rifa
router.delete('/:id', authenticateToken, isOwnerOrAdmin(), async (req, res) => {
  try {
    const { id } = req.params;
    const conn = await getConnection();
    
    // Verificar que no tenga tickets vendidos
    const [soldTickets] = await conn.execute(
      'SELECT COUNT(*) as count FROM tickets WHERE rifa_id = ? AND payment_status = "completed"',
      [id]
    );
    
    if (soldTickets[0].count > 0) {
      return res.status(400).json({ message: 'No se puede eliminar una rifa con tickets vendidos' });
    }
    
    await conn.execute('DELETE FROM rifas WHERE id = ?', [id]);
    
    res.json({ message: 'Rifa eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar rifa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});





module.exports = router;