import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app, httpServer, io } from '../../server.js';
import User from '../../models/User.js';
import Incident from '../../models/Incident.js';
import PushSubscription from '../../models/PushSubscription.js';
import webpush from '../../config/webPush.js';
import * as socketModule from '../../socket/index.js';

describe('Push Notifications API Integration Tests (/api/push & status dispatch)', () => {
  let serverPort;
  let citizenUser;
  let citizenToken;
  let authorityUser;
  let authorityToken;

  const mockSubPayload = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-12345',
    keys: {
      p256dh: 'BNcRdreALRF8M+CNEnrollmentKeySample==',
      auth: 'tBHItSIAShVNsm==',
    },
  };

  const generateToken = (user) => {
    return jwt.sign(
      { id: user._id.toString(), role: user.role, name: user.name },
      process.env.JWT_SECRET || 'test-jwt-secret-for-citywatch-testing-32-chars-long',
      { expiresIn: '1d' }
    );
  };

  beforeAll(async () => {
    if (!httpServer.listening) {
      await new Promise((resolve) => httpServer.listen(0, resolve));
    }
    serverPort = httpServer.address().port;
  });

  afterAll(async () => {
    if (io) {
      io.disconnectSockets(true);
      await new Promise((resolve) => io.close(resolve));
    }
    if (httpServer) {
      httpServer.closeAllConnections?.();
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    webpush.sendNotification = jest.fn().mockResolvedValue({ statusCode: 201 });

    citizenUser = await User.create({
      name: 'Push Citizen',
      email: 'pushcitizen@example.com',
      password: 'Password123!',
      role: 'citizen',
    });
    citizenToken = generateToken(citizenUser);

    authorityUser = await User.create({
      name: 'Push Authority',
      email: 'pushauth@police.gov',
      password: 'Password123!',
      role: 'authority',
    });
    authorityToken = generateToken(authorityUser);
  });

  it('PUSH-01: Subscribes user and persists PushSubscription document (201)', async () => {
    const res = await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send(mockSubPayload)
      .expect(201);

    expect(res.body.message).toMatch(/saved successfully/i);

    const sub = await PushSubscription.findOne({ user: citizenUser._id });
    expect(sub).toBeDefined();
    expect(sub.endpoint).toBe(mockSubPayload.endpoint);
    expect(sub.keys.p256dh).toBe(mockSubPayload.keys.p256dh);
  });

  it('PUSH-02: Unsubscribes user and removes PushSubscription document (200)', async () => {
    await PushSubscription.create({
      user: citizenUser._id,
      endpoint: mockSubPayload.endpoint,
      keys: mockSubPayload.keys,
    });

    const res = await request(app)
      .post('/api/push/unsubscribe')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ endpoint: mockSubPayload.endpoint })
      .expect(200);

    expect(res.body.message).toMatch(/removed successfully/i);

    const sub = await PushSubscription.findOne({ user: citizenUser._id });
    expect(sub).toBeNull();
  });

  it('PUSH-03: Sends web push notification to disconnected reporter when status changes', async () => {
    // 1. Create incident reported by citizen
    const incident = await Incident.create({
      reporter: citizenUser._id,
      title: 'Water Main Break',
      description: 'Major leak',
      category: 'flooding',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    // 2. Persist subscription for citizen
    await PushSubscription.create({
      user: citizenUser._id,
      endpoint: mockSubPayload.endpoint,
      keys: mockSubPayload.keys,
    });

    // 3. Update status as authority
    await request(app)
      .patch(`/api/incidents/${incident._id}/status`)
      .set('Authorization', `Bearer ${authorityToken}`)
      .send({ status: 'in_progress', note: 'Crew on site' })
      .expect(200);

    // Wait for async push dispatch
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    const [subArg, payloadArg] = webpush.sendNotification.mock.calls[0];
    expect(subArg.endpoint).toBe(mockSubPayload.endpoint);

    const parsedPayload = JSON.parse(payloadArg);
    expect(parsedPayload.title).toBe('CityWatch Incident Update');
    expect(parsedPayload.body).toMatch(/IN PROGRESS/);
    expect(parsedPayload.incidentId).toBe(incident._id.toString());
  });

  it('PUSH-04: Does NOT invoke web push notification for a connected active user', async () => {
    const incident = await Incident.create({
      reporter: citizenUser._id,
      title: 'Active Connected User Test',
      description: 'Desc',
      category: 'pothole',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    await PushSubscription.create({
      user: citizenUser._id,
      endpoint: mockSubPayload.endpoint,
      keys: mockSubPayload.keys,
    });

    // Connect real socket for citizenUser to mark user as actively connected
    const client = (await import('socket.io-client')).io(`http://127.0.0.1:${serverPort}`, {
      auth: { token: citizenToken },
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: false,
    });

    await new Promise((resolve) => client.on('connect', resolve));

    await request(app)
      .patch(`/api/incidents/${incident._id}/status`)
      .set('Authorization', `Bearer ${authorityToken}`)
      .send({ status: 'resolved' })
      .expect(200);

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Because user is connected, push notification should NOT be dispatched
    expect(webpush.sendNotification).not.toHaveBeenCalled();

    client.disconnect();
  });
});
