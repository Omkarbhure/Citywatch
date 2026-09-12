// backend/utils/geoRoom.js

/**
 * Geo-bucketing utility for CityWatch (~10km grid cells).
 * 
 * ~10km in degrees latitude is a fixed ~0.09 degrees; longitude varies with latitude,
 * so we adjust the longitude step by cos(latitude) to keep cells roughly square.
 * 
 * Tradeoff Note:
 * ~10km fixed grid cells mean a user located right at a cell boundary will not receive
 * real-time broadcast events for incidents reported a few meters away across the grid line.
 * This is an acceptable tradeoff for this phase, as initial REST queries (/api/incidents?near=...)
 * perform full 2dsphere radius searches.
 */

const CELL_KM = 10;
const KM_PER_DEG_LAT = 111; // approx 111 km per degree latitude

export function getGeoRoom(lat, lng) {
  const latStep = CELL_KM / KM_PER_DEG_LAT;
  const kmPerDegLng = KM_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  const lngStep = CELL_KM / Math.max(kmPerDegLng, 1); // guard near poles

  const latCell = Math.floor(lat / latStep);
  const lngCell = Math.floor(lng / lngStep);

  return `geo:${latCell}:${lngCell}`;
}

/**
 * Returns the primary geo room plus the 8 surrounding neighbor cells for boundary coverage.
 */
export function getGeoRoomsWithNeighbors(lat, lng) {
  const latStep = CELL_KM / KM_PER_DEG_LAT;
  const kmPerDegLng = KM_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  const lngStep = CELL_KM / Math.max(kmPerDegLng, 1);

  const baseLatCell = Math.floor(lat / latStep);
  const baseLngCell = Math.floor(lng / lngStep);

  const rooms = [];
  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLng = -1; dLng <= 1; dLng++) {
      rooms.push(`geo:${baseLatCell + dLat}:${baseLngCell + dLng}`);
    }
  }
  return rooms;
}

export default { getGeoRoom, getGeoRoomsWithNeighbors };
