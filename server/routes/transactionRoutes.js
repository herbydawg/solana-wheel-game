const express = require('express');
const router = express.Router();
const payoutService = require('../services/payoutService');
const solanaService = require('../services/solanaService');
const logger = require('../utils/logger');

// Get payout history
router.get('/payouts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = payoutService.getPayoutHistory(limit);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Failed to get payout history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payout history'
    });
  }
});

// Get pending payouts
router.get('/payouts/pending', async (req, res) => {
  try {
    const pending = payoutService.getPendingPayouts();
    
    res.json({
      success: true,
      data: pending
    });
  } catch (error) {
    logger.error('Failed to get pending payouts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending payouts'
    });
  }
});

// Get payout statistics
router.get('/payouts/stats', async (req, res) => {
  try {
    const stats = payoutService.getPayoutStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get payout stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payout stats'
    });
  }
});

// Get specific payout by ID
router.get('/payouts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payout = payoutService.getPayoutById(id);
    
    if (!payout) {
      return res.status(404).json({
        success: false,
        error: 'Payout not found'
      });
    }
    
    res.json({
      success: true,
      data: payout
    });
  } catch (error) {
    logger.error('Failed to get payout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payout'
    });
  }
});

// Retry failed payout (admin only)
router.post('/payouts/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    const signature = await payoutService.retryFailedPayout(id);
    
    res.json({
      success: true,
      message: 'Payout retry successful',
      data: { transactionSignature: signature }
    });
  } catch (error) {
    logger.error('Failed to retry payout:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get transaction history for an address
router.get('/history/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    const history = await solanaService.getTransactionHistory(address, limit);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Failed to get transaction history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction history'
    });
  }
});

// Validate hot wallet balance
router.get('/wallet/validate', async (req, res) => {
  try {
    const validation = await payoutService.validateHotWalletBalance();
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    logger.error('Failed to validate wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate wallet'
    });
  }
});

// Get estimated transaction fee
router.get('/fee-estimate', async (req, res) => {
  try {
    const fee = await payoutService.estimateTransactionFee();
    
    res.json({
      success: true,
      data: { estimatedFee: fee }
    });
  } catch (error) {
    logger.error('Failed to estimate fee:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to estimate fee'
    });
  }
});

module.exports = router;