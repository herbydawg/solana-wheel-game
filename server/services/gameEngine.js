const cron = require('node-cron');
const solanaService = require('./solanaService');
const holderTracker = require('./holderTracker');
const payoutService = require('./payoutService');
const pumpfunService = require('./pumpfunService');
const logger = require('../utils/logger');
const db = require('../database/connection');
const { GameModel, TransactionModel, GameStatsModel, SystemSettingsModel } = require('../database/models');

class GameEngine {
  constructor() {
    this.isRunning = false;
    this.currentGame = null;
    this.gameHistory = [];
    this.io = null;
    this.cronJob = null;
    this.gameState = 'waiting'; // waiting, spinning, processing, completed
    this.nextSpinTime = null;
    this.currentPot = 0;
    this.spinInterval = parseInt(process.env.SPIN_INTERVAL_MINUTES) || 5;
    this.potUpdateInterval = null;
    this.POT_UPDATE_INTERVAL_MS = 10000; // 10 seconds
    this.useDatabase = false;

    // Pot growth configuration (will be loaded from DB)
    this.POT_GROWTH_RATE = parseFloat(process.env.POT_GROWTH_RATE) || 0.05;
    this.POT_BASE_AMOUNT = parseInt(process.env.POT_BASE_AMOUNT) || 10000000;
    this.POT_MAX_GROWTH = parseInt(process.env.POT_MAX_GROWTH) || 1000000000;
  }

  async initialize(socketIo) {
    try {
      this.io = socketIo;

      // Try to connect to database
      this.useDatabase = await db.connect();
      if (this.useDatabase) {
        logger.info('Game engine using database storage');
        await this.loadSettingsFromDatabase();
        await this.loadGameStateFromDatabase();
      } else {
        logger.info('Game engine using in-memory storage');
      }

      // Calculate next spin time
      this.calculateNextSpinTime();

      // Start the automated game cycle
      this.startGameCycle();

      // Initialize pot tracking
      await this.updatePotBalance();

      // Start periodic pot updates
      this.startPeriodicPotUpdates();

      logger.info('Game engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize game engine:', error);
      throw error;
    }
  }

  async loadSettingsFromDatabase() {
    try {
      // Load pot growth settings
      this.POT_GROWTH_RATE = await SystemSettingsModel.get('pot_growth_rate') || this.POT_GROWTH_RATE;
      this.POT_BASE_AMOUNT = await SystemSettingsModel.get('pot_base_amount') || this.POT_BASE_AMOUNT;
      this.POT_MAX_GROWTH = await SystemSettingsModel.get('pot_max_growth') || this.POT_MAX_GROWTH;

      // Load game settings
      this.spinInterval = await SystemSettingsModel.get('spin_interval_minutes') || this.spinInterval;

      logger.info('Settings loaded from database');
    } catch (error) {
      logger.warn('Failed to load settings from database, using defaults:', error.message);
    }
  }

  async loadGameStateFromDatabase() {
    try {
      // Load current pot from game stats
      const gameStats = await GameStatsModel.get();
      if (gameStats && gameStats.current_pot) {
        this.currentPot = gameStats.current_pot;
        logger.info(`Loaded pot balance from database: ${this.currentPot} lamports`);
      }

      // Load recent games
      this.gameHistory = await GameModel.getRecent(10);
      logger.info(`Loaded ${this.gameHistory.length} recent games from database`);
    } catch (error) {
      logger.warn('Failed to load game state from database:', error.message);
    }
  }

  calculateNextSpinTime() {
    const now = new Date();
    const nextSpin = new Date(now);
    nextSpin.setMinutes(Math.ceil(now.getMinutes() / this.spinInterval) * this.spinInterval, 0, 0);
    
    // If the calculated time is in the past or too close, add the interval
    if (nextSpin.getTime() - now.getTime() < 10000) { // Less than 10 seconds
      nextSpin.setMinutes(nextSpin.getMinutes() + this.spinInterval);
    }
    
    this.nextSpinTime = nextSpin;
    logger.info(`Next spin scheduled for: ${this.nextSpinTime.toISOString()}`);
  }

  startGameCycle() {
    if (this.isRunning) {
      return;
    }

    // Create cron job for every minute to check if it's time to spin
    this.cronJob = cron.schedule('* * * * *', async () => {
      try {
        await this.checkAndExecuteSpin();
      } catch (error) {
        logger.error('Error in game cycle:', error);
      }
    });

    this.isRunning = true;
    logger.info(`Game cycle started with ${this.spinInterval} minute intervals`);
  }

  async checkAndExecuteSpin() {
    const now = new Date();
    
    // Check if it's time for the next spin
    if (now >= this.nextSpinTime && this.gameState === 'waiting') {
      await this.executeSpin();
    }
    
    // Emit countdown updates
    if (this.gameState === 'waiting') {
      const timeUntilSpin = Math.max(0, this.nextSpinTime.getTime() - now.getTime());
      this.io.emit('countdown', {
        timeRemaining: timeUntilSpin,
        nextSpinTime: this.nextSpinTime,
        gameState: this.gameState
      });
    }
  }

  async executeSpin() {
    try {
      logger.info('Executing wheel spin...');
      this.gameState = 'spinning';

      // Create new game instance
      const gameId = this.generateGameId();
      this.currentGame = {
        id: gameId,
        gameId: gameId,
        startTime: new Date(),
        potAmount: this.currentPot,
        eligibleHolders: holderTracker.getEligibleHolders().length,
        winner: null,
        winnerPayout: 0,
        creatorPayout: 0,
        transactionSignature: null,
        status: 'spinning'
      };

      // Save game to database if available
      if (this.useDatabase) {
        try {
          await GameModel.create({
            gameId: gameId,
            potAmount: this.currentPot,
            eligibleHoldersCount: this.currentGame.eligibleHolders,
            status: 'spinning'
          });
        } catch (error) {
          logger.warn('Failed to save game to database:', error.message);
        }
      }

      // Emit spin start event
      this.io.emit('spinStart', {
        gameId: this.currentGame.id,
        potAmount: this.currentPot,
        eligibleHolders: this.currentGame.eligibleHolders,
        holderDistribution: holderTracker.getHolderDistribution()
      });

      // Simulate wheel spin duration (3-5 seconds)
      const spinDuration = 3000 + Math.random() * 2000;

      // Select winner using fair randomization
      const winner = await this.selectWinner();

      if (!winner) {
        logger.warn('No eligible holders found for spin');
        this.gameState = 'waiting';
        this.calculateNextSpinTime();
        return;
      }

      this.currentGame.winner = winner;
      this.currentGame.status = 'winner_selected';

      // Update game in database
      if (this.useDatabase) {
        try {
          await GameModel.update(gameId, {
            winnerAddress: winner.address,
            status: 'winner_selected'
          });
        } catch (error) {
          logger.warn('Failed to update game winner in database:', error.message);
        }
      }

      // Wait for spin animation to complete
      setTimeout(async () => {
        try {
          await this.processWinnerPayout();
        } catch (error) {
          logger.error('Failed to process winner payout:', error);
          this.gameState = 'waiting';
          this.calculateNextSpinTime();
        }
      }, spinDuration);

    } catch (error) {
      logger.error('Failed to execute spin:', error);
      this.gameState = 'waiting';
      this.calculateNextSpinTime();
    }
  }

  async selectWinner() {
    try {
      // Get current blockhash for randomness
      const blockhash = await solanaService.getRecentBlockhash();
      
      // Use blockhash as entropy source
      const entropy = this.hashToNumber(blockhash);
      
      // Get eligible holders
      const eligibleHolders = holderTracker.getEligibleHolders();
      
      if (eligibleHolders.length === 0) {
        return null;
      }

      // Weighted random selection based on token balance
      const totalWeight = eligibleHolders.reduce((sum, holder) => sum + holder.balance, 0);
      let randomValue = (entropy % totalWeight);
      
      for (const holder of eligibleHolders) {
        randomValue -= holder.balance;
        if (randomValue <= 0) {
          logger.info(`Winner selected: ${holder.address} with balance ${holder.balance}`);
          return holder;
        }
      }
      
      // Fallback to first holder if something goes wrong
      return eligibleHolders[0];
      
    } catch (error) {
      logger.error('Failed to select winner:', error);
      throw error;
    }
  }

  hashToNumber(hash) {
    // Convert blockhash to a large number for randomness
    let num = 0;
    for (let i = 0; i < Math.min(hash.length, 16); i++) {
      num = num * 256 + hash.charCodeAt(i);
    }
    return Math.abs(num);
  }

  async processWinnerPayout() {
    try {
      this.gameState = 'processing';
      
      const winnerPercentage = parseFloat(process.env.WINNER_PAYOUT_PERCENTAGE) || 50;
      const creatorPercentage = parseFloat(process.env.CREATOR_PAYOUT_PERCENTAGE) || 50;
      
      const winnerPayout = Math.floor(this.currentPot * (winnerPercentage / 100));
      const creatorPayout = Math.floor(this.currentPot * (creatorPercentage / 100));
      
      this.currentGame.winnerPayout = winnerPayout;
      this.currentGame.creatorPayout = creatorPayout;
      this.currentGame.status = 'processing_payout';

      // Emit winner announcement
      this.io.emit('winnerSelected', {
        gameId: this.currentGame.id,
        winner: {
          address: this.currentGame.winner.address,
          balance: this.currentGame.winner.balance,
          percentage: this.currentGame.winner.percentage
        },
        winnerPayout: winnerPayout,
        creatorPayout: creatorPayout,
        potAmount: this.currentPot
      });

      // Process the payout (real or simulated based on wallet configuration)
      const transactionSignature = await payoutService.processWinnerPayout(
        this.currentGame.winner.address,
        winnerPayout,
        creatorPayout
      );

      this.currentGame.transactionSignature = transactionSignature;
      this.currentGame.status = 'completed';
      this.currentGame.endTime = new Date();

      // Save transaction to database
      if (this.useDatabase) {
        try {
          await TransactionModel.create({
            type: 'payout',
            amount: winnerPayout,
            fromAddress: process.env.FEE_COLLECTION_WALLET,
            toAddress: this.currentGame.winner.address,
            signature: transactionSignature,
            gameId: this.currentGame.id
          });

          await TransactionModel.create({
            type: 'payout',
            amount: creatorPayout,
            fromAddress: process.env.FEE_COLLECTION_WALLET,
            toAddress: process.env.CREATOR_WALLET,
            signature: transactionSignature,
            gameId: this.currentGame.id
          });

          // Update game as completed
          await GameModel.update(this.currentGame.id, {
            winnerPayout: winnerPayout,
            creatorPayout: creatorPayout,
            transactionSignature: transactionSignature,
            endTime: new Date(),
            status: 'completed'
          });

          // Update game stats
          const gameStats = await GameModel.getStats();
          await GameStatsModel.update({
            totalGames: gameStats.total_games,
            totalPayouts: gameStats.total_payouts,
            averagePot: gameStats.average_pot,
            currentPot: this.currentPot,
            totalHolders: holderTracker.getStats().totalHolders,
            eligibleHolders: holderTracker.getStats().eligibleHolders
          });
        } catch (error) {
          logger.warn('Failed to save game data to database:', error.message);
        }
      }

      // Add to game history (in-memory)
      this.gameHistory.unshift(this.currentGame);

      // Keep only last 50 games in memory
      if (this.gameHistory.length > 50) {
        this.gameHistory = this.gameHistory.slice(0, 50);
      }

      // Check if auto-claim is enabled and claim Pump.fun fees to creator wallet
      try {
        const autoClaimEnabled = process.env.AUTO_CLAIM_PUMPFUN_FEES === 'true';
        if (autoClaimEnabled) {
          logger.info('Auto-claiming Pump.fun fees to creator wallet...');
          
          // Step 1: Claim fees from Pump.fun to creator wallet
          const claimSignature = await pumpfunService.claimCreatorFees(process.env.TOKEN_MINT_ADDRESS);
          logger.info('Pump.fun fees claimed to creator wallet:', claimSignature);
          
          // Step 2: Get the claimed amount and send percentage to winner
          const feeStats = await pumpfunService.getFeeClaimingStats();
          const feePayoutPercentage = parseFloat(process.env.FEE_PAYOUT_PERCENTAGE) || 50; // Default 50%
          const feePayoutAmount = Math.floor(feeStats.claimableFees * (feePayoutPercentage / 100));
          
          if (feePayoutAmount > 0) {
            // Step 3: Send percentage of claimed fees to winner
            const sendSignature = await pumpfunService.sendFeesToWinner(
              this.currentGame.winner.address,
              feePayoutAmount
            );
            
            logger.info(`Sent ${feePayoutAmount} lamports (${feePayoutPercentage}% of fees) to winner: ${sendSignature}`);
            
            // Emit fee payout notification
            this.io.emit('pumpfunFeesClaimedAndSent', {
              gameId: this.currentGame.id,
              winner: this.currentGame.winner.address,
              totalClaimed: feeStats.claimableFees,
              sentToWinner: feePayoutAmount,
              feePayoutPercentage: feePayoutPercentage,
              claimSignature: claimSignature,
              sendSignature: sendSignature
            });
          }
        }
      } catch (pumpfunError) {
        logger.warn('Failed to auto-claim Pump.fun fees:', pumpfunError.message);
        // Don't fail the entire payout process if Pump.fun claiming fails
      }

      // Emit payout confirmation
      this.io.emit('payoutCompleted', {
        gameId: this.currentGame.id,
        transactionSignature: transactionSignature,
        winner: this.currentGame.winner.address,
        winnerPayout: winnerPayout,
        creatorPayout: creatorPayout,
        simulated: transactionSignature.startsWith('simulated_')
      });

      // Calculate pot growth percentage for display
      const previousPot = this.currentPot;
      
      // Apply pot growth for next cycle
      await this.applyPotGrowth();
      
      // Calculate and emit pot growth percentage
      const potGrowthPercentage = previousPot > 0 ?
        ((this.currentPot - previousPot) / previousPot) * 100 : 0;

      this.io.emit('potGrowthUpdate', {
        previousPot: previousPot,
        newPot: this.currentPot,
        growthAmount: this.currentPot - previousPot,
        growthPercentage: potGrowthPercentage,
        timestamp: new Date()
      });

      this.gameState = 'waiting';
      this.calculateNextSpinTime();

      // Send immediate countdown update after spin completes
      const now = new Date();
      const timeUntilSpin = Math.max(0, this.nextSpinTime.getTime() - now.getTime());
      this.io.emit('countdown', {
        timeRemaining: timeUntilSpin,
        nextSpinTime: this.nextSpinTime,
        gameState: this.gameState
      });

      logger.info(`Game ${this.currentGame.id} completed successfully. Winner: ${this.currentGame.winner.address}`);

    } catch (error) {
      logger.error('Failed to process winner payout:', error);
      
      this.currentGame.status = 'failed';
      this.currentGame.error = error.message;
      
      this.io.emit('payoutFailed', {
        gameId: this.currentGame.id,
        error: error.message
      });
      
      this.gameState = 'waiting';
      this.calculateNextSpinTime();
    }
  }

  async applyPotGrowth() {
    try {
      const previousPot = this.currentPot;

      // Calculate growth based on current pot size
      const growthAmount = Math.min(
        Math.floor(this.currentPot * this.POT_GROWTH_RATE),
        this.POT_MAX_GROWTH
      );

      // Apply growth
      this.currentPot += growthAmount;

      // Ensure minimum base amount
      if (this.currentPot < this.POT_BASE_AMOUNT) {
        this.currentPot = this.POT_BASE_AMOUNT;
      }

      // Add any new funds from the wallet (70% of wallet balance)
      const feeWallet = process.env.FEE_COLLECTION_WALLET;
      const wsolMint = 'So11111111111111111111111111111111111111112';

      if (feeWallet && solanaService.isReady()) {
        const walletBalance = await solanaService.getTokenBalanceForWallet(feeWallet, wsolMint);
        const potFromWallet = Math.floor(walletBalance * 0.7); // 70% of wallet balance

        if (potFromWallet > this.currentPot) {
          const addedAmount = potFromWallet - this.currentPot;
          this.currentPot = potFromWallet;
          logger.info(`Added ${addedAmount} lamports from wallet to pot (70% of ${walletBalance} lamports)`);
        }
      }

      const growthSOL = growthAmount / 1000000000;
      const newPotSOL = this.currentPot / 1000000000;

      logger.info(`Applied pot growth: ${growthSOL.toFixed(4)} SOL (${(this.POT_GROWTH_RATE * 100).toFixed(1)}% of ${previousPot / 1000000000} SOL). New pot: ${newPotSOL.toFixed(4)} SOL`);

      // Emit pot update with growth information
      if (this.io) {
        this.io.emit('potUpdate', {
          amount: this.currentPot,
          growth: growthAmount,
          timestamp: new Date()
        });
      }

    } catch (error) {
      logger.error('Failed to apply pot growth:', error);
      // Fallback: keep base amount
      this.currentPot = this.POT_BASE_AMOUNT;
    }
  }

  async updatePotBalance() {
    try {
      // Check the fee collection wallet WSOL balance
      const feeWallet = process.env.FEE_COLLECTION_WALLET;
      const wsolMint = 'So11111111111111111111111111111111111111112'; // WSOL mint address

      if (feeWallet && solanaService.isReady()) {
        const previousBalance = this.currentPot;
        const walletBalance = await solanaService.getTokenBalanceForWallet(feeWallet, wsolMint);

        // Display 70% of wallet balance as pot
        const potPercentage = 0.7; // 70%
        this.currentPot = Math.floor(walletBalance * potPercentage);

        // Emit pot update
        if (this.io) {
          this.io.emit('potUpdate', {
            amount: this.currentPot,
            walletBalance: walletBalance,
            potPercentage: potPercentage,
            timestamp: new Date()
          });
        }

        // Only log if balance changed significantly or if it's the first update
        if (Math.abs(this.currentPot - previousBalance) > 1000000 || previousBalance === 0) { // More than 0.001 SOL change
          logger.info(`Updated pot balance: ${this.currentPot} WSOL lamports (${this.currentPot / 1000000000} SOL) - 70% of wallet balance ${walletBalance / 1000000000} SOL`);
        }
      }

    } catch (error) {
      logger.error('Failed to update pot balance:', error);
    }
  }

  generateGameId() {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getCurrentState() {
    return {
      gameState: this.gameState,
      currentPot: this.currentPot,
      nextSpinTime: this.nextSpinTime,
      currentGame: this.currentGame,
      recentGames: this.gameHistory.slice(0, 5),
      isRunning: this.isRunning,
      spinInterval: this.spinInterval
    };
  }

  getGameHistory(limit = 10) {
    return this.gameHistory.slice(0, limit);
  }

  async forceSpinNow() {
    if (this.gameState !== 'waiting') {
      throw new Error('Cannot force spin while game is in progress');
    }
    
    logger.info('Forcing immediate spin...');
    await this.executeSpin();
  }

  stopGameCycle() {
    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
    }
    this.stopPeriodicPotUpdates();
    this.isRunning = false;
    logger.info('Game cycle stopped');
  }

  startPeriodicPotUpdates() {
    if (this.potUpdateInterval) {
      clearInterval(this.potUpdateInterval);
    }

    this.potUpdateInterval = setInterval(async () => {
      try {
        await this.updatePotBalance();
      } catch (error) {
        logger.error('Failed to update pot balance periodically:', error);
      }
    }, this.POT_UPDATE_INTERVAL_MS);

    logger.info(`Started periodic pot updates every ${this.POT_UPDATE_INTERVAL_MS / 1000} seconds`);
  }

  stopPeriodicPotUpdates() {
    if (this.potUpdateInterval) {
      clearInterval(this.potUpdateInterval);
      this.potUpdateInterval = null;
      logger.info('Stopped periodic pot updates');
    }
  }

  // Admin functions
  async pauseGame() {
    this.stopGameCycle();
    this.stopPeriodicPotUpdates();
    this.gameState = 'paused';
    logger.info('Game paused by admin');
  }

  async resumeGame() {
    this.gameState = 'waiting';
    this.calculateNextSpinTime();
    this.startGameCycle();
    this.startPeriodicPotUpdates();
    logger.info('Game resumed by admin');
  }

  getStats() {
    return {
      totalGames: this.gameHistory.length,
      totalPayouts: this.gameHistory.reduce((sum, game) => sum + (game.winnerPayout || 0), 0),
      averagePot: this.gameHistory.length > 0 
        ? this.gameHistory.reduce((sum, game) => sum + (game.potAmount || 0), 0) / this.gameHistory.length 
        : 0,
      currentState: this.getCurrentState()
    };
  }
}

module.exports = new GameEngine();