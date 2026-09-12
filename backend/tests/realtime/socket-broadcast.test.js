import request from 'supertest';
import { io as ClientIO } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { app, httpServer, io } from '../../server.js';
import User from '../../models/User.js';
import Incident from '../../models/Incident.js';

describe('Real-Time Socket.IO Integration Tests', () => {
  let serverPort;
  let citizenUser1;
  let citizenUser2;
  let authorityUser;
  let citizenToken1;
  let citizenToken2;
  let authorityToken;

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
    citizenUser1 = await User.create({
      name: 'Realtime Citizen 1',
      email: 'rt1@example.com',
      password: 'Password123!',
      role: 'citizen',
    });
    citizenToken1 = generateToken(citizenUser1);

    citizenUser2 = await User.create({
      name: 'Realtime Citizen 2',
      email: 'rt2@example.com',
      password: 'Password123!',
      role: 'citizen',
    });
    citizenToken2 = generateToken(citizenUser2);

    authorityUser = await User.create({
      name: 'Realtime Officer',
      email: 'rtofficer@police.gov',
      password: 'Password123!',
      role: 'authority',
    });
    authorityToken = generateToken(authorityUser);
  });

  const connectClient = (token) => {
    return ClientIO(`http://127.0.0.1:${serverPort}`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: false,
    });
  };

  it('RT-01: Rejects socket handshake connection without valid JWT (fires connect_error)', async () => {
    const invalidSocket = ClientIO(`http://127.0.0.1:${serverPort}`, {
      auth: { token: 'invalid-or-missing-token' },
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: false,
    });

    const error = await new Promise((resolve) => {
      invalidSocket.on('connect_error', resolve);
    });

    expect(error.message).toMatch(/Authentication error|token/i);
    invalidSocket.disconnect();
  });

  it('RT-02: Broadcasts incident:new to all clients subscribed to the incident geo room', async () => {
    const client1 = connectClient(citizenToken1);
    const client2 = connectClient(citizenToken2);

    const lat = 12.9716;
    const lng = 77.5946;

    await Promise.all([
      new Promise((resolve) => client1.on('connect', resolve)),
      new Promise((resolve) => client2.on('connect', resolve)),
    ]);

    client1.emit('subscribe:area', { lat, lng });
    client2.emit('subscribe:area', { lat, lng });
    await new Promise((r) => setTimeout(r, 50));

    const p1 = new Promise((resolve) => {
      client1.on('incident:new', (inc) => {
        expect(inc.title).toBe('Live Streetlight Outage');
        resolve();
      });
    });

    const p2 = new Promise((resolve) => {
      client2.on('incident:new', (inc) => {
        expect(inc.title).toBe('Live Streetlight Outage');
        resolve();
      });
    });

    await request(httpServer)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${citizenToken1}`)
      .send({
        title: 'Live Streetlight Outage',
        description: 'Dark junction causing danger',
        category: 'streetlight',
        coordinates: [lng, lat],
      })
      .expect(201);

    await Promise.all([p1, p2]);
    client1.disconnect();
    client2.disconnect();
  });

  it('RT-03: Does NOT broadcast incident:new to a client in a different distant geo room', async () => {
    const localClient = connectClient(citizenToken1);
    const distantClient = connectClient(citizenToken2);

    const localCoords = { lat: 12.9716, lng: 77.5946 }; // Bangalore
    const distantCoords = { lat: 37.7749, lng: -122.4194 }; // San Francisco

    await Promise.all([
      new Promise((resolve) => localClient.on('connect', resolve)),
      new Promise((resolve) => distantClient.on('connect', resolve)),
    ]);

    localClient.emit('subscribe:area', localCoords);
    distantClient.emit('subscribe:area', distantCoords);
    await new Promise((r) => setTimeout(r, 50));

    let distantReceived = false;
    distantClient.on('incident:new', () => {
      distantReceived = true;
    });

    const localPromise = new Promise((resolve) => {
      localClient.on('incident:new', resolve);
    });

    await request(httpServer)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${citizenToken1}`)
      .send({
        title: 'Bangalore Local Event',
        description: 'Local event description',
        category: 'pothole',
        coordinates: [localCoords.lng, localCoords.lat],
      })
      .expect(201);

    await localPromise;
    await new Promise((r) => setTimeout(r, 100)); // verify distant did not receive
    expect(distantReceived).toBe(false);

    localClient.disconnect();
    distantClient.disconnect();
  });

  it('RT-04: Broadcasts incident:updated on status change and incident:upvoted on upvote', async () => {
    const client = connectClient(citizenToken1);
    const lat = 12.9716;
    const lng = 77.5946;

    await new Promise((resolve) => client.on('connect', resolve));
    client.emit('subscribe:area', { lat, lng });
    await new Promise((r) => setTimeout(r, 50));

    const incident = await Incident.create({
      reporter: citizenUser1._id,
      title: 'Status Update Live Test',
      description: 'Desc',
      category: 'flooding',
      location: { type: 'Point', coordinates: [lng, lat] },
    });

    client.emit('subscribe:incident', incident._id.toString());
    await new Promise((r) => setTimeout(r, 50));

    // Test incident:updated
    const updatedPromise = new Promise((resolve) => {
      client.on('incident:updated', (updated) => {
        expect(updated._id).toBe(incident._id.toString());
        expect(updated.status).toBe('in_progress');
        resolve();
      });
    });

    await request(httpServer)
      .patch(`/api/incidents/${incident._id}/status`)
      .set('Authorization', `Bearer ${authorityToken}`)
      .send({ status: 'in_progress' })
      .expect(200);

    await updatedPromise;

    // Test incident:upvoted
    const upvotedPromise = new Promise((resolve) => {
      client.on('incident:upvoted', (data) => {
        expect(data.incidentId).toBe(incident._id.toString());
        expect(data.upvoteCount).toBe(1);
        resolve();
      });
    });

    await request(httpServer)
      .post(`/api/incidents/${incident._id}/upvote`)
      .set('Authorization', `Bearer ${citizenToken2}`)
      .expect(200);

    await upvotedPromise;
    client.disconnect();
  });
});
