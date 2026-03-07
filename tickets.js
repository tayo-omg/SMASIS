const express = require('express');
const db = require('./db');
const { verifyJWT, requireRole } = require('./middleware/auth');
const { assignToWard } = require('./assignmentEngine');

const router = express.Router();

// Valid status transitions (state machine)
const VALID_TRANSITIONS = {
  open:        ['assigned'],
  assigned:    ['received'],
  received:    ['in_progress'],
  in_progress: ['cleared'],
  cleared:     [],  // terminal state
};

// ── POST /api/tickets ─────────────────────────────────────────
// Citizen creates an incident report
router.post('/', verifyJWT, requireRole('citizen'), async (req, res) => {
  const { category_id, latitude, longitude, address_text, description } = req.body;

  if (!category_id || latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'category_id, latitude, and longitude are required'
    });
  }
  if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'latitude and longitude must be valid numbers' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Determine ward assignment
    const assignment = await assignToWard(parseFloat(latitude), parseFloat(longitude));

    // Insert location
    const locationResult = await client.query(
      `INSERT INTO locations (latitude, longitude, address_text, ward_zone_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [parseFloat(latitude), parseFloat(longitude), address_text || null, assignment?.zone_id || null]
    );
    const locationId = locationResult.rows[0].id;

    // Generate ticket reference: SWS-YYYYMMDD-NNNN
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countResult = await client.query('SELECT COUNT(*) FROM tickets');
    const seq = String(parseInt(countResult.rows[0].count) + 1).padStart(4, '0');
    const ticket_ref = `SWS-${dateStr}-${seq}`;

    // Insert ticket
    const ticketResult = await client.query(
      `INSERT INTO tickets (ticket_ref, reporter_id, category_id, location_id, assigned_team_id, status, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        ticket_ref,
        req.user.id,
        category_id,
        locationId,
        assignment?.team_id || null,
        assignment ? 'assigned' : 'open',
        description || null,
      ]
    );
    const ticket = ticketResult.rows[0];

    // Log status change
    await client.query(
      `INSERT INTO status_log (ticket_id, from_status, to_status, changed_by) VALUES ($1, $2, $3, $4)`,
      [ticket.id, null, ticket.status, req.user.id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      id: ticket.id,
      ticket_ref: ticket.ticket_ref,
      status: ticket.status,
      assigned_team: assignment?.team_name || 'Unassigned',
      category_id: ticket.category_id,
      created_at: ticket.created_at,
      message: 'Incident report submitted successfully'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[TICKETS] create error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to create ticket' });
  } finally {
    client.release();
  }
});

// ── GET /api/tickets ──────────────────────────────────────────
// Admin: list all tickets with filters
router.get('/', verifyJWT, requireRole('admin'), async (req, res) => {
  const { status, category_id, from_date, to_date, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let conditions = [];
  let params = [];
  let idx = 1;

  if (status) { conditions.push(`t.status = $${idx++}`); params.push(status); }
  if (category_id) { conditions.push(`t.category_id = $${idx++}`); params.push(category_id); }
  if (from_date) { conditions.push(`t.created_at >= $${idx++}`); params.push(from_date); }
  if (to_date) { conditions.push(`t.created_at <= $${idx++}`); params.push(to_date + 'T23:59:59Z'); }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const countResult = await db.query(
      `SELECT COUNT(*) FROM tickets t ${where}`, params
    );
    params.push(parseInt(limit), offset);
    const result = await db.query(
      `SELECT t.id, t.ticket_ref, t.status, t.description, t.created_at, t.resolved_at,
              c.name as category, u.name as reporter, te.name as assigned_team,
              l.address_text, l.latitude, l.longitude
       FROM tickets t
       JOIN categories c ON t.category_id = c.id
       JOIN users u ON t.reporter_id = u.id
       LEFT JOIN teams te ON t.assigned_team_id = te.id
       LEFT JOIN locations l ON t.location_id = l.id
       ${where}
       ORDER BY t.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    return res.json({
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      tickets: result.rows
    });
  } catch (err) {
    console.error('[TICKETS] list error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to retrieve tickets' });
  }
});

// ── GET /api/tickets/mine ─────────────────────────────────────
// Citizen: their own tickets
router.get('/mine', verifyJWT, requireRole('citizen'), async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const result = await db.query(
      `SELECT t.id, t.ticket_ref, t.status, t.description, t.created_at, t.resolved_at,
              c.name as category, l.address_text, l.latitude, l.longitude,
              te.name as assigned_team
       FROM tickets t
       JOIN categories c ON t.category_id = c.id
       LEFT JOIN teams te ON t.assigned_team_id = te.id
       LEFT JOIN locations l ON t.location_id = l.id
       WHERE t.reporter_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), offset]
    );

    return res.json({ tickets: result.rows });
  } catch (err) {
    console.error('[TICKETS] mine error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to retrieve your tickets' });
  }
});

// ── GET /api/tickets/assigned ─────────────────────────────────
// Contractor: tickets assigned to their team
router.get('/assigned', verifyJWT, requireRole('contractor'), async (req, res) => {
  if (!req.user.team_id) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Contractor not assigned to a team' });
  }

  try {
    const result = await db.query(
      `SELECT t.id, t.ticket_ref, t.status, t.description, t.created_at, t.resolved_at,
              c.name as category, c.sla_hours,
              l.address_text, l.latitude, l.longitude,
              u.name as reporter
       FROM tickets t
       JOIN categories c ON t.category_id = c.id
       JOIN users u ON t.reporter_id = u.id
       LEFT JOIN locations l ON t.location_id = l.id
       WHERE t.assigned_team_id = $1
       ORDER BY t.created_at DESC`,
      [req.user.team_id]
    );

    return res.json({ tickets: result.rows });
  } catch (err) {
    console.error('[TICKETS] assigned error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to retrieve assigned tickets' });
  }
});

// ── GET /api/tickets/:id ──────────────────────────────────────
// Any authenticated user — ticket detail
router.get('/:id', verifyJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const ticketResult = await db.query(
      `SELECT t.*, c.name as category, c.sla_hours, u.name as reporter,
              te.name as assigned_team, l.address_text, l.latitude, l.longitude
       FROM tickets t
       JOIN categories c ON t.category_id = c.id
       JOIN users u ON t.reporter_id = u.id
       LEFT JOIN teams te ON t.assigned_team_id = te.id
       LEFT JOIN locations l ON t.location_id = l.id
       WHERE t.id = $1`,
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Ticket not found' });
    }

    // Citizens can only see their own tickets
    const ticket = ticketResult.rows[0];
    if (req.user.role === 'citizen' && ticket.reporter_id !== req.user.id) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'You can only view your own tickets' });
    }

    // Fetch comments
    const commentsResult = await db.query(
      `SELECT cm.id, cm.body, cm.created_at, u.name as author, u.role as author_role
       FROM comments cm JOIN users u ON cm.author_id = u.id
       WHERE cm.ticket_id = $1 ORDER BY cm.created_at ASC`,
      [id]
    );

    // Fetch photos
    const photosResult = await db.query(
      'SELECT id, url, uploaded_at FROM photos WHERE ticket_id = $1',
      [id]
    );

    // Fetch status history
    const historyResult = await db.query(
      `SELECT sl.from_status, sl.to_status, sl.changed_at, u.name as changed_by
       FROM status_log sl LEFT JOIN users u ON sl.changed_by = u.id
       WHERE sl.ticket_id = $1 ORDER BY sl.changed_at ASC`,
      [id]
    );

    return res.json({
      ...ticket,
      comments: commentsResult.rows,
      photos: photosResult.rows,
      status_history: historyResult.rows,
    });
  } catch (err) {
    console.error('[TICKETS] get error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to retrieve ticket' });
  }
});

// ── PATCH /api/tickets/:id/assign ────────────────────────────
// Admin: manually assign ticket to a team
router.patch('/:id/assign', verifyJWT, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { team_id } = req.body;

  if (!team_id) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'team_id is required' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const ticketResult = await client.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (ticketResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];
    const oldStatus = ticket.status;
    const newStatus = 'assigned';

    await client.query(
      'UPDATE tickets SET assigned_team_id = $1, status = $2 WHERE id = $3',
      [team_id, newStatus, id]
    );

    await client.query(
      'INSERT INTO status_log (ticket_id, from_status, to_status, changed_by) VALUES ($1, $2, $3, $4)',
      [id, oldStatus, newStatus, req.user.id]
    );

    await client.query('COMMIT');

    const teamResult = await db.query('SELECT name FROM teams WHERE id = $1', [team_id]);
    return res.json({
      message: 'Ticket assigned successfully',
      ticket_ref: ticket.ticket_ref,
      assigned_team: teamResult.rows[0]?.name,
      status: newStatus
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[TICKETS] assign error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to assign ticket' });
  } finally {
    client.release();
  }
});

// ── PATCH /api/tickets/:id/status ────────────────────────────
// Contractor: update ticket status with optional comment
router.patch('/:id/status', verifyJWT, requireRole('contractor'), async (req, res) => {
  const { id } = req.params;
  const { status: newStatus, comment } = req.body;

  if (!newStatus) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'status is required' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const ticketResult = await client.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (ticketResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Verify contractor's team owns this ticket
    if (ticket.assigned_team_id !== req.user.team_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'FORBIDDEN', message: 'This ticket is not assigned to your team' });
    }

    // Validate state machine transition
    const validNextStates = VALID_TRANSITIONS[ticket.status] || [];
    if (!validNextStates.includes(newStatus)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `Invalid status transition: ${ticket.status} → ${newStatus}. Valid: ${validNextStates.join(', ') || 'none (terminal state)'}`
      });
    }

    // Update ticket
    const resolvedAt = newStatus === 'cleared' ? new Date().toISOString() : null;
    await client.query(
      'UPDATE tickets SET status = $1, resolved_at = COALESCE($2, resolved_at) WHERE id = $3',
      [newStatus, resolvedAt, id]
    );

    // Log status change
    await client.query(
      'INSERT INTO status_log (ticket_id, from_status, to_status, changed_by) VALUES ($1, $2, $3, $4)',
      [id, ticket.status, newStatus, req.user.id]
    );

    // Add optional comment
    if (comment && comment.trim()) {
      await client.query(
        'INSERT INTO comments (ticket_id, author_id, body) VALUES ($1, $2, $3)',
        [id, req.user.id, comment.trim()]
      );
    }

    await client.query('COMMIT');

    return res.json({
      message: 'Ticket status updated',
      ticket_ref: ticket.ticket_ref,
      old_status: ticket.status,
      new_status: newStatus,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[TICKETS] status update error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to update ticket status' });
  } finally {
    client.release();
  }
});

module.exports = router;
