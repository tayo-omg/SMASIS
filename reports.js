const express = require('express');
const db = require('./db');
const { verifyJWT, requireRole } = require('./middleware/auth');

const router = express.Router();

// ── GET /api/reports/summary ──────────────────────────────────
// Admin dashboard metrics
router.get('/summary', verifyJWT, requireRole('admin'), async (req, res) => {
  const { from_date, to_date } = req.query;

  let dateFilter = '';
  let params = [];
  if (from_date && to_date) {
    dateFilter = 'WHERE t.created_at BETWEEN $1 AND $2';
    params = [from_date, to_date + 'T23:59:59Z'];
  } else if (from_date) {
    dateFilter = 'WHERE t.created_at >= $1';
    params = [from_date];
  }

  try {
    // Total count + by status
    const totalResult = await db.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
              SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned_count,
              SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as received_count,
              SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
              SUM(CASE WHEN status = 'cleared' THEN 1 ELSE 0 END) as cleared_count
       FROM tickets t ${dateFilter}`,
      params
    );

    // By category
    const categoryResult = await db.query(
      `SELECT c.name, COUNT(t.id) as count
       FROM tickets t
       JOIN categories c ON t.category_id = c.id
       ${dateFilter}
       GROUP BY c.name ORDER BY count DESC`,
      params
    );

    // Average response time (hours)
    const avgResult = await db.query(
      `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600)::numeric, 1) as avg_hours
       FROM tickets t
       ${dateFilter ? dateFilter + ' AND' : 'WHERE'} t.resolved_at IS NOT NULL`,
      params
    );

    // SLA compliance
    const slaResult = await db.query(
      `SELECT
         COUNT(*) as resolved,
         SUM(CASE WHEN EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600 <= c.sla_hours THEN 1 ELSE 0 END) as within_sla
       FROM tickets t
       JOIN categories c ON t.category_id = c.id
       ${dateFilter ? dateFilter + ' AND' : 'WHERE'} t.resolved_at IS NOT NULL`,
      params
    );

    // Top wards by incident count
    const wardResult = await db.query(
      `SELECT wz.name as ward, COUNT(t.id) as count
       FROM tickets t
       JOIN locations l ON t.location_id = l.id
       JOIN ward_zones wz ON l.ward_zone_id = wz.id
       ${dateFilter}
       GROUP BY wz.name ORDER BY count DESC LIMIT 5`,
      params
    );

    const totals = totalResult.rows[0];
    const sla = slaResult.rows[0];
    const slaCompliance = sla.resolved > 0
      ? Math.round((sla.within_sla / sla.resolved) * 100)
      : null;

    return res.json({
      total: parseInt(totals.total),
      by_status: {
        open: parseInt(totals.open_count),
        assigned: parseInt(totals.assigned_count),
        received: parseInt(totals.received_count),
        in_progress: parseInt(totals.in_progress_count),
        cleared: parseInt(totals.cleared_count),
      },
      by_category: categoryResult.rows.map(r => ({ name: r.name, count: parseInt(r.count) })),
      avg_response_hours: avgResult.rows[0]?.avg_hours ? parseFloat(avgResult.rows[0].avg_hours) : null,
      sla_compliance_pct: slaCompliance,
      top_wards: wardResult.rows.map(r => ({ ward: r.ward, count: parseInt(r.count) })),
    });
  } catch (err) {
    console.error('[REPORTS] summary error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to generate summary' });
  }
});

// ── GET /api/reports/export ───────────────────────────────────
// Admin: export CSV of tickets
router.get('/export', verifyJWT, requireRole('admin'), async (req, res) => {
  const { from_date, to_date } = req.query;

  let dateFilter = '';
  let params = [];
  if (from_date && to_date) {
    dateFilter = 'WHERE t.created_at BETWEEN $1 AND $2';
    params = [from_date, to_date + 'T23:59:59Z'];
  }

  try {
    const result = await db.query(
      `SELECT t.ticket_ref, c.name as category, t.status, t.description,
              l.address_text, l.latitude, l.longitude, wz.name as ward,
              u.name as reporter, te.name as assigned_team,
              t.created_at, t.resolved_at,
              CASE WHEN t.resolved_at IS NOT NULL
                   THEN ROUND(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600, 1)
                   ELSE NULL END as resolution_hours,
              c.sla_hours,
              CASE WHEN t.resolved_at IS NOT NULL AND
                        EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600 <= c.sla_hours
                   THEN 'Yes' ELSE 'No' END as within_sla
       FROM tickets t
       JOIN categories c ON t.category_id = c.id
       JOIN users u ON t.reporter_id = u.id
       LEFT JOIN teams te ON t.assigned_team_id = te.id
       LEFT JOIN locations l ON t.location_id = l.id
       LEFT JOIN ward_zones wz ON l.ward_zone_id = wz.id
       ${dateFilter}
       ORDER BY t.created_at DESC`,
      params
    );

    // Build CSV
    const headers = ['Ticket Ref','Category','Status','Description','Address','Latitude','Longitude',
                     'Ward','Reporter','Assigned Team','Created At','Resolved At',
                     'Resolution Hours','SLA Hours','Within SLA'];

    const csvRows = [
      headers.join(','),
      ...result.rows.map(r => [
        r.ticket_ref, r.category, r.status,
        `"${(r.description || '').replace(/"/g, '""')}"`,
        `"${(r.address_text || '').replace(/"/g, '""')}"`,
        r.latitude, r.longitude,
        `"${r.ward || ''}"`,
        `"${r.reporter}"`,
        `"${r.assigned_team || 'Unassigned'}"`,
        r.created_at ? new Date(r.created_at).toISOString() : '',
        r.resolved_at ? new Date(r.resolved_at).toISOString() : '',
        r.resolution_hours || '',
        r.sla_hours,
        r.within_sla,
      ].join(','))
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="smawasis_report_${Date.now()}.csv"`);
    return res.send(csvRows.join('\n'));
  } catch (err) {
    console.error('[REPORTS] export error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to export report' });
  }
});

module.exports = router;


// ── CATEGORIES ROUTER (separate export) ─────────────────────
const catRouter = express.Router();

catRouter.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, sla_hours FROM categories ORDER BY id');
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to retrieve categories' });
  }
});

catRouter.get('/teams', verifyJWT, requireRole('admin'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT t.id, t.name, wz.name as ward FROM teams t LEFT JOIN ward_zones wz ON t.ward_zone_id = wz.id ORDER BY t.id'
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to retrieve teams' });
  }
});

module.exports.reportsRouter = router;
module.exports.catRouter = catRouter;
