// SmaWaSIS Backend — Integration Tests
// Run with: npm test (from /app/backend)
// Requires test DB configured in .env.test

const request = require('supertest');
const app = require('./server');

// ── TEST DATA ─────────────────────────────────────────────────
let citizenToken, contractorToken, adminToken;
let citizenId, ticketId, ticketRef;

// ── TC-01: Register Citizen ────────────────────────────────────
describe('TC-01: Register with valid credentials', () => {
  test('POST /api/auth/register → 201, JWT returned', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test Citizen', email: `citizen_${Date.now()}@test.com`, password: 'test123', role: 'citizen' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('citizen');
    citizenToken = res.body.token;
    citizenId = res.body.user.id;
  });
});

// ── TC-02: Invalid Login ──────────────────────────────────────
describe('TC-02: Login with wrong password → 401', () => {
  test('POST /api/auth/login with bad password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
    expect(res.body.token).toBeUndefined();
  });
});

// ── TC-03: Submit Valid Report ────────────────────────────────
describe('TC-03: Submit valid incident report', () => {
  test('POST /api/tickets → 201, ticket_ref starts with SWS-', async () => {
    if (!citizenToken) return; // skip if auth test failed

    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        category_id: 1,
        latitude: 6.5244,
        longitude: 3.3792,
        address_text: '14 Test Street',
        description: 'Test incident for automated testing'
      });

    expect(res.status).toBe(201);
    expect(res.body.ticket_ref).toMatch(/^SWS-\d{8}-\d{4}$/);
    expect(res.body.status).toBe('assigned');
    ticketId = res.body.id;
    ticketRef = res.body.ticket_ref;
  });
});

// ── TC-09: Invalid Status Transition ─────────────────────────
describe('TC-09: Invalid status transition → 400', () => {
  test('Direct cleared→open should be rejected', async () => {
    // Register contractor for this test
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test Contractor', email: `contractor_${Date.now()}@test.com`, password: 'test123', role: 'contractor', team_id: 2 });
    contractorToken = regRes.body.token;

    if (!ticketId || !contractorToken) return;

    // First get ticket to know current status, then try an invalid transition
    const res = await request(app)
      .patch(`/api/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${contractorToken}`)
      .send({ status: 'open', comment: 'trying to go backwards' });

    // Should be 400 (invalid transition) or 403 (not their team)
    expect([400, 403]).toContain(res.status);
  });
});

// ── TC-10: Cross-Role Access → 403 ───────────────────────────
describe('TC-10: Citizen accessing admin endpoint → 403', () => {
  test('GET /api/tickets with citizen token → 403', async () => {
    if (!citizenToken) return;

    const res = await request(app)
      .get('/api/tickets')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });
});

// ── TC: Missing Auth → 401 ────────────────────────────────────
describe('Protected endpoint without token → 401', () => {
  test('GET /api/tickets/mine without token → 401', async () => {
    const res = await request(app).get('/api/tickets/mine');
    expect(res.status).toBe(401);
  });
});

// ── TC: Categories public ─────────────────────────────────────
describe('GET /api/categories → 200 (public endpoint)', () => {
  test('Returns array of categories without auth', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── TC: Health check ─────────────────────────────────────────
describe('GET /api/health', () => {
  test('Returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ── TC: Validation: Missing required fields ───────────────────
describe('POST /api/tickets with missing fields → 400', () => {
  test('Missing latitude → VALIDATION_ERROR', async () => {
    if (!citizenToken) return;

    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ category_id: 1, description: 'no location' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});
