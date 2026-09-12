import mongoose from 'mongoose';
import Incident from '../../../models/Incident.js';
import User from '../../../models/User.js';

describe('Incident Model Unit Tests', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await User.create({
      name: 'Test Citizen',
      email: 'incident-model-test@example.com',
      password: 'password123',
      role: 'citizen',
    });
  });

  it('validates required fields: reporter, title, description, category, location.coordinates', async () => {
    const invalidIncident = new Incident({});
    let error;
    try {
      await invalidIncident.validate();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.reporter).toBeDefined();
    expect(error.errors.title).toBeDefined();
    expect(error.errors.description).toBeDefined();
    expect(error.errors.category).toBeDefined();
    expect(error.errors['location.coordinates']).toBeDefined();
  });

  it('enforces enum constraints for category, status, and priority', async () => {
    const invalidEnums = new Incident({
      reporter: testUser._id,
      title: 'Invalid Enum Test',
      description: 'Testing invalid enums',
      category: 'alien_invasion', // invalid
      status: 'flying', // invalid
      priority: 'super_urgent', // invalid
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    let error;
    try {
      await invalidEnums.validate();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.category).toBeDefined();
    expect(error.errors.status).toBeDefined();
    expect(error.errors.priority).toBeDefined();
  });

  it('sets correct default values: status=pending, priority=medium, empty arrays for upvotes and media', async () => {
    const validIncident = await Incident.create({
      reporter: testUser._id,
      title: 'Valid Default Test',
      description: 'Testing defaults',
      category: 'pothole',
      location: { type: 'Point', coordinates: [77.59, 12.97] },
    });

    expect(validIncident.status).toBe('pending');
    expect(validIncident.priority).toBe('medium');
    expect(Array.isArray(validIncident.upvotes)).toBe(true);
    expect(validIncident.upvotes.length).toBe(0);
    expect(Array.isArray(validIncident.media)).toBe(true);
    expect(validIncident.media.length).toBe(0);
    expect(validIncident.location.type).toBe('Point');
  });

  it('confirms 2dsphere spatial index exists on location field', async () => {
    await Incident.init(); // Ensure indexes are built
    const indexes = await Incident.collection.indexes();
    const sphereIndex = indexes.find((idx) => idx.key && idx.key.location === '2dsphere');

    expect(sphereIndex).toBeDefined();
  });
});
