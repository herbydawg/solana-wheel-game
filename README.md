# Solana Wheel Game - Complete Web Application

A fully automated Solana-based meme coin wheel game with real-time holder tracking, automated payouts, and a sleek modern web interface.

## 🎯 Features

- **Real-time Blockchain Integration**: Live Solana RPC monitoring with automatic failover
- **Automated Token Holder Tracking**: Scans and tracks eligible holders every 30 seconds
- **Fair Randomization**: Uses Solana blockhash for verifiable randomness
- **Automated Payouts**: Processes winner and creator payouts automatically
- **Modern Web Interface**: Glassmorphism design with smooth animations
- **Real-time Updates**: WebSocket connections for live game state
- **Stream-Ready UI**: Professional overlay-friendly design
- **Admin Dashboard**: Complete system monitoring and control
- **Mobile Responsive**: Works perfectly on all devices

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Solana Service**: Blockchain connection with RPC failover
- **Holder Tracker**: Real-time token holder monitoring
- **Game Engine**: Automated 5-minute wheel spins
- **Payout Service**: Secure transaction processing
- **WebSocket Server**: Real-time client updates

### Frontend (React + Tailwind CSS)
- **Custom Wheel Component**: Smooth SVG-based animations
- **Real-time Dashboard**: Live game state and statistics
- **Glassmorphism UI**: Modern design with particle effects
- **Admin Panel**: System control and monitoring
- **Responsive Design**: Mobile-first approach

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Solana wallet with SOL for payouts
- Pump.Fun token mint address

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd solana-wheel-game
npm run install:all
```

2. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
TOKEN_MINT_ADDRESS=YOUR_PUMP_FUN_TOKEN_MINT_ADDRESS
HOT_WALLET_PRIVATE_KEY=YOUR_HOT_WALLET_PRIVATE_KEY_ARRAY
FEE_COLLECTION_WALLET=YOUR_FEE_COLLECTION_WALLET_ADDRESS
CREATOR_WALLET=YOUR_CREATOR_WALLET_ADDRESS

# Game Settings
SPIN_INTERVAL_MINUTES=5
MINIMUM_HOLD_PERCENTAGE=0.1
WINNER_PAYOUT_PERCENTAGE=50
CREATOR_PAYOUT_PERCENTAGE=50

# Security
ADMIN_PASSWORD=your-secure-admin-password
```

3. **Start development servers**
```bash
npm run dev
```

This starts:
- Backend server on http://localhost:5000
- Frontend client on http://localhost:3000

## 🎮 Game Configuration

### Token Requirements
- **Minimum Hold**: 0.1% of total supply (configurable)
- **Eligibility**: Real-time balance verification
- **Exclusions**: Burn addresses and dead wallets

### Payout Structure
- **Winner**: 50% of collected fees (configurable)
- **Creator**: 50% of collected fees (configurable)
- **Frequency**: Every 5 minutes (configurable)

### Security Features
- **Hot Wallet**: Encrypted private key storage
- **Transaction Retry**: Automatic retry with exponential backoff
- **RPC Failover**: Multiple Solana RPC endpoints
- **Admin Authentication**: Password-protected admin panel

## 🎨 UI Components

### Main Dashboard
- **Animated Wheel**: SVG-based with smooth spinning
- **Countdown Timer**: Circular progress with real-time updates
- **Pot Display**: Live balance with growth animations
- **Holder Stats**: Real-time eligible holder tracking
- **Transaction Feed**: Live payout and game history

### Admin Dashboard
- **System Status**: Service health monitoring
- **Game Controls**: Force spin, pause/resume
- **Configuration**: Runtime setting updates
- **Emergency Stop**: Immediate system halt

## 🔧 API Endpoints

### Game API
- `GET /api/game/state` - Current game state
- `GET /api/game/history` - Game history
- `GET /api/game/wheel-data` - Wheel visualization data
- `POST /api/game/force-spin` - Admin force spin

### Holder API
- `GET /api/holders/stats` - Holder statistics
- `GET /api/holders/eligible` - Eligible holders list
- `GET /api/holders/distribution` - Wheel distribution data

### Transaction API
- `GET /api/transactions/payouts` - Payout history
- `GET /api/transactions/payouts/pending` - Pending payouts
- `POST /api/transactions/payouts/:id/retry` - Retry failed payout

### Admin API
- `GET /api/admin/status` - System status
- `POST /api/admin/force-spin` - Force immediate spin
- `POST /api/admin/game/pause` - Pause game
- `POST /api/admin/game/resume` - Resume game

## 🌐 WebSocket Events

### Client Events
- `gameState` - Game state updates
- `holderUpdate` - Holder statistics
- `countdown` - Spin countdown
- `spinStart` - Wheel spin initiated
- `winnerSelected` - Winner announcement
- `payoutCompleted` - Payout confirmation
- `potUpdate` - Pot balance changes

## 📱 Deployment

### Production Build
```bash
npm run build
cd client && npm run build
```

### Environment Variables
Set these in your production environment:
- `NODE_ENV=production`
- `PORT=5000`
- `CLIENT_URL=https://your-domain.com`
- All Solana and game configuration variables

### Recommended Hosting
- **Frontend**: Vercel, Netlify, or AWS CloudFront
- **Backend**: Railway, Render, Heroku, or AWS EC2
- **Database**: Redis Cloud + PlanetScale/Supabase

### SSL Configuration
Ensure HTTPS is enabled for:
- WebSocket connections
- Solana RPC calls
- Admin panel access

## 🔍 Monitoring

### Health Checks
- `GET /health` - Server health status
- WebSocket connection status
- Solana RPC connectivity
- Hot wallet balance validation

### Logging
- Winston logger with file rotation
- Error tracking and alerts
- Transaction audit trail
- Performance metrics

## 🛠️ Development

### Project Structure
```
solana-wheel-game/
├── server/                 # Backend Node.js application
│   ├── services/          # Core game services
│   ├── routes/            # API route handlers
│   └── utils/             # Utility functions
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   └── styles/        # CSS and styling
│   └── public/            # Static assets
└── docs/                  # Documentation
```

### Available Scripts
- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run test` - Run test suite
- `npm run lint` - Code linting
- `npm start` - Start production server

## 🎯 Stream Integration

### OBS Setup
1. Add Browser Source
2. URL: `http://localhost:3000`
3. Width: 1920, Height: 1080
4. Custom CSS for overlay mode available

### Stream Features
- **Large Text**: Readable at all resolutions
- **High Contrast**: Clear visibility on stream
- **Celebration Effects**: Winner announcements
- **Real-time Updates**: Live pot and holder counts

## 🔐 Security Considerations

### Hot Wallet Security
- Store private keys as environment variables
- Use dedicated wallet for payouts only
- Monitor wallet balance regularly
- Implement spending limits

### Admin Access
- Strong password requirements
- IP whitelist for admin panel
- Session timeout
- Audit logging

### Rate Limiting
- API endpoint protection
- WebSocket connection limits
- Transaction frequency limits

## 📊 Analytics

### Game Metrics
- Total games played
- Average pot size
- Winner distribution
- Holder growth trends

### Performance Metrics
- RPC response times
- Transaction success rates
- WebSocket connection stability
- Error rates and types

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create GitHub issue
- Check documentation
- Review error logs
- Test with development environment

---

**Built with ❤️ for the Solana ecosystem**