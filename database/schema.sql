-- database/schema.sql
-- PostgreSQL schema for VelozTrade trading platform

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== USERS & AUTH ====================

-- Users table (main account data)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    kyc_status TEXT DEFAULT 'pending',      -- pending, verified, rejected
    balance DECIMAL(20,8) DEFAULT 0 NOT NULL,
    free_margin DECIMAL(20,8) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    is_blocked BOOLEAN DEFAULT FALSE,
    twofa_secret TEXT,                      -- TOTP secret for 2FA
    twofa_enabled BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE
);

-- ==================== TRADING INSTRUMENTS ====================

-- Instruments (tradable assets)
CREATE TABLE instruments (
    id SERIAL PRIMARY KEY,
    symbol TEXT UNIQUE NOT NULL,
    type TEXT CHECK (type IN ('forex','stock','commodity','crypto')),
    spread DECIMAL(10,6) NOT NULL,          -- spread in pips/points
    min_quantity DECIMAL(20,8) NOT NULL,
    lot_size DECIMAL(20,8) DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE
);

-- ==================== ORDERS (pending limit/stop) ====================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    instrument_id INT REFERENCES instruments(id),
    type TEXT CHECK (type IN ('market','limit','stop')),
    side TEXT CHECK (side IN ('buy','sell')),
    quantity DECIMAL(20,8) NOT NULL,
    price_limit DECIMAL(20,8),               -- execution price for limit/stop orders
    status TEXT DEFAULT 'open',              -- open, filled, cancelled, rejected
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== POSITIONS (open trades) ====================

CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    instrument_id INT REFERENCES instruments(id),
    side TEXT CHECK (side IN ('buy','sell')),
    open_price DECIMAL(20,8) NOT NULL,
    quantity DECIMAL(20,8) NOT NULL,
    open_time TIMESTAMP DEFAULT NOW(),
    close_time TIMESTAMP,
    close_price DECIMAL(20,8),
    realised_pnl DECIMAL(20,8),
    status TEXT DEFAULT 'open'               -- open, closed, liquidated
);

-- ==================== TRANSACTIONS & REQUESTS ====================

-- Withdrawal requests (admin approval required)
CREATE TABLE withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(20,8) NOT NULL,
    method TEXT,                             -- crypto, bank, card
    address TEXT,                            -- crypto address or bank details
    status TEXT DEFAULT 'pending',           -- pending, approved, rejected, completed
    created_at TIMESTAMP DEFAULT NOW()
);

-- Deposits (webhook from payment gateway)
CREATE TABLE deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(20,8) NOT NULL,
    gateway_txn_id TEXT UNIQUE,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT NOW()
);

-- KYC documents (integration with Sumsub or similar)
CREATE TABLE kyc_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider_id TEXT,                        -- Sumsub applicant ID
    status TEXT,                             -- pending, verified, rejected
    submitted_at TIMESTAMP DEFAULT NOW()
);

-- ==================== DEFAULT INSTRUMENTS ====================

INSERT INTO instruments (symbol, type, spread, min_quantity, lot_size) VALUES
('EURUSD', 'forex', 0.00012, 0.01, 100000),
('GBPUSD', 'forex', 0.00015, 0.01, 100000),
('USDJPY', 'forex', 0.020, 0.01, 100000),
('AAPL', 'stock', 0.05, 1, 1),
('MSFT', 'stock', 0.05, 1, 1),
('GOOGL', 'stock', 0.06, 1, 1),
('BTCUSD', 'crypto', 10.0, 0.001, 1),
('ETHUSD', 'crypto', 8.0, 0.01, 1),
('XAUUSD', 'commodity', 0.30, 0.01, 100),   -- Gold
('XAGUSD', 'commodity', 0.05, 0.1, 5000);    -- Silver

-- ==================== INDEXES FOR PERFORMANCE ====================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_positions_user_id ON positions(user_id);
CREATE INDEX idx_positions_status ON positions(status);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX idx_deposits_user_id ON deposits(user_id);