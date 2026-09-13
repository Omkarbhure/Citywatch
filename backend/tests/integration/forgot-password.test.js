import request from 'supertest';
import { app, loginLimiter, registerLimiter, authLimiter } from '../../server.js';
import User from '../../models/User.js';
import Otp from '../../models/Otp.js';

describe('Forgot Password & OTP Flow Integration Tests (/api/auth)', () => {
  const testUser = {
    name: 'Forgot Password Test User',
    email: 'otp.user@example.com',
    password: 'OldPassword123!',
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
    await User.deleteMany({});
    await Otp.deleteMany({});

    // Register user directly
    await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);
  });

  it('FP-01: Generates and returns dummy OTP for registered email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email })
      .expect(200);

    expect(res.body.message).toMatch(/OTP sent/i);
    expect(res.body.dummyOtp).toBe('123456');

    // Confirm OTP is stored in database
    const otpDoc = await Otp.findOne({ email: testUser.email });
    expect(otpDoc).toBeDefined();
    expect(otpDoc.otp).toBe('123456');
  });

  it('FP-02: Returns 404 when requesting OTP for an unregistered email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' })
      .expect(404);

    expect(res.body.message).toMatch(/no account/i);
  });

  it('FP-03: Rejects invalid email format with 400 via Zod validation', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'not-an-email' })
      .expect(400);

    expect(res.body.errors || res.body.message).toBeDefined();
  });

  it('FP-04: Verifies valid OTP successfully via /api/auth/verify-otp', async () => {
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email })
      .expect(200);

    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: testUser.email, otp: '123456' })
      .expect(200);

    expect(verifyRes.body.valid).toBe(true);
  });

  it('FP-05: Rejects invalid OTP with 400', async () => {
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email })
      .expect(200);

    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: testUser.email, otp: '999999' })
      .expect(400);

    expect(verifyRes.body.message).toMatch(/invalid or expired/i);
  });

  it('FP-06: Resets password successfully with valid OTP and updates credentials in database', async () => {
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email })
      .expect(200);

    const newPassword = 'BrandNewPassword456!';

    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email: testUser.email,
        otp: '123456',
        newPassword,
      })
      .expect(200);

    expect(resetRes.body.message).toMatch(/password reset successful/i);

    // Old password should now fail login
    await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(401);

    // New password should succeed login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: newPassword,
      })
      .expect(200);

    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.email).toBe(testUser.email);

    // Used OTP should be deleted from DB
    const otpDoc = await Otp.findOne({ email: testUser.email });
    expect(otpDoc).toBeNull();
  });

  it('FP-07: Rejects password reset when OTP is wrong', async () => {
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email })
      .expect(200);

    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email: testUser.email,
        otp: '000000',
        newPassword: 'BrandNewPassword456!',
      })
      .expect(400);

    expect(resetRes.body.message).toMatch(/invalid or expired/i);
  });
});
