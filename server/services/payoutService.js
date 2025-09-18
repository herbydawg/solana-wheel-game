const { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const solanaService = require('./solanaService');
const logger = require('../utils/logger');

class PayoutService {
  constructor() {
    this.payoutHistory = [];
    this.pendingPayouts = new Map();
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  async processWinnerPayout(winnerAddress, winnerAmount, creatorAmount) {
    const payoutId = this.generatePayoutId();

    // Check if we have a hot wallet configured
    const hotWallet = solanaService.getHotWallet();
    if (!hotWallet) {
      logger.info(`Payout ${payoutId} simulated (read-only mode): Winner ${winnerAddress} would get ${winnerAmount} lamports, Creator would get ${creatorAmount} lamports`);

      const payout = {
        id: payoutId,
        winnerAddress,
        winnerAmount,
        creatorAmount,
        totalAmount: winnerAmount + creatorAmount,
        status: 'simulated',
        attempts: 0,
        createdAt: new Date(),
        transactionSignature: `simulated_${payoutId}`,
        error: null,
        simulated: true
      };

      // Add to history as simulated payout
      this.payoutHistory.unshift(payout);

      // Keep only last 100 payouts in memory
      if (this.payoutHistory.length > 100) {
        this.payoutHistory = this.payoutHistory.slice(0, 100);
      }

      return payout.transactionSignature;
    }

    try {
      logger.info(`Processing payout ${payoutId}: Winner ${winnerAddress} gets ${winnerAmount} lamports, Creator gets ${creatorAmount} lamports`);

      const payout = {
        id: payoutId,
        winnerAddress,
        winnerAmount,
        creatorAmount,
        totalAmount: winnerAmount + creatorAmount,
        status: 'pending',
        attempts: 0,
        createdAt: new Date(),
        transactionSignature: null,
        error: null
      };

      this.pendingPayouts.set(payoutId, payout);

      // Execute the payout transaction
      const signature = await this.executePayoutTransaction(payout);

      payout.transactionSignature = signature;
      payout.status = 'completed';
      payout.completedAt = new Date();

      // Move to history
      this.payoutHistory.unshift(payout);
      this.pendingPayouts.delete(payoutId);

      // Keep only last 100 payouts in memory
      if (this.payoutHistory.length > 100) {
        this.payoutHistory = this.payoutHistory.slice(0, 100);
      }

      logger.info(`Payout ${payoutId} completed successfully. Transaction: ${signature}`);
      return signature;

    } catch (error) {
      logger.error(`Payout ${payoutId} failed:`, error);

      const payout = this.pendingPayouts.get(payoutId);
      if (payout) {
        payout.status = 'failed';
        payout.error = error.message;
        payout.failedAt = new Date();

        // Move to history even if failed
        this.payoutHistory.unshift(payout);
        this.pendingPayouts.delete(payoutId);
      }

      throw error;
    }
  }

  async executePayoutTransaction(payout) {
    const hotWallet = solanaService.getHotWallet();
    const connection = solanaService.getConnection();
    const wsolMint = 'So11111111111111111111111111111111111111112'; // WSOL mint address

    if (!hotWallet) {
      throw new Error('Hot wallet not configured');
    }

    // Check hot wallet WSOL balance
    const hotWalletWsolBalance = await solanaService.getTokenBalanceForWallet(
      hotWallet.publicKey.toString(),
      wsolMint
    );
    const requiredBalance = payout.totalAmount;

    if (hotWalletWsolBalance < requiredBalance) {
      throw new Error(`Insufficient hot wallet WSOL balance. Required: ${requiredBalance}, Available: ${hotWalletWsolBalance}`);
    }

    const transaction = new Transaction();

    // Get associated token accounts and add transfer instructions
    if (payout.winnerAmount > 0) {
      await this.addWsolTransferInstruction(
        transaction,
        hotWallet.publicKey,
        payout.winnerAddress,
        payout.winnerAmount,
        wsolMint
      );
    }

    if (payout.creatorAmount > 0) {
      const creatorWallet = process.env.CREATOR_WALLET;
      if (!creatorWallet) {
        throw new Error('Creator wallet not configured');
      }

      await this.addWsolTransferInstruction(
        transaction,
        hotWallet.publicKey,
        creatorWallet,
        payout.creatorAmount,
        wsolMint
      );
    }

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = hotWallet.publicKey;

    // Sign and send transaction with retry logic
    return await this.sendTransactionWithRetry(transaction, payout);
  }

  async addWsolTransferInstruction(transaction, fromWallet, toWalletAddress, amount, wsolMint) {
    const fromPublicKey = new PublicKey(fromWallet);
    const toPublicKey = new PublicKey(toWalletAddress);
    const tokenMintPublicKey = new PublicKey(wsolMint);

    // Get associated token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(
      tokenMintPublicKey,
      fromPublicKey
    );

    const toTokenAccount = await getAssociatedTokenAddress(
      tokenMintPublicKey,
      toPublicKey
    );

    // Check if recipient's associated token account exists, create if not
    const connection = solanaService.getConnection();
    const toTokenAccountInfo = await connection.getAccountInfo(toTokenAccount);

    if (!toTokenAccountInfo) {
      // Add instruction to create associated token account
      const createAtaInstruction = await this.createAssociatedTokenAccountInstruction(
        fromPublicKey,
        toPublicKey,
        tokenMintPublicKey
      );
      transaction.add(createAtaInstruction);
    }

    // Add transfer instruction
    const transferInstruction = createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      fromPublicKey,
      amount,
      [],
      TOKEN_PROGRAM_ID
    );

    transaction.add(transferInstruction);
  }

  async createAssociatedTokenAccountInstruction(payer, owner, mint) {
    const { createAssociatedTokenAccountInstruction } = require('@solana/spl-token');
    return createAssociatedTokenAccountInstruction(
      payer,
      await getAssociatedTokenAddress(mint, owner),
      owner,
      mint
    );
  }

  async sendTransactionWithRetry(transaction, payout) {
    const hotWallet = solanaService.getHotWallet();
    const connection = solanaService.getConnection();
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        payout.attempts = attempt;
        
        logger.info(`Sending payout transaction ${payout.id}, attempt ${attempt}/${this.retryAttempts}`);
        
        // Sign the transaction
        transaction.sign(hotWallet);
        
        // Send transaction
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
        
        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        
        logger.info(`Payout transaction ${payout.id} confirmed: ${signature}`);
        return signature;
        
      } catch (error) {
        logger.warn(`Payout transaction ${payout.id} attempt ${attempt} failed:`, error.message);
        
        if (attempt === this.retryAttempts) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Get fresh blockhash for retry
        try {
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
        } catch (blockhashError) {
          logger.warn('Failed to get fresh blockhash for retry:', blockhashError);
        }
      }
    }
  }

  async processTokenPayout(winnerAddress, tokenAmount) {
    // For token payouts (if needed in the future)
    const hotWallet = solanaService.getHotWallet();
    const connection = solanaService.getConnection();
    const tokenMint = solanaService.getTokenMintAddress();
    
    if (!tokenMint) {
      throw new Error('Token mint address not configured');
    }
    
    try {
      // Get associated token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        hotWallet.publicKey
      );
      
      const toTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        new PublicKey(winnerAddress)
      );
      
      const transaction = new Transaction();
      
      // Add transfer instruction
      const transferInstruction = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        hotWallet.publicKey,
        tokenAmount,
        [],
        TOKEN_PROGRAM_ID
      );
      
      transaction.add(transferInstruction);
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = hotWallet.publicKey;
      
      // Sign and send
      transaction.sign(hotWallet);
      const signature = await connection.sendRawTransaction(transaction.serialize());
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      return signature;
      
    } catch (error) {
      logger.error('Token payout failed:', error);
      throw error;
    }
  }

  generatePayoutId() {
    return `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getPayoutHistory(limit = 20) {
    return this.payoutHistory.slice(0, limit);
  }

  getPendingPayouts() {
    return Array.from(this.pendingPayouts.values());
  }

  getPayoutById(payoutId) {
    return this.payoutHistory.find(p => p.id === payoutId) || 
           this.pendingPayouts.get(payoutId);
  }

  getPayoutStats() {
    const completed = this.payoutHistory.filter(p => p.status === 'completed');
    const failed = this.payoutHistory.filter(p => p.status === 'failed');
    
    const totalPaidOut = completed.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalWinnerPayouts = completed.reduce((sum, p) => sum + p.winnerAmount, 0);
    const totalCreatorPayouts = completed.reduce((sum, p) => sum + p.creatorAmount, 0);
    
    return {
      totalPayouts: this.payoutHistory.length,
      completedPayouts: completed.length,
      failedPayouts: failed.length,
      pendingPayouts: this.pendingPayouts.size,
      totalPaidOut,
      totalWinnerPayouts,
      totalCreatorPayouts,
      averagePayoutAmount: completed.length > 0 ? totalPaidOut / completed.length : 0,
      successRate: this.payoutHistory.length > 0 ? (completed.length / this.payoutHistory.length) * 100 : 0
    };
  }

  async validateHotWalletBalance() {
    try {
      const hotWallet = solanaService.getHotWallet();
      if (!hotWallet) {
        return { valid: false, error: 'Hot wallet not configured' };
      }

      const wsolMint = 'So11111111111111111111111111111111111111112'; // WSOL mint address
      const wsolBalance = await solanaService.getTokenBalanceForWallet(
        hotWallet.publicKey.toString(),
        wsolMint
      );
      const minimumBalance = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL equivalent in WSOL lamports

      return {
        valid: wsolBalance >= minimumBalance,
        balance: wsolBalance,
        minimumBalance,
        balanceSOL: wsolBalance / LAMPORTS_PER_SOL,
        address: hotWallet.publicKey.toString(),
        token: 'WSOL'
      };

    } catch (error) {
      logger.error('Failed to validate hot wallet balance:', error);
      return { valid: false, error: error.message };
    }
  }

  async estimateTransactionFee() {
    try {
      const connection = solanaService.getConnection();
      
      // Create a dummy transaction to estimate fees
      const dummyTransaction = new Transaction();
      dummyTransaction.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey('11111111111111111111111111111111'),
          toPubkey: new PublicKey('11111111111111111111111111111111'),
          lamports: 1000000,
        })
      );
      
      const fee = await connection.getFeeForMessage(dummyTransaction.compileMessage());
      return fee.value || 5000; // Default to 5000 lamports if estimation fails
      
    } catch (error) {
      logger.warn('Failed to estimate transaction fee:', error);
      return 5000; // Default fee
    }
  }

  // Emergency functions
  async pausePayouts() {
    logger.warn('Payouts paused by admin');
    this.payoutsPaused = true;
  }

  async resumePayouts() {
    logger.info('Payouts resumed by admin');
    this.payoutsPaused = false;
  }

  async retryFailedPayout(payoutId) {
    const payout = this.payoutHistory.find(p => p.id === payoutId && p.status === 'failed');
    
    if (!payout) {
      throw new Error('Failed payout not found');
    }
    
    logger.info(`Retrying failed payout ${payoutId}`);
    
    // Reset payout status
    payout.status = 'pending';
    payout.attempts = 0;
    payout.error = null;
    
    // Move back to pending
    this.pendingPayouts.set(payoutId, payout);
    this.payoutHistory = this.payoutHistory.filter(p => p.id !== payoutId);
    
    // Execute the payout
    try {
      const signature = await this.executePayoutTransaction(payout);
      
      payout.transactionSignature = signature;
      payout.status = 'completed';
      payout.completedAt = new Date();
      
      // Move back to history
      this.payoutHistory.unshift(payout);
      this.pendingPayouts.delete(payoutId);
      
      return signature;
      
    } catch (error) {
      payout.status = 'failed';
      payout.error = error.message;
      payout.failedAt = new Date();
      
      this.payoutHistory.unshift(payout);
      this.pendingPayouts.delete(payoutId);
      
      throw error;
    }
  }
}

module.exports = new PayoutService();