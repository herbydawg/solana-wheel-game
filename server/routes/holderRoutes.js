const express = require('express');
const router = express.Router();
const holderTracker = require('../services/holderTracker');
const logger = require('../utils/logger');

// Get holder statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = holderTracker.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get holder stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get holder stats'
    });
  }
});

// Get top holders
router.get('/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const topHolders = holderTracker.getTopHolders(limit);
    
    res.json({
      success: true,
      data: topHolders
    });
  } catch (error) {
    logger.error('Failed to get top holders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get top holders'
    });
  }
});

// Get eligible holders
router.get('/eligible', async (req, res) => {
  try {
    const eligibleHolders = holderTracker.getEligibleHolders();
    
    res.json({
      success: true,
      data: {
        count: eligibleHolders.length,
        holders: eligibleHolders.map(holder => ({
          address: holder.address,
          balance: holder.balance,
          percentage: holder.percentage
        }))
      }
    });
  } catch (error) {
    logger.error('Failed to get eligible holders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get eligible holders'
    });
  }
});

// Get holder distribution for wheel
router.get('/distribution', async (req, res) => {
  try {
    const distribution = holderTracker.getHolderDistribution();
    
    res.json({
      success: true,
      data: distribution
    });
  } catch (error) {
    logger.error('Failed to get holder distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get holder distribution'
    });
  }
});

// Check if specific address is eligible
router.get('/check/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const isEligible = holderTracker.isAddressEligible(address);
    const holderData = holderTracker.getHolderByAddress(address);
    
    res.json({
      success: true,
      data: {
        address,
        isEligible,
        holder: holderData || null
      }
    });
  } catch (error) {
    logger.error('Failed to check holder eligibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check holder eligibility'
    });
  }
});

// Force holder update (admin only)
router.post('/force-update', async (req, res) => {
  try {
    const stats = await holderTracker.forceUpdate();
    
    res.json({
      success: true,
      message: 'Holder data updated successfully',
      data: stats
    });
  } catch (error) {
    logger.error('Failed to force holder update:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get holder trends
router.get('/trends', async (req, res) => {
  try {
    const trends = holderTracker.getHolderTrends();
    
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    logger.error('Failed to get holder trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get holder trends'
    });
  }
});

module.exports = router;