const express = require('express');
const router = express.Router();
const gameEngine = require('../services/gameEngine');
const holderTracker = require('../services/holderTracker');
const payoutService = require('../services/payoutService');
const solanaService = require('../services/solanaService');
const logger = require('../utils/logger');

// Simple admin authentication middleware (in production, use proper JWT)
const adminAuth = (req, res, next) => {
  const adminPassword = req.headers['x-admin-password'];
  
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }
  
  next();
};

// Apply admin auth to all routes
router.use(adminAuth);

// Get system status
router.get('/status', async (req, res) => {
  try {
    const gameStats = gameEngine.getStats();
    const holderStats = holderTracker.getStats();
    const payoutStats = payoutService.getPayoutStats();
    const walletValidation = await payoutService.validateHotWalletBalance();
    
    const systemStatus = {
      services: {
        solana: solanaService.isReady(),
        holderTracker: holderStats.isTracking,
        gameEngine: gameStats.currentState.isRunning,
        payouts: payoutStats.pendingPayouts === 0
      },
      stats: {
        game: gameStats,
        holders: holderStats,
        payouts: payoutStats
      },
      wallet: walletValidation,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date()
    };
    
    res.json({
      success: true,
      data: systemStatus
    });
  } catch (error) {
    logger.error('Failed to get system status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status'
    });
  }
});

// Force immediate spin
router.post('/force-spin', async (req, res) => {
  try {
    await gameEngine.forceSpinNow();
    logger.info('Admin forced immediate spin');
    
    res.json({
      success: true,
      message: 'Spin initiated successfully'
    });
  } catch (error) {
    logger.error('Admin failed to force spin:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Pause/Resume game
router.post('/game/:action', async (req, res) => {
  try {
    const { action } = req.params;
    
    if (action === 'pause') {
      await gameEngine.pauseGame();
      logger.info('Admin paused game');
    } else if (action === 'resume') {
      await gameEngine.resumeGame();
      logger.info('Admin resumed game');
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Use "pause" or "resume"'
      });
    }
    
    res.json({
      success: true,
      message: `Game ${action}d successfully`
    });
  } catch (error) {
    logger.error(`Admin failed to ${req.params.action} game:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Force holder update
router.post('/holders/update', async (req, res) => {
  try {
    const stats = await holderTracker.forceUpdate();
    logger.info('Admin forced holder update');
    
    res.json({
      success: true,
      message: 'Holder data updated successfully',
      data: stats
    });
  } catch (error) {
    logger.error('Admin failed to update holders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Retry failed payout
router.post('/payouts/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    const signature = await payoutService.retryFailedPayout(id);
    logger.info(`Admin retried payout ${id}`);
    
    res.json({
      success: true,
      message: 'Payout retry successful',
      data: { transactionSignature: signature }
    });
  } catch (error) {
    logger.error(`Admin failed to retry payout ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Pause/Resume payouts
router.post('/payouts/:action', async (req, res) => {
  try {
    const { action } = req.params;
    
    if (action === 'pause') {
      await payoutService.pausePayouts();
      logger.info('Admin paused payouts');
    } else if (action === 'resume') {
      await payoutService.resumePayouts();
      logger.info('Admin resumed payouts');
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Use "pause" or "resume"'
      });
    }
    
    res.json({
      success: true,
      message: `Payouts ${action}d successfully`
    });
  } catch (error) {
    logger.error(`Admin failed to ${req.params.action} payouts:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get system logs (last 100 entries)
router.get('/logs', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const logFile = path.join(process.cwd(), 'logs', 'combined.log');
    
    try {
      const logData = await fs.readFile(logFile, 'utf8');
      const logs = logData.split('\n')
        .filter(line => line.trim())
        .slice(-100)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { message: line, timestamp: new Date() };
          }
        });
      
      res.json({
        success: true,
        data: logs.reverse()
      });
    } catch (fileError) {
      res.json({
        success: true,
        data: [],
        message: 'No log file found'
      });
    }
  } catch (error) {
    logger.error('Failed to get logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get logs'
    });
  }
});

// Update configuration
router.post('/config', async (req, res) => {
  try {
    const { spinInterval, minHoldPercentage, winnerPercentage, creatorPercentage } = req.body;
    
    // Validate configuration
    if (spinInterval && (spinInterval < 1 || spinInterval > 60)) {
      return res.status(400).json({
        success: false,
        error: 'Spin interval must be between 1 and 60 minutes'
      });
    }
    
    if (minHoldPercentage && (minHoldPercentage < 0.01 || minHoldPercentage > 10)) {
      return res.status(400).json({
        success: false,
        error: 'Minimum hold percentage must be between 0.01% and 10%'
      });
    }
    
    if (winnerPercentage && creatorPercentage && (winnerPercentage + creatorPercentage !== 100)) {
      return res.status(400).json({
        success: false,
        error: 'Winner and creator percentages must sum to 100%'
      });
    }
    
    // Update environment variables (in production, this would update a config service)
    if (spinInterval) process.env.SPIN_INTERVAL_MINUTES = spinInterval.toString();
    if (minHoldPercentage) process.env.MINIMUM_HOLD_PERCENTAGE = minHoldPercentage.toString();
    if (winnerPercentage) process.env.WINNER_PAYOUT_PERCENTAGE = winnerPercentage.toString();
    if (creatorPercentage) process.env.CREATOR_PAYOUT_PERCENTAGE = creatorPercentage.toString();
    
    logger.info('Admin updated configuration:', req.body);
    
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: {
        spinInterval: process.env.SPIN_INTERVAL_MINUTES,
        minHoldPercentage: process.env.MINIMUM_HOLD_PERCENTAGE,
        winnerPercentage: process.env.WINNER_PAYOUT_PERCENTAGE,
        creatorPercentage: process.env.CREATOR_PAYOUT_PERCENTAGE
      }
    });
  } catch (error) {
    logger.error('Failed to update configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
});

// Emergency stop
router.post('/emergency-stop', async (req, res) => {
  try {
    await gameEngine.pauseGame();
    await payoutService.pausePayouts();
    
    logger.warn('EMERGENCY STOP activated by admin');
    
    res.json({
      success: true,
      message: 'Emergency stop activated - all operations paused'
    });
  } catch (error) {
    logger.error('Failed to execute emergency stop:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute emergency stop'
    });
  }
});

// Test Solana connection
router.post('/test-connection', async (req, res) => {
  try {
    await solanaService.testConnection();
    
    res.json({
      success: true,
      message: 'Solana connection test successful'
    });
  } catch (error) {
    logger.error('Solana connection test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;