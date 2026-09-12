import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import incidentRoutes from './routes/incidents.js';
import pushRoutes from './routes/push.js';
import analyticsRoutes from './routes/analytics.js';
import { initSocket } from './socket/index.js';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

connectDB();

// Security HTTP headers
app.use(helmet());

// Tighten CORS to allowed client origin
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:3000';
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));

// Attach Socket.IO to the HTTP server with identical CORS policy
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigin,
    credentials: true
  }
});

// Initialize Socket.IO authentication and event handling
initSocket(io);

app.use(express.json());

// Rate limiter factory for brute-force and credential-stuffing protection on auth endpoints
const authRateLimitMax = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10);

export const createAuthLimiter = (customOptions = {}) => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: authRateLimitMax, // Limit each IP to 10 requests per windowMs by default (overridable via AUTH_RATE_LIMIT_MAX)
  message: {
    message: 'Too many attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...customOptions
});

export const loginLimiter = createAuthLimiter();
export const registerLimiter = createAuthLimiter();
export const authLimiter = loginLimiter; // alias for backwards compatibility

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Auth API is running!' });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

export { app, httpServer, io };