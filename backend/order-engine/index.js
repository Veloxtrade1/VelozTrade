// backend/order-engine/index.js
// Order Engine – Processes market orders, closes positions, negative balance protection

require('dotenv').config();
const Redis = require('ioredis');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const redis = new Redis(process.env.REDIS_URL);
const db = new Pool({ connectionString: process.env.DATABASE_URL });

// Helper: get instrument by symbol
async function getInstrument(symbol) {
  const res = await db.query('SELECT * FROM instruments WHERE symbol = $1', [symbol]);
  return res.rows[0];
}

// Helper: get instrument by ID
async function getInstrumentById(id) {
  const res = await db.query('SELECT * FROM instruments WHERE id = $1', [id]);
  return res.rows[0];
}

// Helper: get current price from Redis cache
async function getCurrentPrice(symbol) {
  const priceData = await redis.get(`last_price_${symbol}`);
  if (!priceData) throw new Error(`No price feed for ${symbol}`);
  return JSON.parse(priceData);
}

// Execute a market order
async function executeMarketOrder(order) {
  const { userId, symbol, side, quantity } = order;
  console.log(`[OrderEngine] Executing market order: ${side} ${quantity} ${symbol} for user ${userId}`);
  
  const instrument = await getInstrument(symbol);
  if (!instrument) {
    console.error(`[OrderEngine] Instrument ${symbol} not found`);
    return;
  }
  
  const { bid, ask } = await getCurrentPrice(symbol);
  let executionPrice;
  if (side === 'buy') {
    executionPrice = ask + instrument.spread;
  } else {
    executionPrice = bid - instrument.spread;
  }
  
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const positionId = uuidv4();
    await client.query(
      `INSERT INTO positions (id, user_id, instrument_id, side, open_price, quantity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [positionId, userId, instrument.id, side, executionPrice, quantity]
    );
    
    // Calculate margin required (1% of notional value)
    const notional = quantity * executionPrice;
    const marginUsed = notional * 0.01;
    await client.query(
      'UPDATE users SET free_margin = free_margin - $1 WHERE id = $2',
      [marginUsed, userId]
    );
    
    await client.query('COMMIT');
    
    // Notify via Redis for real-time updates
    await redis.publish('trade_events', JSON.stringify({
      userId,
      event: 'order_filled',
      positionId,
      price: executionPrice,
      quantity,
      symbol
    }));
    
    console.log(`[OrderEngine] Order filled: ${side} ${quantity} ${symbol} @ ${executionPrice}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[OrderEngine] Error executing order:', err);
  } finally {
    client.release();
  }
}

// Close a position (market order to close)
async function closePosition(positionId, userId) {
  console.log(`[OrderEngine] Closing position ${positionId} for user ${userId}`);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const pos = await client.query(
      'SELECT * FROM positions WHERE id = $1 AND user_id = $2 AND status = $3 FOR UPDATE',
      [positionId, userId, 'open']
    );
    if (pos.rows.length === 0) {
      throw new Error('Position not found or already closed');
    }
    const position = pos.rows[0];
    const instrument = await getInstrumentById(position.instrument_id);
    const { bid, ask } = await getCurrentPrice(instrument.symbol);
    
    let closePrice;
    if (position.side === 'buy') {
      closePrice = bid - instrument.spread;
    } else {
      closePrice = ask + instrument.spread;
    }
    
    // Calculate P&L
    const pnl = (closePrice - position.open_price) * position.quantity * (position.side === 'buy' ? 1 : -1);
    
    await client.query(
      `UPDATE positions SET status = $1, close_time = NOW(), close_price = $2, realised_pnl = $3
       WHERE id = $4`,
      ['closed', closePrice, pnl, positionId]
    );
    
    // Return margin + profit/loss to user balance
    const marginReturned = position.quantity * position.open_price * 0.01;
    await client.query(
      'UPDATE users SET balance = balance + $1, free_margin = free_margin + $2 WHERE id = $3',
      [pnl, marginReturned, userId]
    );
    
    await client.query('COMMIT');
    
    await redis.publish('trade_events', JSON.stringify({
      userId,
      event: 'position_closed',
      positionId,
      closePrice,
      pnl
    }));
    
    console.log(`[OrderEngine] Position closed: P&L = ${pnl}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[OrderEngine] Error closing position:', err);
  } finally {
    client.release();
  }
}

// Negative balance protection – runs every minute
async function protectNegativeBalances() {
  try {
    const users = await db.query('SELECT id, balance FROM users WHERE balance < 0');
    for (const user of users.rows) {
      console.log(`[OrderEngine] Negative balance detected for user ${user.id}: ${user.balance}. Resetting to 0 and liquidating positions.`);
      await db.query('UPDATE users SET balance = 0, free_margin = 0 WHERE id = $1', [user.id]);
      await db.query(
        `UPDATE positions SET status = $1, close_time = NOW()
         WHERE user_id = $2 AND status = $3`,
        ['liquidated', user.id, 'open']
      );
    }
  } catch (err) {
    console.error('[OrderEngine] Error in negative balance protection:', err);
  }
}

// Main loop – listen for orders and close requests
async function startEngine() {
  console.log('[OrderEngine] Starting order engine...');
  
  // Run negative balance protection every 60 seconds
  setInterval(protectNegativeBalances, 60000);
  
  while (true) {
    try {
      // Process market orders
      const orderJson = await redis.lpop('order_queue');
      if (orderJson) {
        const order = JSON.parse(orderJson);
        await executeMarketOrder(order);
      }
      
      // Process position close requests
      const closeJson = await redis.lpop('close_queue');
      if (closeJson) {
        const { positionId, userId } = JSON.parse(closeJson);
        await closePosition(positionId, userId);
      }
      
      // Small delay to prevent CPU spinning
      await new Promise(resolve => setTimeout(resolve, 10));
    } catch (err) {
      console.error('[OrderEngine] Unexpected error in main loop:', err);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[OrderEngine] SIGTERM received, shutting down...');
  redis.quit();
  db.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[OrderEngine] SIGINT received, shutting down...');
  redis.quit();
  db.end();
  process.exit(0);
});

// Start the engine
startEngine();