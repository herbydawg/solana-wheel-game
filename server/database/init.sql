-- Solana Wheel Game Database Schema
-- PostgreSQL initialization script

-- Create database if not exists (handled by Docker)
-- CREATE DATABASE IF NOT EXISTS solana_wheel_game;

-- Use the database
-- \c solana_wheel_game;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Games table - stores game history
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id VARCHAR(255) UNIQUE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    pot_amount BIGINT NOT NULL DEFAULT 0,
    eligible_holders INTEGER NOT NULL DEFAULT 0,
    winner_address VARCHAR(44),
    winner_payout BIGINT DEFAULT 0,
    creator_payout BIGINT DEFAULT 0,
    transaction_signature VARCHAR(88),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payouts table - stores payout history
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payout_id VARCHAR(255) UNIQUE NOT NULL,
    game_id UUID REFERENCES games(id),
    winner_address VARCHAR(44) NOT NULL,
    winner_amount BIGINT NOT NULL,
    creator_amount BIGINT NOT NULL,
    total_amount BIGINT NOT NULL,
    transaction_signature VARCHAR(88),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE
);

-- Holders table - stores holder snapshots
CREATE TABLE IF NOT EXISTS holders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address VARCHAR(44) NOT NULL,
    balance BIGINT NOT NULL,
    percentage DECIMAL(10, 6) NOT NULL,
    is_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    token_account VARCHAR(44),
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System logs table - stores application logs
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    meta JSONB,
    service VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Configuration table - stores system configuration
CREATE TABLE IF NOT EXISTS configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Metrics table - stores performance metrics
CREATE TABLE IF NOT EXISTS metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15, 6) NOT NULL,
    metric_unit VARCHAR(20),
    tags JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_game_id ON games(game_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_start_time ON games(start_time);
CREATE INDEX IF NOT EXISTS idx_games_winner_address ON games(winner_address);

CREATE INDEX IF NOT EXISTS idx_payouts_payout_id ON payouts(payout_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_winner_address ON payouts(winner_address);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at);

CREATE INDEX IF NOT EXISTS idx_holders_address ON holders(address);
CREATE INDEX IF NOT EXISTS idx_holders_is_eligible ON holders(is_eligible);
CREATE INDEX IF NOT EXISTS idx_holders_snapshot_time ON holders(snapshot_time);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_service ON system_logs(service);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_configuration_key ON configuration(key);

CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuration_updated_at BEFORE UPDATE ON configuration
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default configuration values
INSERT INTO configuration (key, value, description) VALUES
    ('spin_interval_minutes', '5', 'Minutes between automatic spins'),
    ('minimum_hold_percentage', '0.1', 'Minimum percentage of supply required to be eligible'),
    ('winner_payout_percentage', '50', 'Percentage of pot that goes to winner'),
    ('creator_payout_percentage', '50', 'Percentage of pot that goes to creator'),
    ('max_holders_display', '100', 'Maximum number of holders to display in UI'),
    ('rpc_timeout_ms', '30000', 'RPC request timeout in milliseconds'),
    ('max_retry_attempts', '3', 'Maximum retry attempts for failed operations')
ON CONFLICT (key) DO NOTHING;

-- Create views for common queries
CREATE OR REPLACE VIEW recent_games AS
SELECT 
    g.*,
    p.transaction_signature as payout_signature,
    p.status as payout_status
FROM games g
LEFT JOIN payouts p ON g.id = p.game_id
ORDER BY g.start_time DESC
LIMIT 50;

CREATE OR REPLACE VIEW game_statistics AS
SELECT 
    COUNT(*) as total_games,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_games,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_games,
    AVG(pot_amount) as average_pot,
    SUM(winner_payout) as total_winner_payouts,
    SUM(creator_payout) as total_creator_payouts,
    AVG(eligible_holders) as average_eligible_holders
FROM games
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

CREATE OR REPLACE VIEW holder_statistics AS
SELECT 
    COUNT(DISTINCT address) as unique_holders,
    COUNT(CASE WHEN is_eligible THEN 1 END) as eligible_holders,
    AVG(balance) as average_balance,
    MAX(balance) as max_balance,
    MIN(balance) as min_balance
FROM holders
WHERE snapshot_time >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
ORDER BY snapshot_time DESC
LIMIT 1;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO solana_wheel;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO solana_wheel;

-- Create a function to clean old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete old holder snapshots (keep last 24 hours)
    DELETE FROM holders 
    WHERE snapshot_time < CURRENT_TIMESTAMP - INTERVAL '24 hours';
    
    -- Delete old system logs (keep last 7 days)
    DELETE FROM system_logs 
    WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '7 days';
    
    -- Delete old metrics (keep last 30 days)
    DELETE FROM metrics 
    WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    -- Vacuum tables to reclaim space
    VACUUM ANALYZE holders;
    VACUUM ANALYZE system_logs;
    VACUUM ANALYZE metrics;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_data();');

COMMIT;