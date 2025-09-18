# Database Setup Guide

This guide will help you set up persistent storage for your Solana Wheel Game application.

## 🚀 Quick Start

### Option 1: PostgreSQL (Recommended for Production)

```bash
# 1. Run the setup script
node setup-database.js
# Choose option 1 for PostgreSQL

# 2. Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# 3. Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 4. Create database and user
sudo -u postgres psql
```

```sql
CREATE DATABASE solana_wheel_game;
CREATE USER wheel_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE solana_wheel_game TO wheel_user;
\q
```

```bash
# 5. Update .env file
echo "POSTGRES_URL=postgresql://wheel_user:your_secure_password@localhost:5432/solana_wheel_game" >> .env

# 6. Run migrations
npm run db:migrate

# 7. (Optional) Seed with sample data
npm run db:seed
```

### Option 2: SQLite (Simple Setup)

```bash
# 1. Run the setup script
node setup-database.js
# Choose option 2 for SQLite

# 2. Install SQLite dependency
npm install sqlite3

# 3. Run migrations
npm run db:migrate

# 4. (Optional) Seed with sample data
npm run db:seed
```

## 📊 Database Schema

The application uses the following main tables:

### Games Table
- Stores all game instances and their results
- Tracks pot amounts, winners, and payout information
- Maintains game history for analytics

### Holders Table
- Stores current token holder information
- Tracks balances, eligibility status, and percentages
- Updated in real-time from blockchain data

### Transactions Table
- Records all payout transactions
- Links transactions to specific games
- Tracks transaction status and signatures

### System Settings Table
- Stores configurable application settings
- Includes pot growth rates, intervals, and limits
- Allows runtime configuration changes

## 🛠️ Available Commands

```bash
# Database management
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed with sample data
npm run db:reset      # Reset and re-run migrations
npm run db:status     # Check database connection status
npm run db:setup      # Complete setup (migrate + seed)
```

## 🔧 Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# PostgreSQL
POSTGRES_URL=postgresql://user:password@localhost:5432/solana_wheel_game

# SQLite
DATABASE_URL=sqlite:./database.sqlite

# Redis (Optional - for caching)
REDIS_URL=redis://localhost:6379
```

### Database Settings

The following settings can be configured in the database:

```javascript
// Pot growth settings
POT_GROWTH_RATE: 0.05,        // 5% growth per cycle
POT_BASE_AMOUNT: 10000000,    // 0.01 SOL minimum
POT_MAX_GROWTH: 1000000000,   // 1 SOL max growth per cycle

// Game settings
SPIN_INTERVAL_MINUTES: 5,      // 5-minute cycles
WINNER_PAYOUT_PERCENTAGE: 50,  // 50% to winner
CREATOR_PAYOUT_PERCENTAGE: 50, // 50% to creator
MINIMUM_HOLD_PERCENTAGE: 0.1   // 0.1% minimum hold
```

## 🌐 Production Deployment

### Railway (PostgreSQL)
```bash
# 1. Create Railway project
# 2. Add PostgreSQL database
# 3. Get DATABASE_URL from Railway dashboard
# 4. Set in environment variables
# 5. Deploy with: npm run db:migrate
```

### Heroku (PostgreSQL)
```bash
# 1. Create Heroku app
# 2. Add Heroku Postgres add-on
# 3. Database URL is automatically set as DATABASE_URL
# 4. Deploy with: npm run db:migrate
```

### Docker Setup
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: solana_wheel_game
      POSTGRES_USER: wheel_user
      POSTGRES_PASSWORD: your_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## 📈 Data Persistence Features

### Automatic Backups
- Game history preserved across restarts
- Holder data maintained in real-time
- Transaction records never lost
- System settings persisted

### Performance Optimizations
- Indexed queries for fast lookups
- Connection pooling for scalability
- Smart caching with Redis (optional)
- Optimized for high-frequency updates

### Data Integrity
- Foreign key constraints
- Transaction rollbacks on errors
- Data validation at application level
- Automatic cleanup of old data

## 🔍 Monitoring & Maintenance

### Health Checks
```bash
# Check database connection
npm run db:status

# View recent games
curl http://localhost:5000/api/game/history

# Check holder stats
curl http://localhost:5000/api/holders/stats
```

### Cleanup Tasks
```javascript
// Remove old holder data (older than 30 days)
const deleted = await HolderModel.deleteOldHolders(30);
logger.info(`Cleaned up ${deleted} old holder records`);
```

### Backup Strategy
```bash
# PostgreSQL backup
pg_dump solana_wheel_game > backup.sql

# SQLite backup
cp database.sqlite database.backup.sqlite
```

## 🐛 Troubleshooting

### Common Issues

**Connection Refused**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check connection string
psql "postgresql://wheel_user:password@localhost:5432/solana_wheel_game"
```

**Migration Errors**
```bash
# Reset and retry
npm run db:reset
npm run db:migrate
```

**Permission Errors**
```bash
# Grant proper permissions
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE solana_wheel_game TO wheel_user;
```

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [SQLite Documentation](https://sqlite.org/docs.html)
- [Prisma ORM](https://prisma.io) (alternative to raw SQL)
- [Database Connection Pooling](https://github.com/brianc/node-postgres#pooling)

## 🤝 Support

For database-related issues:
1. Check the logs: `tail -f logs/error.log`
2. Verify connection: `npm run db:status`
3. Test queries manually in psql/SQLite
4. Check environment variables in `.env`

---

**Note**: The application gracefully falls back to in-memory storage if no database is configured, ensuring it works in any environment while providing the option for full persistence when needed.