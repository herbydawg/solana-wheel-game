const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const solanaService = require('./services/solanaService');
const gameEngine = require('./services/gameEngine');
const holderTracker = require('./services/holderTracker');
const payoutService = require('./services/payoutService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/game', require('./routes/gameRoutes'));
app.use('/api/holders', require('./routes/holderRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  // Send initial game state
  socket.emit('gameState', gameEngine.getCurrentState());
  socket.emit('holderStats', holderTracker.getStats());
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Initialize services
async function initializeServices() {
  try {
    logger.info('Initializing services...');
    
    // Try to initialize Solana service, but don't fail if it doesn't work
    try {
      await solanaService.initialize();
      logger.info('Solana service initialized successfully');
    } catch (error) {
      logger.warn('Solana service failed to initialize, continuing with limited functionality:', error.message);
    }
    
    // Initialize holder tracking (will use demo data if Solana fails)
    logger.info('Starting holder tracking...');
    await holderTracker.initialize(io);
    
    // Initialize game engine
    logger.info('Starting game engine...');
    await gameEngine.initialize(io);
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    // Don't exit, continue with demo mode
    logger.info('Continuing with demo mode...');
  }
}

const PORT = process.env.PORT || 5000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

server.listen(PORT, HOST, async () => {
  logger.info(`Server running on ${HOST}:${PORT}`);
  await initializeServices();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

module.exports = { app, io };