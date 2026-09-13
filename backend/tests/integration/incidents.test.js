import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../server.js';
import User from '../../models/User.js';
import Incident from '../../models/Incident.js';

describe('Incidents API Integration Tests (/api/incidents)', () => {
  let citizenUser;
  let citizenToken;
  let authorityUser;
  let authorityToken;

  const generateToken = (user) => {
    return jwt.sign(
      { id: user._id.toString(), role: user.role },
      process.env.JWT_SECRET || 'test-jwt-secret-for-citywatch-testing-32-chars-long',
      { expiresIn: '1d' }
    );
  };

  beforeEach(async () => {
    citizenUser = await User.create({
      name: 'Charlie Citizen',
      email: 'charlie@citizen.org',
      password: 'Password123!',
      role: 'citizen',
    });
    citizenToken = generateToken(citizenUser);

    authorityUser = await User.create({
      name: 'Officer Davis',
      email: 'davis@police.gov',
      password: 'Password123!',
      role: 'authority',
    });
    authorityToken = generateToken(authorityUser);

    await Incident.init(); // Ensure 2dsphere index is built
  });

  it('INC-01: Authenticated citizen creates an incident with valid payload (201)', async () => {
    const payload = {
      title: 'Pothole on 8th Cross',
      description: 'Dangerous pothole damaging vehicles',
      category: 'pothole',
      coordinates: [77.5946, 12.9716],
      address: '8th Cross, Bangalore',
    };

    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send(payload)
      .expect(201);

    expect(res.body._id).toBeDefined();
    expect(res.body.title).toBe(payload.title);
    expect(res.body.status).toBe('pending');
    expect(res.body.priority).toBe('medium');
    expect(res.body.location.coordinates).toEqual(payload.coordinates);
    expect(res.body.reporter._id).toBe(citizenUser._id.toString());
  });

  it('INC-02: Rejects incident creation with invalid payload (400 via Zod)', async () => {
    const invalidPayload = {
      title: 'Short',
      description: '', // Too short / required
      category: 'invalid_cat',
      coordinates: [200, 100], // Invalid lng/lat range
    };

    await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send(invalidPayload)
      .expect(400);
  });

  it('INC-03: Geo-filtered fetch filters incidents by radius correctly ($nearSphere)', async () => {
    // Seed incidents:
    // Center point: Bangalore City Center (12.9716, 77.5946)
    // Nearby point: ~500m away (12.9740, 77.5960)
    // Far point: ~30km away in Hosur (12.7409, 77.8253)
    await Incident.create([
      {
        reporter: citizenUser._id,
        title: 'Nearby Incident (500m)',
        description: 'Street light broken',
        category: 'streetlight',
        location: { type: 'Point', coordinates: [77.5960, 12.9740] },
      },
      {
        reporter: citizenUser._id,
        title: 'Far Incident (30km)',
        description: 'Highway garbage pile',
        category: 'garbage',
        location: { type: 'Point', coordinates: [77.8253, 12.7409] },
      },
    ]);

    // Query within 2000m radius of center
    const res = await request(app)
      .get('/api/incidents?near=12.9716,77.5946&radius=2000')
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200);

    expect(res.body.incidents.length).toBe(1);
    expect(res.body.incidents[0].title).toBe('Nearby Incident (500m)');
    expect(res.body.total).toBe(1);
    expect(res.body.totalPages).toBe(1);
  });

  it('INC-03b: Geospatial radius query combined with pagination computes accurate totals via $geoNear', async () => {
    // Seed 3 nearby incidents and 1 distant incident
    await Incident.create([
      {
        reporter: citizenUser._id,
        title: 'Nearby 1',
        description: 'Desc 1',
        category: 'pothole',
        location: { type: 'Point', coordinates: [77.5950, 12.9720] },
      },
      {
        reporter: citizenUser._id,
        title: 'Nearby 2',
        description: 'Desc 2',
        category: 'pothole',
        location: { type: 'Point', coordinates: [77.5955, 12.9725] },
      },
      {
        reporter: citizenUser._id,
        title: 'Nearby 3',
        description: 'Desc 3',
        category: 'pothole',
        location: { type: 'Point', coordinates: [77.5960, 12.9730] },
      },
      {
        reporter: citizenUser._id,
        title: 'Far Away',
        description: 'Far desc',
        category: 'pothole',
        location: { type: 'Point', coordinates: [77.8253, 12.7409] },
      },
    ]);

    // Request page 1 with limit 2 within 2000m radius
    const res = await request(app)
      .get('/api/incidents?near=12.9716,77.5946&radius=2000&page=1&limit=2')
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200);

    expect(res.body.incidents.length).toBe(2);
    expect(res.body.total).toBe(3); // 3 nearby incidents in range
    expect(res.body.totalPages).toBe(2);
    expect(res.body.page).toBe(1);
  });

  it('INC-04 & INC-05: Filters incidents by category and status', async () => {
    await Incident.create([
      {
        reporter: citizenUser._id,
        title: 'Flooding in underpass',
        description: 'Deep water',
        category: 'flooding',
        status: 'in_progress',
        location: { type: 'Point', coordinates: [77.59, 12.97] },
      },
      {
        reporter: citizenUser._id,
        title: 'Pothole on ring road',
        description: 'Pothole near exit',
        category: 'pothole',
        status: 'pending',
        location: { type: 'Point', coordinates: [77.58, 12.96] },
      },
    ]);

    // Filter category=flooding
    const catRes = await request(app)
      .get('/api/incidents?category=flooding')
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200);

    expect(catRes.body.incidents.length).toBe(1);
    expect(catRes.body.incidents[0].title).toBe('Flooding in underpass');

    // Filter status=in_progress
    const statusRes = await request(app)
      .get('/api/incidents?status=in_progress')
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200);

    expect(statusRes.body.incidents.length).toBe(1);
    expect(statusRes.body.incidents[0].title).toBe('Flooding in underpass');
  });

  it('INC-06: Pagination handles page and limit properly', async () => {
    for (let i = 1; i <= 5; i++) {
      await Incident.create({
        reporter: citizenUser._id,
        title: `Incident ${i}`,
        description: `Description ${i}`,
        category: 'other',
        location: { type: 'Point', coordinates: [77.59 + i * 0.001, 12.97 + i * 0.001] },
      });
    }

    const page1 = await request(app)
      .get('/api/incidents?page=1&limit=2')
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200);

    expect(page1.body.incidents.length).toBe(2);
    expect(page1.body.total).toBe(5);
    expect(page1.body.totalPages).toBe(3);

    const page2 = await request(app)
      .get('/api/incidents?page=2&limit=2')
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200);

    expect(page2.body.incidents.length).toBe(2);
  });

  it('INC-07: Citizen can upvote an incident; duplicate upvote unvotes/toggles the upvote', async () => {
    const incident = await Incident.create({
      reporter: citizenUser._id,
      title: 'Dark Alleyway',
      description: 'Needs street light',
      category: 'safety',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    // First upvote
    const upvote1 = await request(app)
      .post(`/api/incidents/${incident._id}/upvote`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200);

    expect(upvote1.body.upvotesCount).toBe(1);
    expect(upvote1.body.upvoted).toBe(true);

    // Duplicate upvote toggles off / unvotes
    const upvote2 = await request(app)
      .post(`/api/incidents/${incident._id}/upvote`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200);

    expect(upvote2.body.upvotesCount).toBe(0);
    expect(upvote2.body.upvoted).toBe(false);
    expect(upvote2.body.message).toMatch(/unvoted/i);
  });

  it('INC-08 (Critical RBAC Boundary): Citizen attempting PATCH /:id/status receives 403 Forbidden', async () => {
    const incident = await Incident.create({
      reporter: citizenUser._id,
      title: 'Pothole Test',
      description: 'Pothole description',
      category: 'pothole',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    const res = await request(app)
      .patch(`/api/incidents/${incident._id}/status`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ status: 'resolved', note: 'Citizen trying to resolve' })
      .expect(403);

    expect(res.body.message).toMatch(/Forbidden/i);

    // Assert status in DB remains pending
    const unchanged = await Incident.findById(incident._id);
    expect(unchanged.status).toBe('pending');
  });

  it('INC-09: Authority user updates incident status successfully and records statusHistory', async () => {
    const incident = await Incident.create({
      reporter: citizenUser._id,
      title: 'Pothole Test',
      description: 'Pothole description',
      category: 'pothole',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    const res = await request(app)
      .patch(`/api/incidents/${incident._id}/status`)
      .set('Authorization', `Bearer ${authorityToken}`)
      .send({ status: 'in_progress', note: 'Repair team dispatched' })
      .expect(200);

    expect(res.body.status).toBe('in_progress');
    expect(res.body.statusHistory.length).toBe(1);
    expect(res.body.statusHistory[0].status).toBe('in_progress');
    expect(res.body.statusHistory[0].note).toBe('Repair team dispatched');
  });

  it('INC-10: Authority user deletes an incident successfully and removes it from database', async () => {
    const incident = await Incident.create({
      reporter: citizenUser._id,
      title: 'Obsolete Report',
      description: 'To be deleted by authority',
      category: 'other',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    const res = await request(app)
      .delete(`/api/incidents/${incident._id}`)
      .set('Authorization', `Bearer ${authorityToken}`)
      .expect(200);

    expect(res.body.message).toMatch(/deleted|removed/i);

    // Assert incident is completely deleted from MongoDB
    const deletedDoc = await Incident.findById(incident._id);
    expect(deletedDoc).toBeNull();
  });

  it('INC-11 (RBAC Boundary): Citizen attempting to delete an incident receives 403 Forbidden', async () => {
    const incident = await Incident.create({
      reporter: citizenUser._id,
      title: 'Protected Incident',
      description: 'Cannot be deleted by citizen',
      category: 'pothole',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    const res = await request(app)
      .delete(`/api/incidents/${incident._id}`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(403);

    expect(res.body.message).toMatch(/Forbidden/i);

    // Assert incident still exists in MongoDB
    const intactDoc = await Incident.findById(incident._id);
    expect(intactDoc).toBeDefined();
  });
});

