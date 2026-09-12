import request from 'supertest';
import { app, loginLimiter, registerLimiter, authLimiter } from '../../server.js';
import User from '../../models/User.js';

describe('Auth API Integration Tests (/api/auth)', () => {
  const validCitizen = {
    name: 'Jane Citizen',
    email: 'jane.citizen@example.com',
    password: 'Password123!',
  };

  const resetRateLimiter = async () => {
    const limiters = [loginLimiter, registerLimiter, authLimiter];
    for (const lim of limiters) {
      if (lim?.resetKey) {
        lim.resetKey('127.0.0.1');
        lim.resetKey('::ffff:127.0.0.1');
        lim.resetKey('::1');
      }
      if (lim?.store?.resetAll) {
        await lim.store.resetAll();
      }
    }
  };

  beforeEach(async () => {
    await resetRateLimiter();
  });

  it('AUTH-01: Successfully registers a new user with default role citizen and returns JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validCitizen)
      .expect(201);

    expect(res.body.token).toBeDefined();
    expect(res.body.email).toBe(validCitizen.email.toLowerCase());
    expect(res.body.role).toBe('citizen');
    expect(res.body.password).toBeUndefined();

    const storedUser = await User.findOne({ email: validCitizen.email.toLowerCase() });
    expect(storedUser).toBeDefined();
    expect(storedUser.role).toBe('citizen');
  });

  it('AUTH-02: Rejects duplicate email registration with 400', async () => {
    await request(app).post('/api/auth/register').send(validCitizen).expect(201);

    const duplicateRes = await request(app)
      .post('/api/auth/register')
      .send(validCitizen)
      .expect(400);

    expect(duplicateRes.body.message).toMatch(/already registered|already exists/i);
  });

  it('AUTH-03 (High Priority Security Regression): Explicit role-injection attempt forces role to citizen', async () => {
    const injectionAttempt = {
      name: 'Sneaky Attacker',
      email: 'attacker@example.com',
      password: 'Password123!',
      role: 'authority', // Attempting privilege escalation
    };

    const res = await request(app)
      .post('/api/auth/register')
      .send(injectionAttempt)
      .expect(201);

    // Assert that role returned in response is 'citizen', NOT 'authority'
    expect(res.body.role).toBe('citizen');

    // Assert that role stored in database is strictly 'citizen'
    const dbUser = await User.findOne({ email: injectionAttempt.email.toLowerCase() });
    expect(dbUser).toBeDefined();
    expect(dbUser.role).toBe('citizen');
  });

  it('AUTH-04: Successfully logs in with valid credentials and returns JWT', async () => {
    await request(app).post('/api/auth/register').send(validCitizen).expect(201);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: validCitizen.email,
        password: validCitizen.password,
      })
      .expect(200);

    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.email).toBe(validCitizen.email.toLowerCase());
    expect(loginRes.body.role).toBe('citizen');
  });

  it('AUTH-05: Rejects login with invalid password with 401', async () => {
    await request(app).post('/api/auth/register').send(validCitizen).expect(201);

    const failRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: validCitizen.email,
        password: 'WrongPassword999!',
      })
      .expect(401);

    expect(failRes.body.message).toMatch(/invalid.*(credentials|email|password)/i);
  });

  it('AUTH-09: Rejects access to protected route /api/auth/me without token (401)', async () => {
    const res = await request(app).get('/api/auth/me').expect(401);
    expect(res.body.message).toMatch(/not authorized|token/i);
  });

  it('AUTH-08: Allows authenticated user to retrieve own profile via /api/auth/me', async () => {
    const regRes = await request(app).post('/api/auth/register').send(validCitizen).expect(201);
    const token = regRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meRes.body.email).toBe(validCitizen.email.toLowerCase());
    expect(meRes.body.role).toBe('citizen');
  });

  describe('AUTH-06: Rate Limiting Enforcement on Auth Endpoints', () => {
    it('AUTH-06a: Rejects login requests with 429 when exceeding threshold (3 requests)', async () => {
      // First request: assert rate limit standard headers and 401 for bad credentials
      const res1 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@example.com', password: 'WrongPassword123!' })
        .expect(401);

      expect(res1.headers['ratelimit-limit'] || res1.headers['x-ratelimit-limit']).toBeDefined();
      expect(res1.headers['ratelimit-remaining'] || res1.headers['x-ratelimit-remaining']).toBeDefined();

      // Requests 2 and 3 within threshold return 401
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@example.com', password: 'WrongPassword123!' })
        .expect(401);

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@example.com', password: 'WrongPassword123!' })
        .expect(401);

      // 4th request exceeds threshold (AUTH_RATE_LIMIT_MAX = 3) -> 429 Too Many Requests
      const limitRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@example.com', password: 'WrongPassword123!' })
        .expect(429);

      expect(limitRes.body.message).toMatch(/too many attempts|rate limit/i);
    });

    it('AUTH-06b: Rejects registration requests with 429 when exceeding threshold (3 requests)', async () => {
      // Request 1: Initial successful registration (201)
      await request(app)
        .post('/api/auth/register')
        .send(validCitizen)
        .expect(201);

      // Requests 2 and 3: Duplicate registrations return 400 Bad Request
      await request(app)
        .post('/api/auth/register')
        .send(validCitizen)
        .expect(400);

      await request(app)
        .post('/api/auth/register')
        .send(validCitizen)
        .expect(400);

      // 4th request exceeds threshold -> 429 Too Many Requests
      const limitRes = await request(app)
        .post('/api/auth/register')
        .send(validCitizen)
        .expect(429);

      expect(limitRes.body.message).toMatch(/too many attempts|rate limit/i);
    });

    it('AUTH-06c: Confirms /api/auth/me is not blocked by the auth rate limiter', async () => {
      const regRes = await request(app).post('/api/auth/register').send(validCitizen).expect(201);
      const token = regRes.body.token;

      // Exhaust login rate limiter quota (3 failed login attempts)
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'unknown@example.com', password: 'WrongPassword123!' })
          .expect(401);
      }

      // 4th login is blocked with 429
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@example.com', password: 'WrongPassword123!' })
        .expect(429);

      // /api/auth/me is unaffected and continues to succeed (200)
      for (let i = 0; i < 5; i++) {
        const meRes = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(meRes.body.email).toBe(validCitizen.email.toLowerCase());
      }
    });
  });
});
