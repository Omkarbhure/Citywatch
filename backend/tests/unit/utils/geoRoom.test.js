import { getGeoRoom, getGeoRoomsWithNeighbors } from '../../../utils/geoRoom.js';

describe('geoRoom Utility Unit Tests', () => {
  it('computes exact grid cell output for known coordinates', () => {
    // Equator / Origin (0, 0)
    const roomOrigin = getGeoRoom(0, 0);
    expect(roomOrigin).toBe('geo:0:0');

    // Known Bangalore coordinates (12.9716, 77.5946)
    const roomBangalore = getGeoRoom(12.9716, 77.5946);
    expect(roomBangalore).toMatch(/^geo:\d+:\d+$/);

    // San Francisco (37.7749, -122.4194)
    const roomSF = getGeoRoom(37.7749, -122.4194);
    expect(roomSF).toMatch(/^geo:\d+:-\d+$/);
  });

  it('handles coordinate boundary edge cases deterministically without drift', () => {
    const latStep = 10 / 111; // ~0.09009009009009009
    
    // Exact cell 1 lower boundary
    const boundaryLat = latStep * 1;
    const roomAtBoundary = getGeoRoom(boundaryLat, 0);
    expect(roomAtBoundary).toBe('geo:1:0');

    // Just below boundary
    const roomJustBelow = getGeoRoom(boundaryLat - 0.0000001, 0);
    expect(roomJustBelow).toBe('geo:0:0');

    // Just above boundary
    const roomJustAbove = getGeoRoom(boundaryLat + 0.0000001, 0);
    expect(roomJustAbove).toBe('geo:1:0');
  });

  it('getGeoRoomsWithNeighbors returns 9 cells (center + 8 neighbors)', () => {
    const neighbors = getGeoRoomsWithNeighbors(12.9716, 77.5946);
    expect(neighbors.length).toBe(9);

    const centerRoom = getGeoRoom(12.9716, 77.5946);
    expect(neighbors).toContain(centerRoom);

    // Ensure all returned rooms are unique
    const uniqueRooms = new Set(neighbors);
    expect(uniqueRooms.size).toBe(9);
  });
});
