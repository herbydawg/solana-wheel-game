-- Solana Wheel Game Database Schema
-- Run this script to initialize the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Games table
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id VARCHAR(255) UNIQUE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    pot_amount BIGINT NOT NULL,
    winner_address VARCHAR(44),
    winner_payout BIGINT DEFAULT 0,
    creator_payout BIGINT DEFAULT 0,
    transaction_signature VARCHAR(88),
    status VARCHAR(50) DEFAULT 'spinning',
    eligible_holders_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Holders table
CREATE TABLE IF NOT EXISTS holders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address VARCHAR(44) UNIQUE NOT NULL,
    balance BIGINT NOT NULL DEFAULT 0,
    token_account VARCHAR(44),
    percentage DECIMAL(10, 6) DEFAULT 0,
    is_eligible BOOLEAN DEFAULT false,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_type VARCHAR(50) NOT NULL, -- 'payout', 'deposit', etc.
    amount BIGINT NOT NULL,
    from_address VARCHAR(44),
    to_address VARCHAR(44),
    transaction_signature VARCHAR(88) UNIQUE,
    game_id UUID REFERENCES games(id),
    status VARCHAR(50) DEFAULT 'pending',
    block_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game statistics table
CREATE TABLE IF NOT EXISTS game_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    total_games INTEGER DEFAULT 0,
    total_payouts BIGINT DEFAULT 0,
    average_pot DECIMAL(20, 2) DEFAULT 0,
    current_pot BIGINT DEFAULT 0,
    total_holders INTEGER DEFAULT 0,
    eligible_holders INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_start_time ON games(start_time);
CREATE INDEX IF NOT EXISTS idx_games_winner ON games(winner_address);
CREATE INDEX IF NOT EXISTS idx_holders_address ON holders(address);
CREATE INDEX IF NOT EXISTS idx_holders_eligible ON holders(is_eligible);
CREATE INDEX IF NOT EXISTS idx_transactions_game_id ON transactions(game_id);
CREATE INDEX IF NOT EXISTS idx_transactions_signature ON transactions(transaction_signature);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- Insert initial game stats record
INSERT INTO game_stats (id, total_games, total_payouts, average_pot, current_pot, total_holders, eligible_holders)
VALUES (uuid_generate_v4(), 0, 0, 0, 0, 0, 0)
ON CONFLICT DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type) VALUES
('pot_growth_rate', '0.05', 'number'),
('pot_base_amount', '10000000', 'number'),
('pot_max_growth', '1000000000', 'number'),
('spin_interval_minutes', '5', 'number'),
('winner_payout_percentage', '50', 'number'),
('creator_payout_percentage', '50', 'number'),
('minimum_hold_percentage', '0.1', 'number')
ON CONFLICT (setting_key) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_holders_updated_at BEFORE UPDATE ON holders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();