const express = require('express');
const paypal = require('paypal-rest-sdk');
const { body, validationResult } = require('express-validator');
const { getConnection } = require('../config/database');

const router = express.Router();

// Configurar PayPal
paypal.configure({
  mode: process.env.PAYPAL_MODE || 'sandbox',
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET
});

// Crear pago con PayPal
router.post('/create-payment', [
  body('ticketIds').isArray({ min: 1 }),
  body('ticketIds.*').isInt({ min: 1 }),
  body('returnUrl').custom((value) => {
    // Permitir URLs localhost en desarrollo
    if (value.startsWith('http://localhost:') || value.startsWith('https://localhost:')) {
      return true;
    }
    // Para producción, validar URL completa
    return /^https?:\/\/.+/.test(value);
  }),
  body('cancelUrl').custom((value) => {
    // Permitir URLs localhost en desarrollo
    if (value.startsWith('http://localhost:') || value.startsWith('https://localhost:')) {
      return true;
    }
    // Para producción, validar URL completa
    return /^https?:\/\/.+/.test(value);
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { ticketIds, returnUrl, cancelUrl } = req.body;
    const conn = await getConnection();

    // Obtener información de los tickets
    const placeholders = ticketIds.map(() => '?').join(',');
    const [tickets] = await conn.execute(`
      SELECT t.*, r.title as rifa_title, r.ticket_price, r.draw_date
      FROM tickets t
      JOIN rifas r ON t.rifa_id = r.id
      WHERE t.id IN (${placeholders}) AND t.payment_status = 'pending'
    `, ticketIds);

    if (tickets.length === 0) {
      return res.status(404).json({ message: 'No se encontraron tickets válidos para procesar' });
    }

    if (tickets.length !== ticketIds.length) {
      return res.status(400).json({ message: 'Algunos tickets no están disponibles para pago' });
    }

    // Verificar que todos los tickets pertenecen a la misma rifa
    const rifaId = tickets[0].rifa_id;
    if (!tickets.every(ticket => ticket.rifa_id === rifaId)) {
      return res.status(400).json({ message: 'Todos los tickets deben pertenecer a la misma rifa' });
    }

    // Verificar que la fecha del sorteo no haya pasado
    const drawDate = new Date(tickets[0].draw_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas
    drawDate.setHours(0, 0, 0, 0);
    
    if (drawDate < today) {
      return res.status(400).json({ message: 'La fecha del sorteo ya ha pasado' });
    }

    // Calcular precio total
    let totalAmount = 0;
    const items = [];

    // Compra individual
    const ticketPrice = parseFloat(tickets[0].ticket_price);
      totalAmount = ticketPrice * tickets.length;
      
      items.push({
        name: `Tickets para ${tickets[0].rifa_title}`,
        sku: `tickets-${rifaId}`,
        price: ticketPrice.toString(),
        currency: 'USD',
        quantity: tickets.length
      });

    // Crear objeto de pago para PayPal
    const paymentData = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal'
      },
      redirect_urls: {
        return_url: returnUrl,
        cancel_url: cancelUrl
      },
      transactions: [{
        item_list: {
          items: items
        },
        amount: {
          currency: 'USD',
          total: totalAmount.toFixed(2),
          details: {
            subtotal: totalAmount.toFixed(2)
          }
        },
        description: `Compra de tickets para rifa: ${tickets[0].rifa_title}`,
        custom: JSON.stringify({ ticketIds, rifaId })
      }]
    };

    // Crear pago en PayPal
    paypal.payment.create(paymentData, async (error, payment) => {
      if (error) {
        console.error('Error al crear pago en PayPal:', error);
        return res.status(500).json({ message: 'Error al crear el pago' });
      }

      try {
        // Guardar información del pago en la base de datos
        for (const ticket of tickets) {
          await conn.execute(
            'INSERT INTO payments (ticket_id, payment_method, amount, currency, status, paypal_payment_id) VALUES (?, ?, ?, ?, ?, ?)',
            [ticket.id, 'paypal', totalAmount / tickets.length, 'USD', 'pending', payment.id]
          );
        }

        // Encontrar URL de aprobación
        const approvalUrl = payment.links.find(link => link.rel === 'approval_url');
        
        res.json({
          paymentId: payment.id,
          approvalUrl: approvalUrl.href,
          totalAmount: totalAmount.toFixed(2)
        });
      } catch (dbError) {
        console.error('Error al guardar pago en BD:', dbError);
        res.status(500).json({ message: 'Error al procesar el pago' });
      }
    });
  } catch (error) {
    console.error('Error al crear pago:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ejecutar pago después de aprobación de PayPal
router.post('/execute-payment', [
  body('paymentId').notEmpty(),
  body('payerId').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentId, payerId } = req.body;
    const conn = await getConnection();

    // Ejecutar pago en PayPal
    const executePaymentJson = {
      payer_id: payerId
    };

    paypal.payment.execute(paymentId, executePaymentJson, async (error, payment) => {
      if (error) {
        console.error('Error al ejecutar pago en PayPal:', error);
        
        // Obtener tickets asociados antes de eliminar pagos
        const [ticketsToDelete] = await conn.execute(
          'SELECT ticket_id FROM payments WHERE paypal_payment_id = ?',
          [paymentId]
        );
        
        // Eliminar pagos fallidos
        await conn.execute(
          'DELETE FROM payments WHERE paypal_payment_id = ?',
          [paymentId]
        );
        
        // Eliminar tickets asociados para liberarlos
        if (ticketsToDelete.length > 0) {
          const ticketIds = ticketsToDelete.map(t => t.ticket_id);
          const placeholders = ticketIds.map(() => '?').join(',');
          await conn.execute(
            `DELETE FROM tickets WHERE id IN (${placeholders})`,
            ticketIds
          );
        }
        
        return res.status(400).json({ message: 'Error al procesar el pago' });
      }

      try {
        // Iniciar transacción
        await conn.beginTransaction();

        // Obtener información personalizada del pago
        const customData = JSON.parse(payment.transactions[0].custom);
        const { ticketIds } = customData;

        // Actualizar estado de los pagos
        await conn.execute(
          'UPDATE payments SET status = "completed", paypal_payer_id = ? WHERE paypal_payment_id = ?',
          [payerId, paymentId]
        );

        // Actualizar estado de los tickets
        const placeholders = ticketIds.map(() => '?').join(',');
        await conn.execute(
          `UPDATE tickets SET payment_status = 'completed' WHERE id IN (${placeholders})`,
          ticketIds
        );

        await conn.commit();

        // Obtener información actualizada de los tickets
        const [updatedTickets] = await conn.execute(`
          SELECT t.*, r.title as rifa_title
          FROM tickets t
          JOIN rifas r ON t.rifa_id = r.id
          WHERE t.id IN (${placeholders})
        `, ticketIds);

        res.json({
          message: 'Pago procesado exitosamente',
          paymentId,
          tickets: updatedTickets
        });
      } catch (dbError) {
        await conn.rollback();
        console.error('Error al actualizar BD después del pago:', dbError);
        res.status(500).json({ message: 'Error al finalizar el pago' });
      }
    });
  } catch (error) {
    console.error('Error al ejecutar pago:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener estado de un pago
router.get('/status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const conn = await getConnection();

    const [payments] = await conn.execute(`
      SELECT p.*, t.ticket_number, t.buyer_name, r.title as rifa_title
      FROM payments p
      JOIN tickets t ON p.ticket_id = t.id
      JOIN rifas r ON t.rifa_id = r.id
      WHERE p.paypal_payment_id = ?
    `, [paymentId]);

    if (payments.length === 0) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    res.json({ payments });
  } catch (error) {
    console.error('Error al obtener estado del pago:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Webhook para notificaciones de PayPal (opcional)
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    
    // Verificar que es un evento de pago completado
    if (event.event_type === 'PAYMENT.SALE.COMPLETED') {
      const paymentId = event.resource.parent_payment;
      const conn = await getConnection();
      
      // Actualizar estado si no está ya actualizado
      await conn.execute(
        'UPDATE payments SET status = "completed" WHERE paypal_payment_id = ? AND status = "pending"',
        [paymentId]
      );
      
      // Actualizar tickets correspondientes
      await conn.execute(`
        UPDATE tickets t
        JOIN payments p ON t.id = p.ticket_id
        SET t.payment_status = 'completed'
        WHERE p.paypal_payment_id = ? AND t.payment_status = 'pending'
      `, [paymentId]);
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(500).json({ message: 'Error al procesar webhook' });
  }
});

// Reembolsar pago (solo para admins)
router.post('/refund/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const conn = await getConnection();

    // Obtener información del pago
    const [payments] = await conn.execute(
      'SELECT * FROM payments WHERE paypal_payment_id = ? AND status = "completed"',
      [paymentId]
    );

    if (payments.length === 0) {
      return res.status(404).json({ message: 'Pago no encontrado o no se puede reembolsar' });
    }

    // Obtener detalles del pago de PayPal
    paypal.payment.get(paymentId, (error, payment) => {
      if (error) {
        console.error('Error al obtener pago de PayPal:', error);
        return res.status(500).json({ message: 'Error al procesar reembolso' });
      }

      const saleId = payment.transactions[0].related_resources[0].sale.id;
      const refundData = {
        amount: {
          total: payments[0].amount.toString(),
          currency: payments[0].currency
        }
      };

      // Crear reembolso
      paypal.sale.refund(saleId, refundData, async (refundError, refund) => {
        if (refundError) {
          console.error('Error al crear reembolso:', refundError);
          return res.status(500).json({ message: 'Error al procesar reembolso' });
        }

        try {
          // Actualizar estado en la base de datos
          await conn.execute(
            'UPDATE payments SET status = "refunded" WHERE paypal_payment_id = ?',
            [paymentId]
          );

          // Eliminar tickets reembolsados para liberarlos
          await conn.execute(`
            DELETE t FROM tickets t
            JOIN payments p ON t.id = p.ticket_id
            WHERE p.paypal_payment_id = ?
          `, [paymentId]);

          res.json({
            message: 'Reembolso procesado exitosamente',
            refundId: refund.id
          });
        } catch (dbError) {
          console.error('Error al actualizar BD después del reembolso:', dbError);
          res.status(500).json({ message: 'Error al finalizar reembolso' });
        }
      });
    });
  } catch (error) {
    console.error('Error al procesar reembolso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;