// backend/market-data/index.js
// Market Data Service – Connects to AllTick WebSocket and publishes prices to Redis

require('dotenv').config();
const WebSocket = require('ws');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);
const ALLTICK_API_KEY = process.env.ALLTICK_API_KEY;
const ALLTICK_WS_URL = process.env.ALLTICK_WS_URL || 'wss://quote.alltick.io/quote-b-api/ws';

// List of instruments to subscribe to (matching your database)
const SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AAPL', 'MSFT', 'GOOGL', 'BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD'];

let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000;

function connectWebSocket() {
  console.log('[MarketData] Connecting to AllTick WebSocket...');
  
  ws = new WebSocket(ALLTICK_WS_URL, {
    headers: { 'api-key': ALLTICK_API_KEY }
  });

  ws.on('open', () => {
    console.log('[MarketData] Connected to AllTick');
    reconnectAttempts = 0;
    
    // Subscribe to symbols
    const subscribeMsg = JSON.stringify({
      cmd: 'sub',
      args: SYMBOLS
    });
    ws.send(subscribeMsg);
    console.log('[MarketData] Subscribed to symbols:', SYMBOLS.join(', '));
  });

  ws.on('message', (data) => {
    try {
      const update = JSON.parse(data.toString());
      
      // AllTick response format example:
      // { symbol: 'EURUSD', bid: 1.0850, ask: 1.0852, timestamp: 123456789 }
      if (update.bid !== undefined && update.ask !== undefined && update.symbol) {
        const priceData = {
          symbol: update.symbol,
          bid: update.bid,
          ask: update.ask,
          timestamp: update.timestamp || Date.now()
        };
        
        // Cache last price in Redis (expires after 5 seconds)
        redis.set(`last_price_${update.symbol}`, JSON.stringify(priceData), 'EX', 5);
        
        // Publish to channel for real-time updates
        redis.publish('marketdata:prices', JSON.stringify(priceData));
        
        // Log every 100th update to avoid spam
        if (Math.random() < 0.01) {
          console.log(`[MarketData] ${update.symbol}: Bid=${update.bid}, Ask=${update.ask}`);
        }
      }
    } catch (err) {
      console.error('[MarketData] Error parsing message:', err.message);
    }
  });

  ws.on('error', (err) => {
    console.error('[MarketData] WebSocket error:', err.message);
  });

  ws.on('close', (code, reason) => {
    console.log(`[MarketData] WebSocket closed: ${code} - ${reason}`);
    attemptReconnect();
  });
}

function attemptReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[MarketData] Max reconnect attempts reached. Exiting.');
    process.exit(1);
  }
  reconnectAttempts++;
  console.log(`[MarketData] Reconnecting in ${RECONNECT_DELAY / 1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
  setTimeout(connectWebSocket, RECONNECT_DELAY);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[MarketData] SIGTERM received, closing WebSocket and Redis...');
  if (ws) ws.close();
  redis.quit();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[MarketData] SIGINT received, shutting down...');
  if (ws) ws.close();
  redis.quit();
  process.exit(0);
});

// Start the service
connectWebSocket();