const express = require('express');
const router = express.Router();
const gameEngine = require('../services/gameEngine');
const holderTracker = require('../services/holderTracker');
const payoutService = require('../services/payoutService');
const solanaService = require('../services/solanaService');
const pumpfunService = require('../services/pumpfunService');
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

// Get current configuration
router.get('/config', async (req, res) => {
  try {
    const config = {
      tokenMintAddress: process.env.TOKEN_MINT_ADDRESS || '',
      feeCollectionWallet: process.env.FEE_COLLECTION_WALLET || '',
      creatorWallet: process.env.CREATOR_WALLET || '',
      minimumHoldPercentage: parseFloat(process.env.MINIMUM_HOLD_PERCENTAGE) || 0.01,
      spinIntervalMinutes: parseInt(process.env.SPIN_INTERVAL_MINUTES) || 5,
      winnerPayoutPercentage: parseInt(process.env.WINNER_PAYOUT_PERCENTAGE) || 100,
      creatorPayoutPercentage: parseInt(process.env.CREATOR_PAYOUT_PERCENTAGE) || 0,
      blacklistedAddresses: process.env.BLACKLISTED_ADDRESSES ?
        process.env.BLACKLISTED_ADDRESSES.split(',').map(addr => addr.trim()) : []
    };
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Failed to get configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration'
    });
  }
});

// Update configuration
router.post('/config', async (req, res) => {
  try {
    const {
      tokenMintAddress,
      feeCollectionWallet,
      creatorWallet,
      minimumHoldPercentage,
      spinIntervalMinutes,
      winnerPayoutPercentage,
      creatorPayoutPercentage,
      blacklistedAddresses
    } = req.body;
    
    // Validate configuration
    if (spinIntervalMinutes && (spinIntervalMinutes < 1 || spinIntervalMinutes > 60)) {
      return res.status(400).json({
        success: false,
        error: 'Spin interval must be between 1 and 60 minutes'
      });
    }
    
    if (minimumHoldPercentage && (minimumHoldPercentage < 0.01 || minimumHoldPercentage > 10)) {
      return res.status(400).json({
        success: false,
        error: 'Minimum hold percentage must be between 0.01% and 10%'
      });
    }
    
    if (winnerPayoutPercentage && creatorPayoutPercentage && (winnerPayoutPercentage + creatorPayoutPercentage !== 100)) {
      return res.status(400).json({
        success: false,
        error: 'Winner and creator percentages must sum to 100%'
      });
    }

    // Validate Solana addresses
    const validateSolanaAddress = (address) => {
      return address && address.length >= 32 && address.length <= 44;
    };

    if (tokenMintAddress && !validateSolanaAddress(tokenMintAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token mint address format'
      });
    }

    if (feeCollectionWallet && !validateSolanaAddress(feeCollectionWallet)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid fee collection wallet address format'
      });
    }

    if (creatorWallet && !validateSolanaAddress(creatorWallet)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid creator wallet address format'
      });
    }
    
    // Update environment variables (in production, this would update a config service)
    if (tokenMintAddress) process.env.TOKEN_MINT_ADDRESS = tokenMintAddress;
    if (feeCollectionWallet) process.env.FEE_COLLECTION_WALLET = feeCollectionWallet;
    if (creatorWallet) process.env.CREATOR_WALLET = creatorWallet;
    if (spinIntervalMinutes) process.env.SPIN_INTERVAL_MINUTES = spinIntervalMinutes.toString();
    if (minimumHoldPercentage) process.env.MINIMUM_HOLD_PERCENTAGE = minimumHoldPercentage.toString();
    if (winnerPayoutPercentage) process.env.WINNER_PAYOUT_PERCENTAGE = winnerPayoutPercentage.toString();
    if (creatorPayoutPercentage) process.env.CREATOR_PAYOUT_PERCENTAGE = creatorPayoutPercentage.toString();
    if (blacklistedAddresses) process.env.BLACKLISTED_ADDRESSES = blacklistedAddresses.join(',');
    
    logger.info('Admin updated configuration:', req.body);
    
    // Restart holder tracking with new token if changed
    if (tokenMintAddress) {
      try {
        await holderTracker.updateTokenAddress(tokenMintAddress);
        logger.info('Holder tracker updated with new token address');
      } catch (error) {
        logger.warn('Failed to update holder tracker:', error.message);
      }
    }
    
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: {
        tokenMintAddress: process.env.TOKEN_MINT_ADDRESS,
        feeCollectionWallet: process.env.FEE_COLLECTION_WALLET,
        creatorWallet: process.env.CREATOR_WALLET,
        minimumHoldPercentage: process.env.MINIMUM_HOLD_PERCENTAGE,
        spinIntervalMinutes: process.env.SPIN_INTERVAL_MINUTES,
        winnerPayoutPercentage: process.env.WINNER_PAYOUT_PERCENTAGE,
        creatorPayoutPercentage: process.env.CREATOR_PAYOUT_PERCENTAGE,
        blacklistedAddresses: process.env.BLACKLISTED_ADDRESSES
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

// Get Pump.fun fee claiming status
router.get('/pumpfun/fees', async (req, res) => {
  try {
    const stats = await pumpfunService.getFeeClaimingStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get Pump.fun fee stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Claim creator fees from Pump.fun
router.post('/pumpfun/claim-fees', async (req, res) => {
  try {
    const tokenMintAddress = process.env.TOKEN_MINT_ADDRESS;
    if (!tokenMintAddress) {
      return res.status(400).json({
        success: false,
        error: 'Token mint address not configured'
      });
    }

    const signature = await pumpfunService.claimCreatorFees(tokenMintAddress);
    
    logger.info(`Admin claimed creator fees: ${signature}`);
    
    res.json({
      success: true,
      message: 'Creator fees claimed successfully',
      data: { transactionSignature: signature }
    });
  } catch (error) {
    logger.error('Failed to claim creator fees:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Claim fees and auto-send to winner
router.post('/pumpfun/claim-and-send', async (req, res) => {
  try {
    const { winnerAddress } = req.body;
    const tokenMintAddress = process.env.TOKEN_MINT_ADDRESS;

    if (!tokenMintAddress) {
      return res.status(400).json({
        success: false,
        error: 'Token mint address not configured'
      });
    }

    if (!winnerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Winner address is required'
      });
    }

    const result = await pumpfunService.claimAndSendToWinner(tokenMintAddress, winnerAddress);

    logger.info(`Admin claimed fees and sent to winner: ${winnerAddress}`);

    res.json({
      success: true,
      message: 'Fees claimed and sent to winner successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to claim and send fees:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Initialize game timer after token creation
router.post('/initialize-game', async (req, res) => {
  try {
    const { tokenMintAddress } = req.body;

    // Validate required parameters
    if (!tokenMintAddress) {
      return res.status(400).json({
        success: false,
        error: 'Token mint address is required'
      });
    }

    // Update token mint address
    process.env.TOKEN_MINT_ADDRESS = tokenMintAddress;

    // Re-initialize services with new token
    try {
      await solanaService.initialize();
      logger.info('Solana service re-initialized with new token');
    } catch (error) {
      logger.warn('Solana service re-initialization failed:', error.message);
    }

    try {
      await pumpfunService.initialize();
      logger.info('Pump.fun service re-initialized');
    } catch (error) {
      logger.warn('Pump.fun service re-initialization failed:', error.message);
    }

    // Update holder tracker with new token
    try {
      await holderTracker.updateTokenAddress(tokenMintAddress);
      logger.info('Holder tracker updated with new token address');
    } catch (error) {
      logger.warn('Holder tracker update failed:', error.message);
    }

    // Start game timer if not already running
    if (!gameEngine.isRunning) {
      gameEngine.startGameCycle();
      logger.info('Game timer started');
    }

    logger.info(`Game initialized with token: ${tokenMintAddress}`);

    res.json({
      success: true,
      message: 'Game initialized successfully',
      data: {
        tokenMintAddress,
        gameStarted: true,
        autoFeeClaiming: process.env.AUTO_CLAIM_PUMPFUN_FEES === 'true',
        feePayoutPercentage: process.env.FEE_PAYOUT_PERCENTAGE
      }
    });
  } catch (error) {
    logger.error('Failed to initialize game:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;