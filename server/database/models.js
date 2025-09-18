const db = require('./connection');
const logger = require('../utils/logger');

class GameModel {
  static async create(gameData) {
    try {
      const query = `
        INSERT INTO games (
          game_id, pot_amount, winner_address, winner_payout,
          creator_payout, eligible_holders_count, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        gameData.gameId,
        gameData.potAmount,
        gameData.winnerAddress,
        gameData.winnerPayout || 0,
        gameData.creatorPayout || 0,
        gameData.eligibleHoldersCount || 0,
        gameData.status || 'spinning'
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create game:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) return null;

      const query = `
        UPDATE games
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING *
      `;

      values.push(id);
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update game:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await db.query('SELECT * FROM games WHERE id = $1', [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to find game:', error);
      throw error;
    }
  }

  static async findByGameId(gameId) {
    try {
      const result = await db.query('SELECT * FROM games WHERE game_id = $1', [gameId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to find game by game_id:', error);
      throw error;
    }
  }

  static async getRecent(limit = 10) {
    try {
      const result = await db.query(
        'SELECT * FROM games ORDER BY start_time DESC LIMIT $1',
        [limit]
      );
      return result.rows;
    } catch (error) {
      logger.error('Failed to get recent games:', error);
      throw error;
    }
  }

  static async getStats() {
    try {
      const result = await db.query(`
        SELECT
          COUNT(*) as total_games,
          COALESCE(SUM(winner_payout), 0) as total_payouts,
          COALESCE(AVG(pot_amount), 0) as average_pot
        FROM games
        WHERE status = 'completed'
      `);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get game stats:', error);
      throw error;
    }
  }
}

class HolderModel {
  static async upsert(holderData) {
    try {
      const query = `
        INSERT INTO holders (
          address, balance, token_account, percentage, is_eligible, last_updated
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (address)
        DO UPDATE SET
          balance = EXCLUDED.balance,
          token_account = EXCLUDED.token_account,
          percentage = EXCLUDED.percentage,
          is_eligible = EXCLUDED.is_eligible,
          last_updated = NOW()
        RETURNING *
      `;

      const values = [
        holderData.address,
        holderData.balance,
        holderData.tokenAccount,
        holderData.percentage,
        holderData.isEligible
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to upsert holder:', error);
      throw error;
    }
  }

  static async findByAddress(address) {
    try {
      const result = await db.query('SELECT * FROM holders WHERE address = $1', [address]);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to find holder:', error);
      throw error;
    }
  }

  static async getTopHolders(limit = 10) {
    try {
      const result = await db.query(
        'SELECT * FROM holders ORDER BY balance DESC LIMIT $1',
        [limit]
      );
      return result.rows;
    } catch (error) {
      logger.error('Failed to get top holders:', error);
      throw error;
    }
  }

  static async getEligibleHolders() {
    try {
      const result = await db.query(
        'SELECT * FROM holders WHERE is_eligible = true ORDER BY balance DESC'
      );
      return result.rows;
    } catch (error) {
      logger.error('Failed to get eligible holders:', error);
      throw error;
    }
  }

  static async getStats() {
    try {
      const result = await db.query(`
        SELECT
          COUNT(*) as total_holders,
          COUNT(CASE WHEN is_eligible THEN 1 END) as eligible_holders,
          COALESCE(SUM(balance), 0) as total_balance
        FROM holders
      `);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get holder stats:', error);
      throw error;
    }
  }

  static async deleteOldHolders(daysOld = 30) {
    try {
      const result = await db.query(
        'DELETE FROM holders WHERE last_updated < NOW() - INTERVAL \'1 day\' * $1',
        [daysOld]
      );
      return result.rowCount;
    } catch (error) {
      logger.error('Failed to delete old holders:', error);
      throw error;
    }
  }
}

class TransactionModel {
  static async create(transactionData) {
    try {
      const query = `
        INSERT INTO transactions (
          transaction_type, amount, from_address, to_address,
          transaction_signature, game_id, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        transactionData.type,
        transactionData.amount,
        transactionData.fromAddress,
        transactionData.toAddress,
        transactionData.signature,
        transactionData.gameId,
        transactionData.status || 'pending'
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create transaction:', error);
      throw error;
    }
  }

  static async updateStatus(signature, status) {
    try {
      const result = await db.query(
        'UPDATE transactions SET status = $1 WHERE transaction_signature = $2 RETURNING *',
        [status, signature]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update transaction status:', error);
      throw error;
    }
  }

  static async getByGameId(gameId) {
    try {
      const result = await db.query(
        'SELECT * FROM transactions WHERE game_id = $1 ORDER BY created_at DESC',
        [gameId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Failed to get transactions by game ID:', error);
      throw error;
    }
  }

  static async getRecent(limit = 20) {
    try {
      const result = await db.query(
        'SELECT * FROM transactions ORDER BY created_at DESC LIMIT $1',
        [limit]
      );
      return result.rows;
    } catch (error) {
      logger.error('Failed to get recent transactions:', error);
      throw error;
    }
  }
}

class SystemSettingsModel {
  static async get(key) {
    try {
      const result = await db.query(
        'SELECT * FROM system_settings WHERE setting_key = $1',
        [key]
      );
      const setting = result.rows[0];
      if (!setting) return null;

      // Parse value based on type
      switch (setting.setting_type) {
        case 'number':
          return parseFloat(setting.setting_value);
        case 'boolean':
          return setting.setting_value === 'true';
        case 'json':
          return JSON.parse(setting.setting_value);
        default:
          return setting.setting_value;
      }
    } catch (error) {
      logger.error('Failed to get system setting:', error);
      throw error;
    }
  }

  static async set(key, value, type = 'string') {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      const query = `
        INSERT INTO system_settings (setting_key, setting_value, setting_type)
        VALUES ($1, $2, $3)
        ON CONFLICT (setting_key)
        DO UPDATE SET
          setting_value = EXCLUDED.setting_value,
          setting_type = EXCLUDED.setting_type,
          updated_at = NOW()
        RETURNING *
      `;

      const result = await db.query(query, [key, stringValue, type]);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to set system setting:', error);
      throw error;
    }
  }

  static async getAll() {
    try {
      const result = await db.query('SELECT * FROM system_settings ORDER BY setting_key');
      const settings = {};

      result.rows.forEach(row => {
        let value = row.setting_value;
        switch (row.setting_type) {
          case 'number':
            value = parseFloat(value);
            break;
          case 'boolean':
            value = value === 'true';
            break;
          case 'json':
            value = JSON.parse(value);
            break;
        }
        settings[row.setting_key] = value;
      });

      return settings;
    } catch (error) {
      logger.error('Failed to get all system settings:', error);
      throw error;
    }
  }
}

class GameStatsModel {
  static async get() {
    try {
      const result = await db.query('SELECT * FROM game_stats ORDER BY last_updated DESC LIMIT 1');
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get game stats:', error);
      throw error;
    }
  }

  static async update(stats) {
    try {
      const query = `
        UPDATE game_stats SET
          total_games = $1,
          total_payouts = $2,
          average_pot = $3,
          current_pot = $4,
          total_holders = $5,
          eligible_holders = $6,
          last_updated = NOW()
        RETURNING *
      `;

      const values = [
        stats.totalGames || 0,
        stats.totalPayouts || 0,
        stats.averagePot || 0,
        stats.currentPot || 0,
        stats.totalHolders || 0,
        stats.eligibleHolders || 0
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update game stats:', error);
      throw error;
    }
  }
}

module.exports = {
  GameModel,
  HolderModel,
  TransactionModel,
  SystemSettingsModel,
  GameStatsModel
};