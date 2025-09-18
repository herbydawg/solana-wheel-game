const { Connection, PublicKey, Keypair, clusterApiUrl } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require('@solana/spl-token');
const logger = require('../utils/logger');

class SolanaService {
  constructor() {
    this.connection = null;
    this.backupConnections = [];
    this.currentRpcIndex = 0;
    this.hotWallet = null;
    this.tokenMintAddress = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Initialize RPC connections
      const rpcUrls = [
        process.env.SOLANA_RPC_URL,
        process.env.SOLANA_RPC_BACKUP_1,
        process.env.SOLANA_RPC_BACKUP_2
      ].filter(Boolean);

      if (rpcUrls.length === 0) {
        throw new Error('No RPC URLs configured');
      }

      // Create primary connection
      this.connection = new Connection(rpcUrls[0], {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
      });

      // Create backup connections
      this.backupConnections = rpcUrls.slice(1).map(url =>
        new Connection(url, {
          commitment: 'confirmed',
          confirmTransactionInitialTimeout: 60000,
        })
      );

      // Initialize hot wallet (optional for read-only mode)
      if (process.env.HOT_WALLET_PRIVATE_KEY && process.env.HOT_WALLET_PRIVATE_KEY.trim()) {
        try {
          const privateKeyArray = JSON.parse(process.env.HOT_WALLET_PRIVATE_KEY);
          this.hotWallet = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
          logger.info(`Hot wallet initialized: ${this.hotWallet.publicKey.toString()}`);
        } catch (error) {
          logger.warn('Failed to initialize hot wallet, running in read-only mode:', error.message);
        }
      } else {
        logger.info('No hot wallet configured - running in read-only mode');
      }

      // Set token mint address
      if (process.env.TOKEN_MINT_ADDRESS) {
        this.tokenMintAddress = new PublicKey(process.env.TOKEN_MINT_ADDRESS);
        logger.info(`Token mint address set: ${this.tokenMintAddress.toString()}`);
      }

      // Test connection
      await this.testConnection();

      this.isInitialized = true;
      logger.info('Solana service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Solana service:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const version = await this.connection.getVersion();
      logger.info(`Connected to Solana cluster version: ${version['solana-core']}`);
      
      const slot = await this.connection.getSlot();
      logger.info(`Current slot: ${slot}`);
      
      return true;
    } catch (error) {
      logger.error('Connection test failed:', error);
      throw error;
    }
  }

  async switchToBackupRpc() {
    if (this.backupConnections.length === 0) {
      throw new Error('No backup RPC connections available');
    }

    this.currentRpcIndex = (this.currentRpcIndex + 1) % this.backupConnections.length;
    this.connection = this.backupConnections[this.currentRpcIndex];
    
    logger.warn(`Switched to backup RPC connection #${this.currentRpcIndex + 1}`);
    
    try {
      await this.testConnection();
      return true;
    } catch (error) {
      logger.error(`Backup RPC connection #${this.currentRpcIndex + 1} also failed:`, error);
      return false;
    }
  }

  async executeWithRetry(operation, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        logger.warn(`Operation failed on attempt ${attempt}:`, error.message);
        
        if (attempt < maxRetries) {
          // Try switching to backup RPC if available
          if (this.backupConnections.length > 0) {
            await this.switchToBackupRpc();
          }
          
          // Wait before retry with exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  async getTokenHolders() {
    return this.executeWithRetry(async () => {
      if (!this.tokenMintAddress) {
        throw new Error('Token mint address not configured');
      }

      const accounts = await this.connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
        filters: [
          {
            dataSize: 165, // Token account data size
          },
          {
            memcmp: {
              offset: 0,
              bytes: this.tokenMintAddress.toBase58(),
            },
          },
        ],
      });

      const holders = [];
      
      for (const account of accounts) {
        try {
          const accountData = account.account.data;
          const balance = accountData.readBigUInt64LE(64);
          
          if (balance > 0) {
            const owner = new PublicKey(accountData.slice(32, 64));
            holders.push({
              owner: owner.toString(),
              balance: balance.toString(),
              tokenAccount: account.pubkey.toString()
            });
          }
        } catch (error) {
          logger.warn('Failed to parse token account:', error);
        }
      }

      return holders;
    });
  }

  async getTokenSupply() {
    return this.executeWithRetry(async () => {
      if (!this.tokenMintAddress) {
        throw new Error('Token mint address not configured');
      }

      const supply = await this.connection.getTokenSupply(this.tokenMintAddress);
      return supply.value;
    });
  }

  async getAccountBalance(publicKey) {
    return this.executeWithRetry(async () => {
      const balance = await this.connection.getBalance(new PublicKey(publicKey));
      return balance;
    });
  }

  async getTokenBalanceForWallet(walletAddress, tokenMintAddress) {
    return this.executeWithRetry(async () => {
      const walletPublicKey = new PublicKey(walletAddress);
      const tokenMintPublicKey = new PublicKey(tokenMintAddress);

      try {
        // First try to get associated token account
        const associatedTokenAccount = await getAssociatedTokenAddress(
          tokenMintPublicKey,
          walletPublicKey
        );

        const accountInfo = await this.connection.getAccountInfo(associatedTokenAccount);
        if (accountInfo) {
          // Parse token account data
          const balance = accountInfo.data.readBigUInt64LE(64);
          return Number(balance);
        }
      } catch (error) {
        logger.warn(`Associated token account approach failed for ${walletAddress}:`, error.message);
      }

      // Fallback: Search for token accounts owned by this wallet
      try {
        const tokenAccounts = await this.connection.getTokenAccountsByOwner(walletPublicKey, {
          mint: tokenMintPublicKey
        });

        if (tokenAccounts.value.length > 0) {
          // Use the first token account found
          const accountInfo = tokenAccounts.value[0].account;
          const balance = accountInfo.data.readBigUInt64LE(64);
          logger.info(`Found token balance via fallback method: ${Number(balance)}`);
          return Number(balance);
        }
      } catch (fallbackError) {
        logger.warn(`Fallback token balance lookup failed for ${walletAddress}:`, fallbackError.message);
      }

      logger.warn(`No token accounts found for wallet ${walletAddress} and mint ${tokenMintAddress}`);
      return 0;
    });
  }

  async getRecentBlockhash() {
    return this.executeWithRetry(async () => {
      const { blockhash } = await this.connection.getLatestBlockhash();
      return blockhash;
    });
  }

  async sendTransaction(transaction) {
    return this.executeWithRetry(async () => {
      const signature = await this.connection.sendTransaction(transaction, [this.hotWallet], {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      return signature;
    });
  }

  async getTransactionHistory(address, limit = 10) {
    return this.executeWithRetry(async () => {
      const publicKey = new PublicKey(address);
      const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit });
      
      const transactions = [];
      for (const sig of signatures) {
        try {
          const tx = await this.connection.getTransaction(sig.signature);
          if (tx) {
            transactions.push({
              signature: sig.signature,
              slot: sig.slot,
              blockTime: sig.blockTime,
              transaction: tx
            });
          }
        } catch (error) {
          logger.warn(`Failed to fetch transaction ${sig.signature}:`, error);
        }
      }
      
      return transactions;
    });
  }

  getConnection() {
    return this.connection;
  }

  getHotWallet() {
    return this.hotWallet;
  }

  getTokenMintAddress() {
    return this.tokenMintAddress;
  }

  isReady() {
    return this.isInitialized && this.connection && this.tokenMintAddress;
  }
}

module.exports = new SolanaService();