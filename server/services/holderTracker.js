const solanaService = require('./solanaService');
const heliusService = require('./heliusService');
const logger = require('../utils/logger');
const db = require('../database/connection');
const { HolderModel, SystemSettingsModel } = require('../database/models');

class HolderTracker {
  constructor() {
    this.holders = new Map();
    this.eligibleHolders = new Map();
    this.totalSupply = 0;
    this.minimumHoldAmount = 0;
    this.isTracking = false;
    this.trackingInterval = null;
    this.io = null;
    this.lastUpdate = null;
    this.updateFrequency = 30000; // 30 seconds
    this.useDatabase = false;
  }

  async initialize(socketIo) {
    try {
      this.io = socketIo;

      // Check database connectivity
      this.useDatabase = db.isConnected;

      // Try to initialize Helius service first
      const heliusAvailable = await heliusService.initialize();

      if (heliusAvailable) {
        logger.info('Using Helius for enhanced token data');
        this.useHelius = true;
      } else {
        logger.info('Using standard Solana RPC');
        this.useHelius = false;
      }

      // Get initial token supply
      await this.updateTokenSupply();

      // Load existing holders from database if available
      if (this.useDatabase) {
        await this.loadHoldersFromDatabase();
      }

      // Perform initial holder scan
      await this.scanHolders();

      // Start periodic tracking
      this.startTracking();

      logger.info('Holder tracker initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize holder tracker:', error);
      // Don't throw error, continue with demo data
      this.useDemoData();
    }
  }

  async loadHoldersFromDatabase() {
    try {
      logger.info('Loading holders from database...');
      const holders = await HolderModel.getEligibleHolders();
      const allHolders = await HolderModel.getTopHolders(1000); // Load more for complete data

      // Populate in-memory maps
      holders.forEach(holder => {
        this.eligibleHolders.set(holder.address, holder);
      });

      allHolders.forEach(holder => {
        this.holders.set(holder.address, holder);
      });

      logger.info(`Loaded ${this.holders.size} holders from database (${this.eligibleHolders.size} eligible)`);
    } catch (error) {
      logger.warn('Failed to load holders from database:', error.message);
    }
  }

  useDemoData() {
    logger.warn('No real blockchain data available - waiting for connection...');

    // Clear holders instead of showing demo data
    this.holders = new Map();
    this.eligibleHolders = new Map();
    this.totalSupply = 0;
    this.minimumHoldAmount = 0;
    this.lastUpdate = null;

    // Emit empty data to indicate waiting for real data
    if (this.io) {
      this.io.emit('holderUpdate', {
        totalHolders: 0,
        eligibleHolders: 0,
        minimumHoldAmount: 0,
        totalSupply: 0,
        lastUpdate: null,
        holders: [],
        waitingForData: true
      });
    }
  }

  async updateTokenSupply() {
    try {
      const supply = await solanaService.getTokenSupply();
      this.totalSupply = parseInt(supply.amount);
      
      // Calculate minimum hold amount (0.1% of total supply)
      const minPercentage = parseFloat(process.env.MINIMUM_HOLD_PERCENTAGE) || 0.1;
      this.minimumHoldAmount = Math.floor(this.totalSupply * (minPercentage / 100));
      
      logger.info(`Total supply: ${this.totalSupply}, Minimum hold: ${this.minimumHoldAmount}`);
    } catch (error) {
      logger.error('Failed to update token supply:', error);
      throw error;
    }
  }

  async scanHolders() {
    try {
      const startTime = Date.now();
      const previousHolderCount = this.holders.size;
      logger.info('Starting holder scan...');

      const holders = await solanaService.getTokenHolders();
      const newHolders = new Map();
      const newEligibleHolders = new Map();

      // Process each holder
      for (const holder of holders) {
        const balance = parseInt(holder.balance);

        // Skip zero balances and known burn addresses
        if (balance === 0 || this.isBurnAddress(holder.owner)) {
          continue;
        }

        const holderData = {
          address: holder.owner,
          balance: balance,
          tokenAccount: holder.tokenAccount,
          percentage: (balance / this.totalSupply) * 100,
          lastUpdated: new Date(),
          isEligible: balance >= this.minimumHoldAmount
        };

        newHolders.set(holder.owner, holderData);

        // Add to eligible holders if meets minimum requirement
        if (holderData.isEligible) {
          newEligibleHolders.set(holder.owner, holderData);
        }

        // Save to database if available
        if (this.useDatabase) {
          try {
            await HolderModel.upsert(holderData);
          } catch (error) {
            logger.warn(`Failed to save holder ${holder.owner} to database:`, error.message);
          }
        }
      }

      // Update holder maps
      const previousEligibleCount = this.eligibleHolders.size;
      this.holders = newHolders;
      this.eligibleHolders = newEligibleHolders;
      this.lastUpdate = new Date();

      const scanTime = Date.now() - startTime;
      const eligibleCount = this.eligibleHolders.size;
      const totalCount = this.holders.size;

      logger.info(`Holder scan completed in ${scanTime}ms: ${totalCount} total holders, ${eligibleCount} eligible`);

      // Optimize update frequency based on holder count
      this.optimizeUpdateFrequency(totalCount);

      // Setup WebSocket monitoring for new tokens
      if (totalCount < 100 && !this.websocketSubscriptions) {
        this.setupWebSocketMonitoring();
      }

      // Emit updates via WebSocket
      if (this.io) {
        this.io.emit('holderUpdate', {
          totalHolders: totalCount,
          eligibleHolders: eligibleCount,
          minimumHoldAmount: this.minimumHoldAmount,
          totalSupply: this.totalSupply,
          lastUpdate: this.lastUpdate,
          holders: this.getTopHolders(10),
          scanTime: scanTime
        });

        // Emit eligibility changes
        if (eligibleCount !== previousEligibleCount) {
          this.io.emit('eligibilityChange', {
            previousCount: previousEligibleCount,
            currentCount: eligibleCount,
            change: eligibleCount - previousEligibleCount
          });
        }

        // Emit new holder alerts for growing tokens
        if (totalCount > previousHolderCount && totalCount < 50) {
          this.io.emit('newHolderAlert', {
            newHolders: totalCount - previousHolderCount,
            totalHolders: totalCount,
            message: `🚀 ${totalCount - previousHolderCount} new holder(s) joined!`
          });
        }
      }

    } catch (error) {
      logger.error('Failed to scan holders:', error);
      throw error;
    }
  }

  optimizeUpdateFrequency(holderCount) {
    // Smart update frequency based on token maturity and API efficiency
    if (holderCount < 50) {
      // New/growing token - fast updates for real-time experience
      this.updateFrequency = 5000; // 5 seconds - user requested
      logger.info(`🚀 Active token (${holderCount} holders) - real-time updates every 5s`);
    } else if (holderCount < 200) {
      // Moderately active token
      this.updateFrequency = 15000; // 15 seconds
      logger.info(`📈 Moderately active (${holderCount} holders) - updates every 15s`);
    } else {
      // Established token - balance speed vs API costs
      this.updateFrequency = 30000; // 30 seconds
      logger.info(`✅ Established token (${holderCount} holders) - updates every 30s`);
    }

    // Restart tracking with new frequency if already running
    if (this.isTracking) {
      this.stopTracking();
      this.startTracking();
    }
  }

  // Smart caching to avoid unnecessary API calls
  shouldUpdateHolders() {
    const now = Date.now();
    const timeSinceLastUpdate = now - (this.lastUpdate?.getTime() || 0);

    // Always update if it's been longer than the frequency
    if (timeSinceLastUpdate >= this.updateFrequency) {
      return true;
    }

    // For very active tokens, allow more frequent checks but with smart throttling
    if (this.holders.size < 100 && timeSinceLastUpdate >= 2000) {
      return true; // Check every 2 seconds for small tokens
    }

    return false;
  }

  startTracking() {
    if (this.isTracking) {
      return;
    }

    this.isTracking = true;
    this.trackingInterval = setInterval(async () => {
      try {
        // Smart caching: only update if needed
        if (this.shouldUpdateHolders()) {
          await this.updateTokenSupply();
          await this.scanHolders();
        } else {
          // For very active tokens, still emit current data to keep UI fresh
          if (this.holders.size < 100 && this.io) {
            this.io.emit('holderUpdate', {
              totalHolders: this.holders.size,
              eligibleHolders: this.eligibleHolders.size,
              minimumHoldAmount: this.minimumHoldAmount,
              totalSupply: this.totalSupply,
              lastUpdate: this.lastUpdate,
              holders: this.getTopHolders(10),
              cached: true // Indicate this is cached data
            });
          }
        }
      } catch (error) {
        logger.error('Error during periodic holder tracking:', error);
      }
    }, Math.min(this.updateFrequency, 5000)); // Cap at 5 seconds minimum check interval

    logger.info(`Started smart holder tracking (checks every ${Math.min(this.updateFrequency, 5000)}ms, updates every ${this.updateFrequency}ms)`);
  }

  stopTracking() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    this.isTracking = false;
    logger.info('Stopped holder tracking');
  }

  isBurnAddress(address) {
    const burnAddresses = [
      '11111111111111111111111111111111', // System program
      'So11111111111111111111111111111111111111112', // Wrapped SOL
      '1nc1nerator11111111111111111111111111111111', // Incinerator
      '6EF8rrecthR5Dkzon8NQtpjxarMxGrbz7QcGMw1gcx', // Pump.fun bonding curve
      '9KJRLL6VHRo5Yvh9LHs4FciL4McCXZBQzgWDNg3aKXDY', // Current token bonding curve
    ];

    return burnAddresses.includes(address) ||
            address.startsWith('1111111111111111111111111111111');
  }

  getEligibleHolders() {
    return Array.from(this.eligibleHolders.values());
  }

  getRandomEligibleHolder() {
    const eligible = this.getEligibleHolders();
    if (eligible.length === 0) {
      return null;
    }
    
    // Weighted random selection based on balance
    const totalWeight = eligible.reduce((sum, holder) => sum + holder.balance, 0);
    let random = Math.random() * totalWeight;
    
    for (const holder of eligible) {
      random -= holder.balance;
      if (random <= 0) {
        return holder;
      }
    }
    
    // Fallback to simple random selection
    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  getTopHolders(limit = 10) {
    return Array.from(this.holders.values())
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit)
      .map(holder => ({
        address: holder.address,
        balance: holder.balance,
        percentage: holder.percentage,
        isEligible: holder.isEligible
      }));
  }

  getHolderByAddress(address) {
    return this.holders.get(address);
  }

  getStats() {
    return {
      totalHolders: this.holders.size,
      eligibleHolders: this.eligibleHolders.size,
      totalSupply: this.totalSupply,
      minimumHoldAmount: this.minimumHoldAmount,
      minimumHoldPercentage: parseFloat(process.env.MINIMUM_HOLD_PERCENTAGE) || 0.1,
      lastUpdate: this.lastUpdate,
      isTracking: this.isTracking,
      topHolders: this.getTopHolders(5)
    };
  }

  async forceUpdate() {
    logger.info('Forcing holder update...');
    try {
      await this.updateTokenSupply();
      await this.scanHolders();
      return this.getStats();
    } catch (error) {
      logger.error('Failed to force update holders:', error);
      throw error;
    }
  }

  // Get holder distribution for wheel visualization
  getHolderDistribution() {
    const eligible = this.getEligibleHolders();
    const totalEligibleBalance = eligible.reduce((sum, holder) => sum + holder.balance, 0);
    
    return eligible.map(holder => ({
      address: holder.address,
      balance: holder.balance,
      percentage: (holder.balance / totalEligibleBalance) * 100,
      displayName: `${holder.address.slice(0, 4)}...${holder.address.slice(-4)}`
    }));
  }

  // Check if a specific address is eligible
  isAddressEligible(address) {
    return this.eligibleHolders.has(address);
  }

  // Get holder count changes over time (for analytics)
  getHolderTrends() {
    // This would typically pull from a database with historical data
    // For now, return current snapshot
    return {
      current: this.holders.size,
      eligible: this.eligibleHolders.size,
      timestamp: this.lastUpdate
    };
  }
}

module.exports = new HolderTracker();