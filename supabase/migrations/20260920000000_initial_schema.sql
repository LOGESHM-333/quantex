-- QUANTX Quantitative Financial Intelligence & Backtesting Platform Schema
-- Compatible with PostgreSQL & Supabase

-- 1. Users table (or auth.users integration)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Assets table
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    asset_type VARCHAR(32) NOT NULL, -- 'COMMODITY', 'CRYPTO', 'EQUITY'
    currency VARCHAR(8) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial multi-asset universe
INSERT INTO assets (symbol, name, asset_type, currency) VALUES
('GC=F', 'Gold Futures (COMEX)', 'COMMODITY', 'USD'),
('BTC-USD', 'Bitcoin (USD)', 'CRYPTO', 'USD'),
('NVDA', 'NVIDIA Corporation', 'EQUITY', 'USD')
ON CONFLICT (symbol) DO NOTHING;

-- 3. Normalized Market Data table
CREATE TABLE IF NOT EXISTS market_data (
    id BIGSERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    symbol VARCHAR(32) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    date DATE NOT NULL,
    open NUMERIC(16, 6) NOT NULL,
    high NUMERIC(16, 6) NOT NULL,
    low NUMERIC(16, 6) NOT NULL,
    close NUMERIC(16, 6) NOT NULL,
    adjusted_close NUMERIC(16, 6) NOT NULL,
    volume BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_asset_date UNIQUE (asset_id, date)
);

CREATE INDEX IF NOT EXISTS idx_market_data_sym_date ON market_data(symbol, date ASC);

-- 4. Strategies catalog
CREATE TABLE IF NOT EXISTS strategies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    default_parameters JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO strategies (code, name, description, default_parameters) VALUES
('SMA_CROSSOVER', 'SMA Trend Crossover', 'Dual Simple Moving Average crossover strategy (Fast SMA > Slow SMA = Long).', '{"fast_period": 20, "slow_period": 50}'),
('EMA_TREND', 'EMA Exponential Trend', 'Fast Exponential Moving Average crossing Slow EMA for smoothed momentum capture.', '{"fast_period": 12, "slow_period": 26}'),
('MOMENTUM', 'Cross-Sectional Momentum', 'Enters when N-day return momentum exceeds threshold; exits when momentum decays.', '{"lookback_period": 20, "threshold_pct": 0.02}'),
('MEAN_REVERSION', 'Bollinger / Z-Score Mean Reversion', 'Trades statistical deviations from rolling mean back toward equilibrium.', '{"lookback_period": 20, "z_entry": -1.5, "z_exit": 0.5}')
ON CONFLICT (code) DO NOTHING;

-- 5. Backtest records
CREATE TABLE IF NOT EXISTS backtests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    symbol VARCHAR(32) NOT NULL,
    strategy_code VARCHAR(64) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    initial_capital NUMERIC(16, 2) NOT NULL,
    transaction_cost_pct NUMERIC(6, 4) NOT NULL,
    position_size_pct NUMERIC(5, 2) NOT NULL,
    parameters JSONB NOT NULL,
    final_capital NUMERIC(16, 2) NOT NULL,
    net_profit NUMERIC(16, 2) NOT NULL,
    total_return NUMERIC(8, 4) NOT NULL,
    annualized_return NUMERIC(8, 4) NOT NULL,
    annualized_volatility NUMERIC(8, 4) NOT NULL,
    sharpe_ratio NUMERIC(8, 4) NOT NULL,
    max_drawdown NUMERIC(8, 4) NOT NULL,
    number_of_trades INTEGER NOT NULL,
    winning_trades INTEGER NOT NULL,
    losing_trades INTEGER NOT NULL,
    win_rate NUMERIC(6, 4) NOT NULL,
    benchmark_total_return NUMERIC(8, 4) NOT NULL,
    benchmark_sharpe NUMERIC(8, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Backtest Individual Trade executions
CREATE TABLE IF NOT EXISTS backtest_trades (
    id BIGSERIAL PRIMARY KEY,
    backtest_id UUID REFERENCES backtests(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    symbol VARCHAR(32) NOT NULL,
    side VARCHAR(8) NOT NULL, -- 'BUY', 'SELL'
    price NUMERIC(16, 6) NOT NULL,
    quantity NUMERIC(16, 6) NOT NULL,
    gross_value NUMERIC(16, 2) NOT NULL,
    transaction_cost NUMERIC(16, 2) NOT NULL,
    net_pnl NUMERIC(16, 2),
    return_pct NUMERIC(8, 4),
    reason VARCHAR(128)
);

-- 7. Backtest Equity series
CREATE TABLE IF NOT EXISTS backtest_equity (
    id BIGSERIAL PRIMARY KEY,
    backtest_id UUID REFERENCES backtests(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    portfolio_value NUMERIC(16, 2) NOT NULL,
    cash NUMERIC(16, 2) NOT NULL,
    position_value NUMERIC(16, 2) NOT NULL,
    benchmark_value NUMERIC(16, 2) NOT NULL,
    drawdown_pct NUMERIC(8, 4) NOT NULL
);

-- 8. Quantitative Research Runs
CREATE TABLE IF NOT EXISTS research_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    symbol VARCHAR(32) NOT NULL,
    strategy_code VARCHAR(64) NOT NULL,
    config JSONB NOT NULL,
    results_summary JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Portfolio Configurations
CREATE TABLE IF NOT EXISTS portfolio_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    weights JSONB NOT NULL, -- e.g. {"GC=F": 0.333, "BTC-USD": 0.333, "NVDA": 0.334}
    rebalance_frequency VARCHAR(32) DEFAULT 'MONTHLY',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
