import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Establish an authenticated Socket.IO connection.
 * Passes the JWT in socket.handshake.auth.token.
 */
export const connectSocket = (token: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  // If previous socket exists, disconnect first
  if (socket) {
    socket.disconnect();
  }

  // In development Vite proxies /api; socket.io connects to window.location.origin or backend port
  const socketUrl = window.location.port === '3000' ? 'http://localhost:5000' : window.location.origin;

  socket = io(socketUrl, {
    auth: {
      token
    },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  return socket;
};

/**
 * Retrieve the active Socket instance.
 */
export const getSocket = (): Socket | null => {
  return socket;
};

/**
 * Cleanly disconnect and tear down the Socket instance.
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default { connectSocket, getSocket, disconnectSocket };
