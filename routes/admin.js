const express = require('express');
const { body, validationResult } = require('express-validator');
const { getConnection } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Aplicar middleware de autenticación y admin a todas las rutas
router.use(authenticateToken);
router.use(isAdmin);

// Configuración de multer para subida de archivos del admin
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/admin');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'admin-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.includes('document');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

// Dashboard - Estadísticas generales
router.get('/dashboard', async (req, res) => {
  try {
    const conn = await getConnection();
    
    // Estadísticas generales
    const [userStats] = await conn.execute(
      'SELECT COUNT(*) as total_users, COUNT(CASE WHEN role = "admin" THEN 1 END) as admin_users FROM users WHERE is_active = true'
    );
    
    const [rifaStats] = await conn.execute(
      'SELECT COUNT(*) as total_rifas, COUNT(CASE WHEN status = "active" THEN 1 END) as active_rifas, COUNT(CASE WHEN status = "completed" THEN 1 END) as completed_rifas FROM rifas'
    );
    
    const [ticketStats] = await conn.execute(
      'SELECT COUNT(*) as total_tickets, COUNT(CASE WHEN payment_status = "completed" THEN 1 END) as sold_tickets FROM tickets'
    );
    
    const [revenueStats] = await conn.execute(
      'SELECT SUM(amount) as total_revenue FROM payments WHERE status = "completed"'
    );
    
    // Rifas más populares
    const [popularRifas] = await conn.execute(`
      SELECT r.id, r.title, r.total_tickets,
             COUNT(t.id) as sold_tickets,
             SUM(CASE WHEN t.payment_status = 'completed' THEN p.amount ELSE 0 END) as revenue
      FROM rifas r
      LEFT JOIN tickets t ON r.id = t.rifa_id
      LEFT JOIN payments p ON t.id = p.ticket_id AND p.status = 'completed'
      GROUP BY r.id, r.title, r.total_tickets
      ORDER BY sold_tickets DESC
      LIMIT 5
    `);
    
    // Ventas por mes (últimos 6 meses)
    const [monthlySales] = await conn.execute(`
      SELECT 
        DATE_FORMAT(p.created_at, '%Y-%m') as month,
        COUNT(p.id) as transactions,
        SUM(p.amount) as revenue
      FROM payments p
      WHERE p.status = 'completed' AND p.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(p.created_at, '%Y-%m')
      ORDER BY month DESC
    `);
    
    res.json({
      users: userStats[0],
      rifas: rifaStats[0],
      tickets: ticketStats[0],
      revenue: revenueStats[0].total_revenue || 0,
      popularRifas,
      monthlySales
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Estadísticas para el dashboard principal
router.get('/stats', async (req, res) => {
  try {
    const conn = await getConnection();
    
    // Estadísticas de usuarios
    const [userStats] = await conn.execute(
      `SELECT 
        COUNT(*) as totalUsers,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 END) as newUsersThisMonth
      FROM users WHERE is_active = true`
    );
    
    // Estadísticas de rifas
    const [rifaStats] = await conn.execute(
      `SELECT 
        COUNT(*) as totalRifas,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as activeRifas
      FROM rifas`
    );
    
    // Estadísticas de ingresos
    const [revenueStats] = await conn.execute(
      `SELECT 
        COALESCE(SUM(amount), 0) as totalRevenue,
        COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN amount ELSE 0 END), 0) as revenueThisMonth
      FROM payments WHERE status = 'completed'`
    );
    
    // Estadísticas de tickets
    const [ticketStats] = await conn.execute(
      `SELECT 
        COUNT(*) as totalTicketsSold,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 END) as ticketsSoldThisMonth
      FROM tickets WHERE payment_status = 'completed'`
    );
    
    res.json({
      totalUsers: userStats[0].totalUsers,
      newUsersThisMonth: userStats[0].newUsersThisMonth,
      totalRifas: rifaStats[0].totalRifas,
      activeRifas: rifaStats[0].activeRifas,
      totalRevenue: parseFloat(revenueStats[0].totalRevenue),
      revenueThisMonth: parseFloat(revenueStats[0].revenueThisMonth),
      totalTicketsSold: ticketStats[0].totalTicketsSold,
      ticketsSoldThisMonth: ticketStats[0].ticketsSoldThisMonth
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Rifas recientes
router.get('/rifas/recent', async (req, res) => {
  try {
    const conn = await getConnection();
    
    const [rifas] = await conn.execute(`
      SELECT 
        r.id,
        r.title,
        r.ticket_price,
        r.status,
        u.name as creator_name
      FROM rifas r
      JOIN users u ON r.created_by = u.id
      ORDER BY r.created_at DESC
      LIMIT 5
    `);
    
    res.json(rifas);
  } catch (error) {
    console.error('Error al obtener rifas recientes:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Compras recientes
router.get('/purchases/recent', async (req, res) => {
  try {
    const conn = await getConnection();
    
    const [purchases] = await conn.execute(`
      SELECT 
        p.id,
        p.amount as total_amount,
        p.created_at,
        t.buyer_name as customer_name,
        r.title as rifa_title,
        t.ticket_number
      FROM payments p
      JOIN tickets t ON p.ticket_id = t.id
      JOIN rifas r ON t.rifa_id = r.id
      WHERE p.status = 'completed'
      ORDER BY p.created_at DESC
      LIMIT 5
    `);
    
    // Formatear datos de compras
    const formattedPurchases = purchases.map(purchase => ({
      ...purchase,
      quantity: 1 // Cada ticket es una unidad
    }));
    
    res.json(formattedPurchases);
  } catch (error) {
    console.error('Error al obtener compras recientes:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Gestión de usuarios
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = 'all' } = req.query;
    const offset = (page - 1) * limit;
    
    const conn = await getConnection();
    
    let query = 'SELECT id, email, name, phone, role, is_active, created_at FROM users';
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    let params = [];
    let conditions = [];
    
    if (search) {
      conditions.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (role !== 'all') {
      conditions.push('role = ?');
      params.push(role);
    }
    
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [users] = await conn.execute(query, params);
    const [countResult] = await conn.execute(countQuery, params.slice(0, -2));
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear usuario
router.post('/users', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 }),
  body('role').isIn(['user', 'admin']),
  body('phone').optional().isMobilePhone()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role, phone } = req.body;
    const conn = await getConnection();

    // Verificar si el usuario ya existe
    const [existingUser] = await conn.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear usuario
    const [result] = await conn.execute(
      'INSERT INTO users (email, password, name, phone, role) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, name, phone || null, role]
    );

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: {
        id: result.insertId,
        email,
        name,
        phone,
        role
      }
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar usuario
router.put('/users/:id', [
  body('name').optional().trim().isLength({ min: 2 }),
  body('role').optional().isIn(['user', 'admin']),
  body('is_active').optional().isBoolean(),
  body('phone').optional().isMobilePhone()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = {};
    
    const allowedFields = ['name', 'role', 'is_active', 'phone'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    const conn = await getConnection();
    
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    await conn.execute(
      `UPDATE users SET ${setClause} WHERE id = ?`,
      values
    );

    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar usuario
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // No permitir eliminar el propio usuario
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
    }
    
    const conn = await getConnection();
    
    // Verificar si el usuario tiene rifas activas
    const [activeRifas] = await conn.execute(
      'SELECT COUNT(*) as count FROM rifas WHERE created_by = ? AND status = "active"',
      [id]
    );
    
    if (activeRifas[0].count > 0) {
      return res.status(400).json({ message: 'No se puede eliminar un usuario con rifas activas' });
    }
    
    await conn.execute('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Gestión de rifas (vista admin)
router.get('/rifas', async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all', search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    const conn = await getConnection();
    
    let query = `
      SELECT r.*, u.name as creator_name,
             (SELECT COUNT(*) FROM tickets t WHERE t.rifa_id = r.id AND t.payment_status = 'completed') as sold_tickets,
             (SELECT SUM(p.amount) FROM payments p JOIN tickets t ON p.ticket_id = t.id WHERE t.rifa_id = r.id AND p.status = 'completed') as revenue
      FROM rifas r
      JOIN users u ON r.created_by = u.id
    `;
    
    let countQuery = 'SELECT COUNT(*) as total FROM rifas r';
    let params = [];
    let conditions = [];
    
    if (search) {
      conditions.push('r.title LIKE ?');
      params.push(`%${search}%`);
    }
    
    if (status !== 'all') {
      conditions.push('r.status = ?');
      params.push(status);
    }
    
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }
    
    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [rifas] = await conn.execute(query, params);
    const [countResult] = await conn.execute(countQuery, params.slice(0, -2));
    
    res.json({
      rifas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener rifas (admin):', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Cambiar estado de rifa
router.put('/rifas/:id/status', [
  body('status').isIn(['active', 'completed', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;
    
    const conn = await getConnection();
    
    await conn.execute(
      'UPDATE rifas SET status = ? WHERE id = ?',
      [status, id]
    );
    
    res.json({ message: 'Estado de la rifa actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar estado de rifa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Realizar sorteo de una rifa
router.post('/rifas/:id/draw', async (req, res) => {
  try {
    const { id } = req.params;
    const conn = await getConnection();
    
    // Verificar que la rifa existe y está activa
    const [rifas] = await conn.execute(
      'SELECT * FROM rifas WHERE id = ? AND status = "active"',
      [id]
    );
    
    if (rifas.length === 0) {
      return res.status(404).json({ message: 'Rifa no encontrada o no está activa' });
    }
    
    // Obtener tickets vendidos
    const [soldTickets] = await conn.execute(
      'SELECT ticket_number FROM tickets WHERE rifa_id = ? AND payment_status = "completed"',
      [id]
    );
    
    if (soldTickets.length === 0) {
      return res.status(400).json({ message: 'No hay tickets vendidos para esta rifa' });
    }
    
    // Seleccionar ganador aleatoriamente
    const randomIndex = Math.floor(Math.random() * soldTickets.length);
    const winnerTicketNumber = soldTickets[randomIndex].ticket_number;
    
    // Actualizar rifa con el ganador
    await conn.execute(
      'UPDATE rifas SET status = "completed", winner_ticket_number = ? WHERE id = ?',
      [winnerTicketNumber, id]
    );
    
    // Obtener información del ganador
    const [winner] = await conn.execute(
      'SELECT * FROM tickets WHERE rifa_id = ? AND ticket_number = ?',
      [id, winnerTicketNumber]
    );
    
    res.json({
      message: 'Sorteo realizado exitosamente',
      winner: {
        ticketNumber: winnerTicketNumber,
        buyerName: winner[0].buyer_name,
        buyerEmail: winner[0].buyer_email
      }
    });
  } catch (error) {
    console.error('Error al realizar sorteo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Subir archivos
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se subió ningún archivo' });
    }
    
    res.json({
      message: 'Archivo subido exitosamente',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: `/uploads/admin/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('Error al subir archivo:', error);
    res.status(500).json({ message: 'Error al subir archivo' });
  }
});

// Obtener logs del sistema (últimas 100 entradas)
router.get('/logs', async (req, res) => {
  try {
    const conn = await getConnection();
    
    // Obtener actividad reciente
    const [recentActivity] = await conn.execute(`
      SELECT 
        'user_registration' as type,
        u.name as description,
        u.created_at as timestamp
      FROM users u
      WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      
      UNION ALL
      
      SELECT 
        'rifa_created' as type,
        CONCAT('Rifa creada: ', r.title) as description,
        r.created_at as timestamp
      FROM rifas r
      WHERE r.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      
      UNION ALL
      
      SELECT 
        'ticket_sold' as type,
        CONCAT('Ticket vendido para: ', r.title) as description,
        t.created_at as timestamp
      FROM tickets t
      JOIN rifas r ON t.rifa_id = r.id
      WHERE t.payment_status = 'completed' AND t.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      
      ORDER BY timestamp DESC
      LIMIT 100
    `);
    
    res.json({ logs: recentActivity });
  } catch (error) {
    console.error('Error al obtener logs:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;