const express = require('express');
const router = express.Router();
const gameEngine = require('../services/gameEngine');
const holderTracker = require('../services/holderTracker');
const payoutService = require('../services/payoutService');
const logger = require('../utils/logger');

// Get current game state
router.get('/state', async (req, res) => {
  try {
    const gameState = gameEngine.getCurrentState();
    const holderStats = holderTracker.getStats();
    
    res.json({
      success: true,
      data: {
        ...gameState,
        holderStats
      }
    });
  } catch (error) {
    logger.error('Failed to get game state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game state'
    });
  }
});

// Get game history
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = gameEngine.getGameHistory(limit);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Failed to get game history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game history'
    });
  }
});

// Get game statistics
router.get('/stats', async (req, res) => {
  try {
    const gameStats = gameEngine.getStats();
    const payoutStats = payoutService.getPayoutStats();
    const holderStats = holderTracker.getStats();
    
    res.json({
      success: true,
      data: {
        game: gameStats,
        payouts: payoutStats,
        holders: holderStats
      }
    });
  } catch (error) {
    logger.error('Failed to get game stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game stats'
    });
  }
});

// Get wheel data for visualization
router.get('/wheel-data', async (req, res) => {
  try {
    const holderDistribution = holderTracker.getHolderDistribution();
    const eligibleHolders = holderTracker.getEligibleHolders();
    
    res.json({
      success: true,
      data: {
        distribution: holderDistribution,
        totalEligible: eligibleHolders.length,
        minimumHold: holderTracker.getStats().minimumHoldAmount
      }
    });
  } catch (error) {
    logger.error('Failed to get wheel data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wheel data'
    });
  }
});

// Force immediate spin (admin only)
router.post('/force-spin', async (req, res) => {
  try {
    // In a real app, you'd check admin authentication here
    await gameEngine.forceSpinNow();
    
    res.json({
      success: true,
      message: 'Spin initiated successfully'
    });
  } catch (error) {
    logger.error('Failed to force spin:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Pause game (admin only)
router.post('/pause', async (req, res) => {
  try {
    await gameEngine.pauseGame();
    
    res.json({
      success: true,
      message: 'Game paused successfully'
    });
  } catch (error) {
    logger.error('Failed to pause game:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Resume game (admin only)
router.post('/resume', async (req, res) => {
  try {
    await gameEngine.resumeGame();
    
    res.json({
      success: true,
      message: 'Game resumed successfully'
    });
  } catch (error) {
    logger.error('Failed to resume game:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;