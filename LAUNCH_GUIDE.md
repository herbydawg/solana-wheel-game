# 🚀 Solana Wheel Game - Launch Guide

This guide will walk you through launching, connecting, and testing the complete application step by step.

## 📋 Prerequisites

Before starting, ensure you have:
- **Node.js 16+** installed
- **npm** or **yarn** package manager
- **Git** for cloning
- **Solana wallet** with some SOL for testing
- **Pump.Fun token** mint address (or any SPL token for testing)

## 🛠️ Step 1: Project Setup

### 1.1 Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 1.2 Create Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env
```

### 1.3 Configure Your Environment
Edit the `.env` file with your settings:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Solana Configuration (REQUIRED)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_RPC_BACKUP_1=https://solana-api.projectserum.com
SOLANA_RPC_BACKUP_2=https://rpc.ankr.com/solana
SOLANA_NETWORK=mainnet-beta

# Game Configuration (REQUIRED)
TOKEN_MINT_ADDRESS=YOUR_PUMP_FUN_TOKEN_MINT_ADDRESS_HERE
MINIMUM_HOLD_PERCENTAGE=0.1
SPIN_INTERVAL_MINUTES=5
WINNER_PAYOUT_PERCENTAGE=50
CREATOR_PAYOUT_PERCENTAGE=50

# Wallet Configuration (REQUIRED FOR PAYOUTS)
HOT_WALLET_PRIVATE_KEY=[1,2,3,4,5...] # Your wallet private key as array
FEE_COLLECTION_WALLET=YOUR_FEE_COLLECTION_WALLET_ADDRESS
CREATOR_WALLET=YOUR_CREATOR_WALLET_ADDRESS

# Security
JWT_SECRET=your-super-secret-jwt-key-here
ADMIN_PASSWORD=your-secure-admin-password

# Database (Optional - will use in-memory if not provided)
REDIS_URL=redis://localhost:6379
POSTGRES_URL=postgresql://username:password@localhost:5432/solana_wheel_game
```

## 🔑 Step 2: Wallet Setup (CRITICAL)

### 2.1 Get Your Private Key
```bash
# If you have a Solana CLI wallet
solana-keygen pubkey ~/.config/solana/id.json
solana-keygen export ~/.config/solana/id.json

# Or use Phantom/Solflare wallet export feature
```

### 2.2 Convert Private Key to Array Format
Your private key needs to be in array format like: `[1,2,3,4,5,...]`

**Example conversion:**
```javascript
// If you have base58 private key, convert it:
const bs58 = require('bs58');
const privateKeyBase58 = 'YOUR_BASE58_PRIVATE_KEY';
const privateKeyArray = Array.from(bs58.decode(privateKeyBase58));
console.log(JSON.stringify(privateKeyArray));
```

### 2.3 Fund Your Hot Wallet
Ensure your hot wallet has at least **0.1 SOL** for transaction fees and payouts.

## 🎯 Step 3: Launch the Application

### 3.1 Quick Start (Recommended)
```bash
# Start both backend and frontend simultaneously
npm run dev
```

This will start:
- **Backend server** on http://localhost:5000
- **Frontend client** on http://localhost:3000

### 3.2 Manual Start (Alternative)
```bash
# Terminal 1: Start backend
npm run server:dev

# Terminal 2: Start frontend
npm run client:dev
```

### 3.3 Verify Services Are Running
Check these URLs in your browser:
- **Frontend**: http://localhost:3000
- **Backend Health**: http://localhost:5000/health
- **API Status**: http://localhost:5000/api/game/state

## 🧪 Step 4: Testing the System

### 4.1 Basic Connectivity Test
1. Open http://localhost:3000
2. Check the connection status indicator (should show "Connected")
3. Verify the wheel loads and displays holder data

### 4.2 Test with Real Token Data
```bash
# Test API endpoints directly
curl http://localhost:5000/api/game/state
curl http://localhost:5000/api/holders/stats
curl http://localhost:5000/health
```

### 4.3 Admin Dashboard Test
1. Go to http://localhost:3000/admin
2. Enter your admin password (from .env file)
3. Check system status
4. Try forcing a spin (if you have eligible holders)

## 🔧 Step 5: Configuration for Testing

### 5.1 Use a Test Token (Recommended)
For initial testing, use a token with:
- **Active holders** (at least 10-20 addresses)
- **Reasonable supply** (not too large)
- **Some trading activity**

### 5.2 Adjust Settings for Testing
In your `.env` file, you can:
```env
# Faster spins for testing
SPIN_INTERVAL_MINUTES=1

# Lower minimum hold for more eligible holders
MINIMUM_HOLD_PERCENTAGE=0.01

# Test with smaller amounts
WINNER_PAYOUT_PERCENTAGE=50
CREATOR_PAYOUT_PERCENTAGE=50
```

### 5.3 Monitor Logs
Watch the console output for:
- Solana connection status
- Holder scanning results
- Game engine status
- Any error messages

## 🐛 Step 6: Troubleshooting

### 6.1 Common Issues

**"No eligible holders found"**
- Lower `MINIMUM_HOLD_PERCENTAGE` in .env
- Check if token has active holders
- Verify token mint address is correct

**"Solana connection failed"**
- Check RPC URLs are working
- Try different RPC endpoints
- Verify internet connection

**"Hot wallet balance insufficient"**
- Add more SOL to your hot wallet
- Check wallet address is correct

**"WebSocket connection failed"**
- Restart both frontend and backend
- Check firewall settings
- Verify ports 3000 and 5000 are available

### 6.2 Debug Mode
```bash
# Run with debug logging
LOG_LEVEL=debug npm run dev
```

### 6.3 Check Service Status
```bash
# Test individual components
curl http://localhost:5000/health
curl http://localhost:5000/api/game/state
curl http://localhost:5000/api/holders/stats
```

## 🎮 Step 7: Testing Game Mechanics

### 7.1 Force a Spin (Admin)
1. Go to admin dashboard
2. Click "Force Spin Now"
3. Watch the wheel animation
4. Check transaction feed for results

### 7.2 Monitor Real-time Updates
1. Open multiple browser tabs
2. Watch for synchronized updates
3. Check holder statistics refresh
4. Verify countdown timer accuracy

### 7.3 Test Payout System
**⚠️ WARNING: This uses real SOL!**
1. Ensure hot wallet has sufficient balance
2. Force a spin with eligible holders
3. Monitor transaction completion
4. Check Solscan for transaction confirmation

## 📊 Step 8: Production Deployment

### 8.1 Docker Deployment (Recommended)
```bash
# Build and start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 8.2 Manual Production Setup
```bash
# Build frontend
cd client
npm run build
cd ..

# Start production server
NODE_ENV=production npm start
```

### 8.3 Public Website Deployment

To make your Solana Wheel Game publicly accessible:

#### Option A: Deploy to Railway (Easiest)
1. **Create a Railway account** at https://railway.app
2. **Connect your GitHub repository**
3. **Deploy with Docker**:
   ```bash
   # Railway will automatically detect docker-compose.yml
   # Set environment variables in Railway dashboard:
   # - CLIENT_URL=https://your-app-name.up.railway.app
   # - REACT_APP_API_URL=https://your-app-name.up.railway.app/api
   # - REACT_APP_SERVER_URL=https://your-app-name.up.railway.app
   # - All other variables from your .env file
   ```

#### Option B: Deploy to Render
1. **Create a Render account** at https://render.com
2. **Create a new Web Service** from your GitHub repo
3. **Configure build settings**:
   - **Build Command**: `docker-compose up --build`
   - **Start Command**: `docker-compose up`
4. **Set environment variables** in Render dashboard

#### Option C: Deploy to AWS/GCP/Azure
1. **Use Docker Compose on a VPS**:
   ```bash
   # On your VPS
   git clone your-repo
   cd your-repo
   docker-compose up -d
   ```
2. **Configure domain and SSL**:
   - Point your domain to the VPS IP
   - Use Let's Encrypt for free SSL certificates

#### Environment Variables for Production
Update your `.env` file with production values:
```env
# Replace with your actual domain
CLIENT_URL=https://your-domain.com
REACT_APP_API_URL=https://your-domain.com/api
REACT_APP_SERVER_URL=https://your-domain.com

# Keep all other production settings
NODE_ENV=production
```

#### Important Notes for Public Deployment
- **Security**: Change all default passwords and secrets
- **SSL**: Always use HTTPS in production
- **Monitoring**: Set up monitoring for your hot wallet balance
- **Backup**: Regularly backup your database
- **Scaling**: Monitor resource usage and scale as needed

## 🔍 Step 9: Monitoring & Maintenance

### 9.1 Health Checks
- Monitor `/health` endpoint
- Check WebSocket connections
- Verify database connectivity
- Monitor hot wallet balance

### 9.2 Log Monitoring
```bash
# View application logs
tail -f logs/combined.log

# View error logs
tail -f logs/error.log
```

### 9.3 Performance Monitoring
- Watch RPC response times
- Monitor memory usage
- Check transaction success rates
- Track holder scan performance

## 🆘 Getting Help

### Check These First:
1. **Console logs** in browser developer tools
2. **Server logs** in terminal output
3. **Network tab** for failed API calls
4. **Environment variables** are set correctly

### Common Solutions:
- **Restart services**: `npm run dev`
- **Clear browser cache**: Hard refresh (Ctrl+F5)
- **Check wallet balance**: Ensure sufficient SOL
- **Verify token address**: Double-check mint address
- **Test RPC connection**: Try different endpoints

## ✅ Success Checklist

Before going live, ensure:
- [ ] Frontend loads without errors
- [ ] Backend health check passes
- [ ] WebSocket connection established
- [ ] Token holders are being tracked
- [ ] Admin dashboard accessible
- [ ] Hot wallet has sufficient balance
- [ ] All environment variables configured
- [ ] Game mechanics tested
- [ ] Real-time updates working
- [ ] Mobile responsiveness verified

---

**🎉 You're ready to launch your Solana Wheel Game!**

The application should now be running with real-time blockchain data, automated game mechanics, and a professional streaming interface.