const express = require('express');
const { body, validationResult } = require('express-validator');
const { getConnection } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Obtener tickets disponibles para una rifa
router.get('/available/:rifaId', async (req, res) => {
  try {
    const { rifaId } = req.params;
    const conn = await getConnection();
    
    // Verificar que la rifa existe y está activa
    const [rifas] = await conn.execute(
      'SELECT id, total_tickets, min_tickets, status FROM rifas WHERE id = ? AND status = "active"',
      [rifaId]
    );
    
    if (rifas.length === 0) {
      return res.status(404).json({ message: 'Rifa no encontrada o no está activa' });
    }
    
    const rifa = rifas[0];
    
    // Obtener tickets ya vendidos
    const [soldTickets] = await conn.execute(
      'SELECT ticket_number FROM tickets WHERE rifa_id = ? AND payment_status = "completed" ORDER BY ticket_number ASC',
      [rifaId]
    );
    
    const soldNumbers = soldTickets.map(ticket => ticket.ticket_number);
    
    // Generar array de tickets disponibles
    const availableTickets = [];
    for (let i = 1; i <= rifa.total_tickets; i++) {
      if (!soldNumbers.includes(i)) {
        availableTickets.push(i);
      }
    }
    
    res.json({
      rifaId: parseInt(rifaId),
      totalTickets: rifa.total_tickets,
      minTickets: rifa.min_tickets || 1,
      soldTickets: soldNumbers,
      soldTicketsCount: soldNumbers.length,
      availableTickets,
      availableCount: availableTickets.length
    });
  } catch (error) {
    console.error('Error al obtener tickets disponibles:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Reservar tickets (crear orden de compra)
router.post('/reserve', [
  body('rifaId').isInt({ min: 1 }),
  body('buyerName').trim().isLength({ min: 2, max: 255 }),
  body('buyerEmail').isEmail().normalizeEmail(),
  body('buyerPhone').optional().isMobilePhone(),
  body('ticketNumbers').isArray({ min: 1 }),
  body('ticketNumbers.*').isInt({ min: 1 }),

], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      rifaId,
      buyerName,
      buyerEmail,
      buyerPhone,
      ticketNumbers
    } = req.body;

    const conn = await getConnection();
    
    // Iniciar transacción
    await conn.beginTransaction();
    
    try {
      // Verificar que la rifa existe y está activa
      const [rifas] = await conn.execute(
        'SELECT id, total_tickets, ticket_price, min_tickets, status, draw_date FROM rifas WHERE id = ? AND status = "active"',
        [rifaId]
      );
      
      if (rifas.length === 0) {
        throw new Error('Rifa no encontrada o no está activa');
      }
      
      const rifa = rifas[0];
      
      // Verificar que la fecha del sorteo no haya pasado
      const drawDate = new Date(rifa.draw_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas
      drawDate.setHours(0, 0, 0, 0);
      
      if (drawDate < today) {
        throw new Error('La fecha del sorteo ya ha pasado');
      }
      

      
      // Verificar cantidad mínima de boletos
      const minTickets = rifa.min_tickets || 1;
      if (ticketNumbers.length < minTickets) {
        throw new Error(`Debe comprar al menos ${minTickets} boleto${minTickets > 1 ? 's' : ''}`);
      }
      
      // Verificar que todos los números están dentro del rango
      const invalidNumbers = ticketNumbers.filter(num => num < 1 || num > rifa.total_tickets);
      if (invalidNumbers.length > 0) {
        throw new Error(`Números de ticket inválidos: ${invalidNumbers.join(', ')}`);
      }
      
      // Verificar que los tickets están disponibles
      const [existingTickets] = await conn.execute(
        `SELECT ticket_number FROM tickets 
         WHERE rifa_id = ? AND ticket_number IN (${ticketNumbers.map(() => '?').join(',')}) 
         AND payment_status IN ('pending', 'completed')`,
        [rifaId, ...ticketNumbers]
      );
      
      if (existingTickets.length > 0) {
        const unavailableNumbers = existingTickets.map(t => t.ticket_number);
        throw new Error(`Los siguientes tickets ya no están disponibles: ${unavailableNumbers.join(', ')}`);
      }
      

      
      // Calcular precio total
      const totalPrice = ticketNumbers.length * rifa.ticket_price;
      
      // Crear tickets reservados
      const ticketIds = [];
      for (const ticketNumber of ticketNumbers) {
        const [result] = await conn.execute(
          `INSERT INTO tickets (rifa_id, ticket_number, buyer_name, buyer_email, buyer_phone, 
                               payment_status) 
           VALUES (?, ?, ?, ?, ?, 'pending')`,
          [
            rifaId,
            ticketNumber,
            buyerName,
            buyerEmail,
            buyerPhone || null
          ]
        );
        ticketIds.push(result.insertId);
      }
      
      await conn.commit();
      
      res.status(201).json({
        message: 'Tickets reservados exitosamente',
        reservation: {
          ticketIds,
          rifaId,
          ticketNumbers,
          buyerName,
          buyerEmail,
          totalPrice,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutos para completar el pago
        }
      });
      
    } catch (error) {
      await conn.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error al reservar tickets:', error);
    res.status(400).json({ message: error.message || 'Error al reservar tickets' });
  }
});

// Obtener información de tickets reservados
router.get('/reservation/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const conn = await getConnection();
    
    const [tickets] = await conn.execute(`
      SELECT t.*, r.title as rifa_title, r.ticket_price, r.draw_date
      FROM tickets t
      JOIN rifas r ON t.rifa_id = r.id
      WHERE t.id = ?
    `, [ticketId]);
    
    if (tickets.length === 0) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }
    
    const ticket = tickets[0];
    
    // Si el ticket está pendiente por más de 15 minutos, cancelarlo
    if (ticket.payment_status === 'pending') {
      const createdAt = new Date(ticket.created_at);
      const now = new Date();
      const diffMinutes = (now - createdAt) / (1000 * 60);
      
      if (diffMinutes > 15) {
        await conn.execute(
          'UPDATE tickets SET payment_status = "failed" WHERE id = ?',
          [ticketId]
        );
        ticket.payment_status = 'failed';
      }
    }
    
    res.json({ ticket });
  } catch (error) {
    console.error('Error al obtener información del ticket:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Cancelar reserva de tickets
router.delete('/reservation/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const conn = await getConnection();
    
    // Solo permitir cancelar tickets pendientes
    const [result] = await conn.execute(
      'DELETE FROM tickets WHERE id = ? AND payment_status = "pending"',
      [ticketId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada o ya no se puede cancelar' });
    }
    
    res.json({ message: 'Reserva cancelada exitosamente' });
  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener tickets de una rifa (para el creador)
router.get('/rifa/:rifaId', optionalAuth, async (req, res) => {
  try {
    const { rifaId } = req.params;
    const conn = await getConnection();
    
    // Verificar que la rifa existe
    const [rifas] = await conn.execute(
      'SELECT created_by FROM rifas WHERE id = ?',
      [rifaId]
    );
    
    if (rifas.length === 0) {
      return res.status(404).json({ message: 'Rifa no encontrada' });
    }
    
    // Solo el creador o admin puede ver todos los tickets
    if (!req.user || (req.user.userId !== rifas[0].created_by && req.user.role !== 'admin')) {
      return res.status(403).json({ message: 'No tienes permisos para ver esta información' });
    }
    
    const [tickets] = await conn.execute(`
      SELECT t.*
      FROM tickets t
      WHERE t.rifa_id = ?
      ORDER BY t.ticket_number ASC
    `, [rifaId]);
    
    res.json({ tickets });
  } catch (error) {
    console.error('Error al obtener tickets de la rifa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Limpiar tickets expirados (tarea de mantenimiento)
router.post('/cleanup-expired', async (req, res) => {
  try {
    const conn = await getConnection();
    
    // Eliminar tickets pendientes de más de 15 minutos
    const [result] = await conn.execute(`
      DELETE FROM tickets 
      WHERE payment_status = 'pending' 
      AND created_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    `);
    
    res.json({ 
      message: 'Limpieza completada',
      deletedTickets: result.affectedRows
    });
  } catch (error) {
    console.error('Error en limpieza de tickets:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;