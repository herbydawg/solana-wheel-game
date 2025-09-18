const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');

async function testWSOLBalance() {
  const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=450320ef-0baa-4c1f-b812-48dfee9889b3');
  const walletAddress = '12eRH3HZkUbiFTshi1NHhS3B2cXt6CUL1zomZLjjYB63';
  const wsolMint = 'So11111111111111111111111111111111111111112';

  try {
    console.log('Testing WSOL balance for wallet:', walletAddress);
    const walletPublicKey = new PublicKey(walletAddress);
    const tokenMintPublicKey = new PublicKey(wsolMint);

    // First try associated token account
    try {
      const associatedTokenAccount = await getAssociatedTokenAddress(
        tokenMintPublicKey,
        walletPublicKey
      );
      console.log('Associated Token Account:', associatedTokenAccount.toString());

      const accountInfo = await connection.getAccountInfo(associatedTokenAccount);
      if (accountInfo) {
        const balance = accountInfo.data.readBigUInt64LE(64);
        console.log('✅ Found balance via associated token account:', Number(balance));
        console.log('Balance in SOL:', Number(balance) / 1000000000);
        return;
      }
    } catch (error) {
      console.log('❌ Associated token account approach failed:', error.message);
    }

    // Fallback: Search for token accounts owned by this wallet
    console.log('🔄 Trying fallback method...');
    const tokenAccounts = await connection.getTokenAccountsByOwner(walletPublicKey, {
      mint: tokenMintPublicKey
    });

    console.log('Found token accounts:', tokenAccounts.value.length);

    if (tokenAccounts.value.length > 0) {
      for (let i = 0; i < tokenAccounts.value.length; i++) {
        const account = tokenAccounts.value[i];
        const accountInfo = account.account;
        const balance = accountInfo.data.readBigUInt64LE(64);
        console.log(`Token Account ${i + 1}: ${account.pubkey.toString()}`);
        console.log(`Balance: ${Number(balance)} lamports (${Number(balance) / 1000000000} SOL)`);
      }
    } else {
      console.log('❌ No WSOL token accounts found for this wallet');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testWSOLBalance();