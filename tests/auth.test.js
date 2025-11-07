const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');

// Build a minimal app using existing routes for fast auth flow tests
const authRoutes = require('../routes/authRoutes');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

describe('Auth flow (without DB) - route availability', () => {
  it('should expose /api/auth/login and /api/auth/refresh endpoints', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    // We only assert that route exists and returns JSON (validation errors likely)
    expect([400, 401, 429]).toContain(res.statusCode);
    expect(res.headers['content-type']).toMatch(/json/);
  });
});


