import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Socket.IO authentication middleware.
 * Verifies the JWT provided in socket.handshake.auth.token or Authorization header.
 * Attaches the authenticated User instance to socket.user.
 */
export const socketAuth = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket authentication failed:', error.message);
    next(new Error('Authentication error: Invalid or expired token'));
  }
};

export default socketAuth;
