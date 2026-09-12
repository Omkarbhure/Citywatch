import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../server.js';
import User from '../../models/User.js';
import Incident from '../../models/Incident.js';

describe('Analytics API Integration Tests (/api/analytics)', () => {
  let citizenUser;
  let authorityUser;
  let authorityToken;
  let citizenToken;

  const generateToken = (user) => {
    return jwt.sign(
      { id: user._id.toString(), role: user.role, name: user.name },
      process.env.JWT_SECRET || 'test-jwt-secret-for-citywatch-testing-32-chars-long',
      { expiresIn: '1d' }
    );
  };

  beforeEach(async () => {
    citizenUser = await User.create({
      name: 'Analytics Citizen',
      email: 'anlycitizen@example.com',
      password: 'Password123!',
      role: 'citizen',
    });
    citizenToken = generateToken(citizenUser);

    authorityUser = await User.create({
      name: 'Analytics Authority',
      email: 'anlyauth@police.gov',
      password: 'Password123!',
      role: 'authority',
    });
    authorityToken = generateToken(authorityUser);
  });

  it('ANLY-01: Citizen attempting to access /api/analytics receives 403 Forbidden', async () => {
    await request(app)
      .get('/api/analytics')
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(403);
  });

  it('ANLY-02: Returns accurate category and status counts for seeded deterministic dataset', async () => {
    const now = new Date();
    // Seed 2 potholes (1 pending, 1 resolved) and 1 flooding (in_progress)
    await Incident.create([
      {
        reporter: citizenUser._id,
        title: 'Pothole 1',
        description: 'Desc',
        category: 'pothole',
        status: 'pending',
        createdAt: now,
        location: { type: 'Point', coordinates: [77.59, 12.97] },
      },
      {
        reporter: citizenUser._id,
        title: 'Pothole 2',
        description: 'Desc',
        category: 'pothole',
        status: 'resolved',
        createdAt: new Date(now.getTime() - 10 * 3600 * 1000),
        statusHistory: [
          {
            status: 'resolved',
            changedBy: authorityUser._id,
            timestamp: now,
            note: 'Resolved',
          },
        ],
        location: { type: 'Point', coordinates: [77.59, 12.97] },
      },
      {
        reporter: citizenUser._id,
        title: 'Flooding 1',
        description: 'Desc',
        category: 'flooding',
        status: 'in_progress',
        createdAt: now,
        location: { type: 'Point', coordinates: [77.60, 12.98] },
      },
    ]);

    const res = await request(app)
      .get('/api/analytics')
      .set('Authorization', `Bearer ${authorityToken}`)
      .expect(200);

    expect(res.body.summary.totalIncidents).toBe(3);

    const potholeCat = res.body.categories.find((c) => c.category === 'pothole');
    const floodCat = res.body.categories.find((c) => c.category === 'flooding');
    expect(potholeCat.count).toBe(2);
    expect(floodCat.count).toBe(1);

    const pendingStatus = res.body.statuses.find((s) => s.status === 'pending');
    const resolvedStatus = res.body.statuses.find((s) => s.status === 'resolved');
    expect(pendingStatus.count).toBe(1);
    expect(resolvedStatus.count).toBe(1);
  });

  it('ANLY-03: Computes exact average resolution time for resolved incidents', async () => {
    const createdTime = new Date('2026-03-01T10:00:00.000Z');
    // Resolution after exactly 4 hours (14:00:00)
    const resolvedTime = new Date('2026-03-01T14:00:00.000Z');

    await Incident.create({
      reporter: citizenUser._id,
      title: 'Quickly Resolved Pothole',
      description: 'Desc',
      category: 'pothole',
      status: 'resolved',
      createdAt: createdTime,
      statusHistory: [
        {
          status: 'resolved',
          changedBy: authorityUser._id,
          timestamp: resolvedTime,
          note: 'Done in 4 hours',
        },
      ],
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    const res = await request(app)
      .get('/api/analytics?from=2026-03-01T00:00:00.000Z&to=2026-03-02T00:00:00.000Z')
      .set('Authorization', `Bearer ${authorityToken}`)
      .expect(200);

    expect(res.body.summary.avgResolutionHours).toBe(4);
  });

  it('ANLY-04: Identifies SLA breaches for unresolved incidents older than SLA threshold', async () => {
    // 100 hours ago (> 72 hours standard SLA)
    const breachDate = new Date(Date.now() - 100 * 60 * 60 * 1000);
    // 10 hours ago (< 72 hours SLA)
    const recentDate = new Date(Date.now() - 10 * 60 * 60 * 1000);

    await Incident.create([
      {
        reporter: citizenUser._id,
        title: 'Old Unresolved Incident',
        description: 'Breached SLA',
        category: 'safety',
        status: 'pending',
        createdAt: breachDate,
        location: { type: 'Point', coordinates: [77.59, 12.97] },
      },
      {
        reporter: citizenUser._id,
        title: 'Recent Pending Incident',
        description: 'Within SLA',
        category: 'safety',
        status: 'pending',
        createdAt: recentDate,
        location: { type: 'Point', coordinates: [77.59, 12.97] },
      },
    ]);

    const res = await request(app)
      .get('/api/analytics?slaHours=72')
      .set('Authorization', `Bearer ${authorityToken}`)
      .expect(200);

    expect(res.body.summary.slaBreachCount).toBe(1);
    expect(res.body.slaBreaches.length).toBe(1);
    expect(res.body.slaBreaches[0].title).toBe('Old Unresolved Incident');
  });

  it('ANLY-05: Date-range filtering excludes incidents outside specified window', async () => {
    const inRangeDate = new Date('2026-02-15T12:00:00.000Z');
    const outOfRangeDate = new Date('2025-12-01T12:00:00.000Z');

    await Incident.create([
      {
        reporter: citizenUser._id,
        title: 'In Range Incident',
        description: 'Desc',
        category: 'pothole',
        createdAt: inRangeDate,
        location: { type: 'Point', coordinates: [77.59, 12.97] },
      },
      {
        reporter: citizenUser._id,
        title: 'Out of Range Incident',
        description: 'Desc',
        category: 'pothole',
        createdAt: outOfRangeDate,
        location: { type: 'Point', coordinates: [77.59, 12.97] },
      },
    ]);

    const res = await request(app)
      .get('/api/analytics?from=2026-02-01T00:00:00.000Z&to=2026-02-28T23:59:59.000Z')
      .set('Authorization', `Bearer ${authorityToken}`)
      .expect(200);

    expect(res.body.summary.totalIncidents).toBe(1);
  });

  it('ANLY-06: Inverted date range (from > to) is rejected with 400 Bad Request', async () => {
    // 1. Test inverted range (from after to)
    const errRes = await request(app)
      .get('/api/analytics?from=2026-12-31T00:00:00.000Z&to=2026-01-01T00:00:00.000Z')
      .set('Authorization', `Bearer ${authorityToken}`)
      .expect(400);

    expect(errRes.body.message).toMatch(/'from' date must be on or before 'to' date/i);

    // 2. Test valid boundary range where from === to (returns 200)
    const validRes = await request(app)
      .get('/api/analytics?from=2026-06-01T00:00:00.000Z&to=2026-06-01T00:00:00.000Z')
      .set('Authorization', `Bearer ${authorityToken}`)
      .expect(200);

    expect(validRes.body.summary).toBeDefined();
  });
});
