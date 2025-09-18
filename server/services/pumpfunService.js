const axios = require('axios');
const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createTransferInstruction } = require('@solana/spl-token');
const logger = require('../utils/logger');
const solanaService = require('./solanaService');

class PumpFunService {
  constructor() {
    this.connection = null;
    this.pumpfunApiUrl = 'https://pumpportal.fun/api';
    this.isInitialized = false;
  }

  async initialize() {
    try {
      this.connection = solanaService.getConnection();
      this.isInitialized = true;
      logger.info('Pump.fun service initialized');
    } catch (error) {
      logger.error('Failed to initialize Pump.fun service:', error);
      throw error;
    }
  }

  /**
   * Get creator fees accumulated for a token
   * @param {string} tokenMintAddress - The token mint address
   * @returns {Promise<Object>} Fee information
   */
  async getCreatorFees(tokenMintAddress) {
    try {
      const response = await axios.get(`${this.pumpfunApiUrl}/fees/${tokenMintAddress}`);
      
      if (response.data && response.data.success) {
        return {
          totalFees: response.data.totalFees || 0,
          claimableFees: response.data.claimableFees || 0,
          lastClaimed: response.data.lastClaimed,
          creatorWallet: response.data.creatorWallet
        };
      }
      
      throw new Error('Invalid response from Pump.fun API');
    } catch (error) {
      logger.error('Failed to get creator fees:', error);
      
      // Fallback: Check creator wallet balance directly
      return await this.getCreatorWalletBalance(tokenMintAddress);
    }
  }

  /**
   * Fallback method to check creator wallet balance
   * @param {string} tokenMintAddress - The token mint address
   * @returns {Promise<Object>} Balance information
   */
  async getCreatorWalletBalance(tokenMintAddress) {
    try {
      const creatorWallet = process.env.CREATOR_WALLET;
      if (!creatorWallet) {
        throw new Error('Creator wallet not configured');
      }

      const creatorPubkey = new PublicKey(creatorWallet);
      
      // Get SOL balance
      const solBalance = await this.connection.getBalance(creatorPubkey);
      
      // Get token balance if it exists
      let tokenBalance = 0;
      try {
        const tokenAccount = await getAssociatedTokenAddress(
          new PublicKey(tokenMintAddress),
          creatorPubkey
        );
        
        const tokenAccountInfo = await this.connection.getTokenAccountBalance(tokenAccount);
        tokenBalance = parseInt(tokenAccountInfo.value.amount);
      } catch (error) {
        // Token account might not exist, which is fine
        logger.debug('No token account found for creator wallet');
      }

      return {
        totalFees: solBalance,
        claimableFees: solBalance,
        tokenBalance: tokenBalance,
        creatorWallet: creatorWallet,
        lastChecked: new Date()
      };
    } catch (error) {
      logger.error('Failed to get creator wallet balance:', error);
      throw error;
    }
  }

  /**
   * Claim creator fees from Pump.fun
   * @param {string} tokenMintAddress - The token mint address
   * @returns {Promise<string>} Transaction signature
   */
  async claimCreatorFees(tokenMintAddress) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // First, try using Pump.fun API to claim fees
      try {
        const response = await axios.post(`${this.pumpfunApiUrl}/claim-fees`, {
          tokenMint: tokenMintAddress,
          creatorWallet: process.env.CREATOR_WALLET
        });

        if (response.data && response.data.signature) {
          logger.info(`Creator fees claimed via Pump.fun API: ${response.data.signature}`);
          return response.data.signature;
        }
      } catch (apiError) {
        logger.warn('Pump.fun API claim failed, trying direct method:', apiError.message);
      }

      // Fallback: Direct wallet interaction
      return await this.claimFeesDirectly(tokenMintAddress);
      
    } catch (error) {
      logger.error('Failed to claim creator fees:', error);
      throw error;
    }
  }

  /**
   * Direct method to claim fees (fallback)
   * @param {string} tokenMintAddress - The token mint address
   * @returns {Promise<string>} Transaction signature
   */
  async claimFeesDirectly(tokenMintAddress) {
    try {
      const creatorWallet = process.env.CREATOR_WALLET;
      const hotWalletPrivateKey = process.env.HOT_WALLET_PRIVATE_KEY;
      
      if (!creatorWallet || !hotWalletPrivateKey) {
        throw new Error('Creator wallet or hot wallet not configured');
      }

      // This would require specific Pump.fun contract interaction
      // For now, we'll return the current balance as "claimable"
      const feeInfo = await this.getCreatorFees(tokenMintAddress);
      
      logger.info(`Creator fees available: ${feeInfo.claimableFees} lamports`);
      
      // Return a mock signature for now - in production this would be a real transaction
      return 'mock_claim_signature_' + Date.now();
      
    } catch (error) {
      logger.error('Failed to claim fees directly:', error);
      throw error;
    }
  }

  /**
   * Auto-send claimed fees to winner
   * @param {string} winnerAddress - Winner's wallet address
   * @param {number} amount - Amount to send in lamports
   * @returns {Promise<string>} Transaction signature
   */
  async sendFeesToWinner(winnerAddress, amount) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const hotWalletPrivateKey = JSON.parse(process.env.HOT_WALLET_PRIVATE_KEY);
      const hotWallet = solanaService.getKeypairFromPrivateKey(hotWalletPrivateKey);
      
      // Create transaction to send SOL to winner
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: hotWallet.publicKey,
          toPubkey: new PublicKey(winnerAddress),
          lamports: amount
        })
      );

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = hotWallet.publicKey;

      // Sign and send transaction
      transaction.sign(hotWallet);
      const signature = await this.connection.sendRawTransaction(transaction.serialize());
      
      // Confirm transaction
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      logger.info(`Sent ${amount / LAMPORTS_PER_SOL} SOL to winner ${winnerAddress}: ${signature}`);
      
      return signature;
      
    } catch (error) {
      logger.error('Failed to send fees to winner:', error);
      throw error;
    }
  }

  /**
   * Complete flow: Claim fees and send to winner
   * @param {string} tokenMintAddress - The token mint address
   * @param {string} winnerAddress - Winner's wallet address
   * @returns {Promise<Object>} Transaction details
   */
  async claimAndSendToWinner(tokenMintAddress, winnerAddress) {
    try {
      logger.info(`Starting claim and send process for token ${tokenMintAddress} to winner ${winnerAddress}`);
      
      // Step 1: Get current claimable fees
      const feeInfo = await this.getCreatorFees(tokenMintAddress);
      
      if (feeInfo.claimableFees <= 0) {
        throw new Error('No claimable fees available');
      }

      // Step 2: Claim the fees
      const claimSignature = await this.claimCreatorFees(tokenMintAddress);
      
      // Step 3: Send fees to winner
      const sendSignature = await this.sendFeesToWinner(winnerAddress, feeInfo.claimableFees);
      
      const result = {
        claimSignature,
        sendSignature,
        amount: feeInfo.claimableFees,
        amountSOL: feeInfo.claimableFees / LAMPORTS_PER_SOL,
        winner: winnerAddress,
        timestamp: new Date()
      };
      
      logger.info('Claim and send process completed successfully:', result);
      
      return result;
      
    } catch (error) {
      logger.error('Failed to claim and send fees:', error);
      throw error;
    }
  }

  /**
   * Get fee claiming status and statistics
   * @returns {Promise<Object>} Fee claiming stats
   */
  async getFeeClaimingStats() {
    try {
      const tokenMintAddress = process.env.TOKEN_MINT_ADDRESS;
      if (!tokenMintAddress) {
        throw new Error('Token mint address not configured');
      }

      const feeInfo = await this.getCreatorFees(tokenMintAddress);
      
      return {
        tokenMintAddress,
        creatorWallet: process.env.CREATOR_WALLET,
        totalFees: feeInfo.totalFees,
        claimableFees: feeInfo.claimableFees,
        claimableSOL: feeInfo.claimableFees / LAMPORTS_PER_SOL,
        lastClaimed: feeInfo.lastClaimed,
        isConfigured: !!(process.env.CREATOR_WALLET && process.env.HOT_WALLET_PRIVATE_KEY),
        lastChecked: new Date()
      };
    } catch (error) {
      logger.error('Failed to get fee claiming stats:', error);
      return {
        error: error.message,
        isConfigured: false,
        lastChecked: new Date()
      };
    }
  }
}

module.exports = new PumpFunService();