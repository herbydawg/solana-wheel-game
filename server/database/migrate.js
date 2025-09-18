const fs = require('fs');
const path = require('path');
const db = require('./connection');
const logger = require('../utils/logger');

class DatabaseMigrator {
  constructor() {
    this.schemaPath = path.join(__dirname, 'schema.sql');
  }

  async migrate() {
    try {
      logger.info('Starting database migration...');

      // Check if database is connected
      if (!db.isConnected) {
        const connected = await db.connect();
        if (!connected) {
          logger.error('Cannot migrate: Database not connected');
          return false;
        }
      }

      // Read schema file
      if (!fs.existsSync(this.schemaPath)) {
        logger.error('Schema file not found:', this.schemaPath);
        return false;
      }

      const schema = fs.readFileSync(this.schemaPath, 'utf8');

      // Split schema into individual statements
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      // Execute each statement
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await db.query(statement);
          } catch (error) {
            // Ignore "already exists" errors
            if (!error.message.includes('already exists') &&
                !error.message.includes('duplicate key') &&
                !error.message.includes('does not exist')) {
              logger.warn('Migration statement failed:', statement.substring(0, 100) + '...');
              logger.warn('Error:', error.message);
            }
          }
        }
      }

      logger.info('Database migration completed successfully');
      return true;
    } catch (error) {
      logger.error('Database migration failed:', error);
      return false;
    }
  }

  async seed() {
    try {
      logger.info('Starting database seeding...');

      // Insert some sample data for testing
      const sampleHolders = [
        {
          address: '8QBHwiq5NyLNgyuaEtY9cPXrPEPfp3yiVatNE1MCYc5k',
          balance: 131741146440746,
          percentage: 13.174201960604027,
          isEligible: true
        },
        {
          address: 'FAivbXYc6vANBQd44fh6QiQ67pVeE9of4DXKfWqsAoqp',
          balance: 40716296135650,
          percentage: 4.071656599861733,
          isEligible: true
        },
        {
          address: 'DmEUdun1KLhFgnGtACEvXCNmVADVuvUezPRZ7f5Ut4yw',
          balance: 39284136964994,
          percentage: 3.9284397335773664,
          isEligible: true
        }
      ];

      for (const holder of sampleHolders) {
        try {
          await db.query(`
            INSERT INTO holders (address, balance, percentage, is_eligible)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (address) DO NOTHING
          `, [holder.address, holder.balance, holder.percentage, holder.isEligible]);
        } catch (error) {
          logger.warn('Failed to seed holder:', holder.address);
        }
      }

      logger.info('Database seeding completed');
      return true;
    } catch (error) {
      logger.error('Database seeding failed:', error);
      return false;
    }
  }

  async reset() {
    try {
      logger.info('Resetting database...');

      // Drop all tables
      const tables = ['transactions', 'games', 'holders', 'system_settings', 'game_stats'];
      for (const table of tables) {
        try {
          await db.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        } catch (error) {
          logger.warn(`Failed to drop table ${table}:`, error.message);
        }
      }

      // Run migration again
      return await this.migrate();
    } catch (error) {
      logger.error('Database reset failed:', error);
      return false;
    }
  }

  async status() {
    try {
      const dbStatus = db.getStatus();

      if (!dbStatus.connected) {
        return { status: 'disconnected', message: 'Database not connected' };
      }

      // Check if tables exist
      const tables = ['games', 'holders', 'transactions', 'system_settings', 'game_stats'];
      const existingTables = [];

      for (const table of tables) {
        try {
          const result = await db.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_name = $1
            )
          `, [table]);
          if (result.rows[0].exists) {
            existingTables.push(table);
          }
        } catch (error) {
          // Table doesn't exist or query failed
        }
      }

      return {
        status: 'connected',
        tables: existingTables,
        pool: dbStatus.pool
      };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

// CLI interface for running migrations
if (require.main === module) {
  const command = process.argv[2] || 'migrate';

  const migrator = new DatabaseMigrator();

  switch (command) {
    case 'migrate':
      migrator.migrate().then(success => {
        process.exit(success ? 0 : 1);
      });
      break;

    case 'seed':
      migrator.seed().then(success => {
        process.exit(success ? 0 : 1);
      });
      break;

    case 'reset':
      migrator.reset().then(success => {
        process.exit(success ? 0 : 1);
      });
      break;

    case 'status':
      migrator.status().then(status => {
        console.log(JSON.stringify(status, null, 2));
        process.exit(0);
      });
      break;

    default:
      console.log('Usage: node migrate.js [migrate|seed|reset|status]');
      process.exit(1);
  }
}

module.exports = DatabaseMigrator;