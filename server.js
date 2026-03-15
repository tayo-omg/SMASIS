require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./auth');
const ticketRoutes = require('./tickets');
const { reportsRouter, catRouter } = require('./reports');

const app = express();
const PORT = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  credentials: false,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log('[' + new Date().toISOString() + '] ' + req.method + ' ' + req.path + ' ' + res.statusCode + ' (' + duration + 'ms)');
  });
  next();
});

// ROUTES
app.use('/api/auth',       authRoutes);
app.use('/api/tickets',    ticketRoutes);
app.use('/api/reports',    reportsRouter);
app.use('/api/categories', catRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'SmaWaSIS API' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route ' + req.method + ' ' + req.path + ' not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred' });
});

// START
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log('SmaWaSIS API running on port ' + PORT);
  });
}

module.exports = app;
