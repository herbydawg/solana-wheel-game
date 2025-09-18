#!/usr/bin/env node

/**
 * Solana Wheel Game - Test Setup Script
 * This script helps you test the application with sample data
 */

const fs = require('fs');
const path = require('path');

console.log('🎰 Solana Wheel Game - Test Setup\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env file from template...');
    if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ .env file created! Please edit it with your configuration.\n');
    } else {
        console.log('❌ .env.example file not found!\n');
        process.exit(1);
    }
} else {
    console.log('✅ .env file exists\n');
}

// Read and validate .env file
console.log('🔍 Checking configuration...');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
const config = {};

envLines.forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        config[key.trim()] = value.trim();
    }
});

// Check required configurations
const requiredConfigs = [
    'TOKEN_MINT_ADDRESS',
    'SOLANA_RPC_URL',
    'HOT_WALLET_PRIVATE_KEY',
    'CREATOR_WALLET',
    'ADMIN_PASSWORD'
];

const missingConfigs = [];
requiredConfigs.forEach(key => {
    if (!config[key] || config[key].includes('YOUR_') || config[key].includes('CHANGE_ME')) {
        missingConfigs.push(key);
    }
});

if (missingConfigs.length > 0) {
    console.log('❌ Missing or incomplete configuration:');
    missingConfigs.forEach(key => {
        console.log(`   - ${key}`);
    });
    console.log('\n📝 Please edit your .env file with the correct values.\n');
    
    // Show example configurations
    console.log('💡 Example configurations:');
    console.log('TOKEN_MINT_ADDRESS=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    console.log('HOT_WALLET_PRIVATE_KEY=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64]');
    console.log('CREATOR_WALLET=11111111111111111111111111111112');
    console.log('ADMIN_PASSWORD=secure_password_123\n');
} else {
    console.log('✅ All required configurations found\n');
}

// Test token address format
if (config.TOKEN_MINT_ADDRESS && config.TOKEN_MINT_ADDRESS.length !== 44) {
    console.log('⚠️  TOKEN_MINT_ADDRESS should be 44 characters long (base58 format)');
}

// Test private key format
if (config.HOT_WALLET_PRIVATE_KEY && !config.HOT_WALLET_PRIVATE_KEY.startsWith('[')) {
    console.log('⚠️  HOT_WALLET_PRIVATE_KEY should be in array format: [1,2,3,...]');
}

// Create logs directory
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
    console.log('📁 Created logs directory');
}

// Show next steps
console.log('\n🚀 Next Steps:');
console.log('1. Edit .env file with your configuration');
console.log('2. Run: npm run install:all');
console.log('3. Run: npm run dev');
console.log('4. Open: http://localhost:3000');
console.log('5. Admin: http://localhost:3000/admin\n');

// Show popular test tokens
console.log('🪙 Popular tokens for testing:');
console.log('USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
console.log('BONK: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
console.log('WIF:  EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm');
console.log('PEPE: BzUodBR1jyMF6XKmZYzp7VaQKhKGZEKhvhTBBzjhCbgZ\n');

console.log('📚 For detailed instructions, see LAUNCH_GUIDE.md');
console.log('🆘 Need help? Check the troubleshooting section in the guide\n');