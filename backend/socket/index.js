import { socketAuth } from '../middleware/socketAuth.js';
import { getGeoRoom } from '../utils/geoRoom.js';
import { setIO } from './ioInstance.js';

// In-memory tracker for connected users (userId -> active connection count)
const connectedUsers = new Map();

export const isUserConnected = (userId) => {
  if (!userId) return false;
  const idStr = userId.toString();
  const count = connectedUsers.get(idStr) || 0;
  return count > 0;
};

export const initSocket = (io) => {
  setIO(io);

  // Authenticate every socket connection with JWT
  io.use(socketAuth);

  io.on('connection', (socket) => {
    const userId = socket.user?._id?.toString();
    const userRole = socket.user?.role;

    if (userId) {
      const currentCount = connectedUsers.get(userId) || 0;
      connectedUsers.set(userId, currentCount + 1);
    }

    // Automatically join authority broad room for citywide triage updates
    if (userRole === 'authority') {
      socket.join('authority:all');
    }

    // Subscribe to geographical cell updates
    socket.on('subscribe:area', ({ lat, lng }) => {
      if (typeof lat === 'number' && typeof lng === 'number') {
        const room = getGeoRoom(lat, lng);
        socket.join(room);
      }
    });

    // Unsubscribe from geographical cell updates
    socket.on('unsubscribe:area', ({ lat, lng }) => {
      if (typeof lat === 'number' && typeof lng === 'number') {
        const room = getGeoRoom(lat, lng);
        socket.leave(room);
      }
    });

    // Subscribe to a specific incident's updates
    socket.on('subscribe:incident', (incidentId) => {
      if (incidentId) {
        socket.join(`incident:${incidentId}`);
      }
    });

    // Unsubscribe from a specific incident's updates
    socket.on('unsubscribe:incident', (incidentId) => {
      if (incidentId) {
        socket.leave(`incident:${incidentId}`);
      }
    });

    // Clean up connection counter on disconnect
    socket.on('disconnect', () => {
      if (userId) {
        const currentCount = connectedUsers.get(userId) || 0;
        if (currentCount <= 1) {
          connectedUsers.delete(userId);
        } else {
          connectedUsers.set(userId, currentCount - 1);
        }
      }
    });
  });
};

export default { initSocket, isUserConnected };
