import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../server.js';
import User from '../../models/User.js';
import Incident from '../../models/Incident.js';

describe('Authority Queue API Integration Tests (/api/incidents/queue, /assign, /unassign, /priority)', () => {
  let citizenUser;
  let authorityUser1;
  let authorityUser2;
  let authorityToken1;
  let authorityToken2;
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
      name: 'Sam Citizen',
      email: 'sam@citizen.com',
      password: 'Password123!',
      role: 'citizen',
    });
    citizenToken = generateToken(citizenUser);

    authorityUser1 = await User.create({
      name: 'Captain Marvel',
      email: 'marvel@police.gov',
      password: 'Password123!',
      role: 'authority',
    });
    authorityToken1 = generateToken(authorityUser1);

    authorityUser2 = await User.create({
      name: 'Sergeant Shield',
      email: 'shield@police.gov',
      password: 'Password123!',
      role: 'authority',
    });
    authorityToken2 = generateToken(authorityUser2);
  });

  it('AUTHD-01: Citizen attempting to access /api/incidents/queue receives 403 Forbidden', async () => {
    await request(app)
      .get('/api/incidents/queue')
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(403);
  });

  it('AUTHD-02: Default queue query excludes resolved and rejected incidents', async () => {
    await Incident.create([
      {
        reporter: citizenUser._id,
        title: 'Pending Issue',
        description: 'Pending desc',
        category: 'pothole',
        status: 'pending',
        location: { type: 'Point', coordinates: [77.59, 12.97] },
      },
      {
        reporter: citizenUser._id,
        title: 'Resolved Issue',
        description: 'Resolved desc',
        category: 'pothole',
        status: 'resolved',
        location: { type: 'Point', coordinates: [77.59, 12.97] },
      },
      {
        reporter: citizenUser._id,
        title: 'Rejected Issue',
        description: 'Rejected desc',
        category: 'pothole',
        status: 'rejected',
        location: { type: 'Point', coordinates: [77.59, 12.97] },
      },
    ]);

    const res = await request(app)
      .get('/api/incidents/queue')
      .set('Authorization', `Bearer ${authorityToken1}`)
      .expect(200);

    expect(res.body.incidents.length).toBe(1);
    expect(res.body.incidents[0].title).toBe('Pending Issue');
  });

  it('AUTHD-03: Authority user claims an unassigned incident via PATCH /:id/assign (200)', async () => {
    const incident = await Incident.create({
      reporter: citizenUser._id,
      title: 'Unassigned Pothole',
      description: 'Pothole desc',
      category: 'pothole',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    const res = await request(app)
      .patch(`/api/incidents/${incident._id}/assign`)
      .set('Authorization', `Bearer ${authorityToken1}`)
      .send({})
      .expect(200);

    expect(res.body.assignedTo._id).toBe(authorityUser1._id.toString());
  });

  it('AUTHD-04: Claim conflict returns 409 Conflict when another authority tries to claim without force', async () => {
    const incident = await Incident.create({
      reporter: citizenUser._id,
      title: 'Claimed Pothole',
      description: 'Pothole desc',
      category: 'pothole',
      assignedTo: authorityUser1._id,
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    const res = await request(app)
      .patch(`/api/incidents/${incident._id}/assign`)
      .set('Authorization', `Bearer ${authorityToken2}`)
      .send({ force: false })
      .expect(409);

    expect(res.body.message).toMatch(/already assigned/i);
  });

  it('AUTHD-05: Forced reassignment succeeds with force=true and records reason in statusHistory', async () => {
    const incident = await Incident.create({
      reporter: citizenUser._id,
      title: 'Claimed Pothole',
      description: 'Pothole desc',
      category: 'pothole',
      assignedTo: authorityUser1._id,
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    const res = await request(app)
      .patch(`/api/incidents/${incident._id}/assign`)
      .set('Authorization', `Bearer ${authorityToken2}`)
      .send({ force: true })
      .expect(200);

    expect(res.body.assignedTo._id).toBe(authorityUser2._id.toString());
    const lastHistory = res.body.statusHistory[res.body.statusHistory.length - 1];
    expect(lastHistory.note).toMatch(/Reassigned/i);
  });

  it('AUTHD-06: Custom priority sorting orders critical (4) > high (3) > medium (2) > low (1)', async () => {
    await Incident.create([
      {
        reporter: citizenUser._id,
        title: 'Low Priority Issue',
        description: 'Low desc',
        category: 'garbage',
        priority: 'low',
        location: { type: 'Point', coordinates: [77.59, 12.97] },
      },
      {
        reporter: citizenUser._id,
        title: 'Critical Priority Issue',
        description: 'Critical desc',
        category: 'safety',
        priority: 'critical',
        location: { type: 'Point', coordinates: [77.59, 12.97] },
      },
      {
        reporter: citizenUser._id,
        title: 'High Priority Issue',
        description: 'High desc',
        category: 'flooding',
        priority: 'high',
        location: { type: 'Point', coordinates: [77.59, 12.97] },
      },
      {
        reporter: citizenUser._id,
        title: 'Medium Priority Issue',
        description: 'Medium desc',
        category: 'pothole',
        priority: 'medium',
        location: { type: 'Point', coordinates: [77.59, 12.97] },
      },
    ]);

    const res = await request(app)
      .get('/api/incidents/queue?sortBy=priority')
      .set('Authorization', `Bearer ${authorityToken1}`)
      .expect(200);

    const titles = res.body.incidents.map((inc) => inc.title);
    expect(titles).toEqual([
      'Critical Priority Issue',
      'High Priority Issue',
      'Medium Priority Issue',
      'Low Priority Issue',
    ]);
  });

  it('AUTHD-07: Sort by oldest surfaces oldest reported incidents first', async () => {
    const baseTime = new Date('2026-01-01T10:00:00.000Z').getTime();
    await Incident.create([
      {
        reporter: citizenUser._id,
        title: 'Newer Incident',
        description: 'Newer desc',
        category: 'pothole',
        createdAt: new Date(baseTime + 10000),
        location: { type: 'Point', coordinates: [77.59, 12.97] },
      },
      {
        reporter: citizenUser._id,
        title: 'Oldest Incident',
        description: 'Oldest desc',
        category: 'streetlight',
        createdAt: new Date(baseTime),
        location: { type: 'Point', coordinates: [77.59, 12.97] },
      },
    ]);

    const res = await request(app)
      .get('/api/incidents/queue?sortBy=oldest')
      .set('Authorization', `Bearer ${authorityToken1}`)
      .expect(200);

    expect(res.body.incidents[0].title).toBe('Oldest Incident');
    expect(res.body.incidents[1].title).toBe('Newer Incident');
  });
});
