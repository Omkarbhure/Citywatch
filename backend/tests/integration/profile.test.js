import request from 'supertest';
import { app, loginLimiter, registerLimiter, authLimiter } from '../../server.js';
import User from '../../models/User.js';

describe('User Profile API Integration Tests (/api/auth/profile & /me)', () => {
  const citizenData = {
    name: 'Omkar Profile',
    email: 'omkar.profile@example.com',
    password: 'Password123!',
  };

  let token;
  let userId;

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

    const regRes = await request(app)
      .post('/api/auth/register')
      .send(citizenData)
      .expect(201);

    token = regRes.body.token;
    userId = regRes.body._id;
  });

  it('PROF-01: Retrieves user profile including default empty phone, address, and avatar fields', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.email).toBe(citizenData.email.toLowerCase());
    expect(res.body.name).toBe(citizenData.name);
    expect(res.body.phone).toBe('');
    expect(res.body.address).toBe('');
    expect(res.body.avatar).toBe('');
    expect(res.body.password).toBeUndefined();
  });

  it('PROF-02: Successfully updates user phone number, address, and photo avatar', async () => {
    const updatePayload = {
      name: 'Omkar Updated',
      phone: '+91 9876543210',
      address: '42 MG Road, Sector 4, Bengaluru, Karnataka',
      avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };

    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send(updatePayload)
      .expect(200);

    expect(res.body.name).toBe(updatePayload.name);
    expect(res.body.phone).toBe(updatePayload.phone);
    expect(res.body.address).toBe(updatePayload.address);
    expect(res.body.avatar).toBe(updatePayload.avatar);

    // Verify stored in DB
    const storedUser = await User.findById(userId);
    expect(storedUser.name).toBe(updatePayload.name);
    expect(storedUser.phone).toBe(updatePayload.phone);
    expect(storedUser.address).toBe(updatePayload.address);
    expect(storedUser.avatar).toBe(updatePayload.avatar);
  });

  it('PROF-03: Rejects profile update without authorization token with 401', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .send({ phone: '1234567890' })
      .expect(401);

    expect(res.body.message).toMatch(/not authorized|token/i);
  });

  it('PROF-04: Allows partial updates (updating only phone and address without affecting avatar or name)', async () => {
    const partialPayload = {
      phone: '+91 9999988888',
      address: '77 Brigade Road, Bengaluru',
    };

    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send(partialPayload)
      .expect(200);

    expect(res.body.name).toBe(citizenData.name); // Preserved
    expect(res.body.phone).toBe(partialPayload.phone);
    expect(res.body.address).toBe(partialPayload.address);
  });
});
