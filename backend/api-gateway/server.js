// backend/api-gateway/server.js
// Main API Gateway for VelozTrade – handles REST API, WebSocket, authentication, orders

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL);

// Middleware
app.use(cors());
app.use(express.json());

// Email transporter (SendGrid)
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY }
});

// ==================== Helper Middleware ====================
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.role = decoded.role || 'user';
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function adminAuth(req, res, next) {
  if (req.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// ==================== Authentication Endpoints ====================
app.post('/api/auth/register', async (req, res) => {
  const { email, password, full_name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const hashed = await bcrypt.hash(password, 10);
  try {
    const result = await db.query(
      'INSERT INTO users (email, password_hash, full_name) VALUES ($1,$2,$3) RETURNING id',
      [email, hashed, full_name || null]
    );
    const userId = result.rows[0].id;
    // Send verification email
    const verifyToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const verifyLink = `https://veloztrade.com/verify?token=${verifyToken}`;
    await transporter.sendMail({
      to: email,
      subject: 'Verify your email for VelozTrade',
      html: `Click <a href="${verifyLink}">here</a> to verify your email.`
    });
    res.json({ success: true, userId });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.get('/api/auth/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Missing token');
  try {
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    await db.query('UPDATE users SET email_verified = TRUE WHERE id = $1', [userId]);
    res.send('Email verified successfully. You may now login.');
  } catch (err) {
    res.status(400).send('Invalid or expired token');
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  if (user.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
  const userRow = user.rows[0];
  if (!userRow.email_verified) return res.status(401).json({ error: 'Please verify your email first' });
  const match = await bcrypt.compare(password, userRow.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  if (userRow.twofa_enabled) {
    const tempToken = jwt.sign({ userId: userRow.id, twofaPending: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
    return res.json({ twofaRequired: true, tempToken });
  }

  const token = jwt.sign({ userId: userRow.id, role: userRow.role || 'user' }, process.env.JWT_SECRET);
  res.json({ token, userId: userRow.id });
});

app.post('/api/auth/2fa/verify', async (req, res) => {
  const { tempToken, code } = req.body;
  try {
    const { userId } = jwt.verify(tempToken, process.env.JWT_SECRET);
    const user = await db.query('SELECT twofa_secret FROM users WHERE id = $1', [userId]);
    if (!user.rows[0]?.twofa_secret) return res.status(400).json({ error: '2FA not set up' });
    const verified = speakeasy.totp.verify({
      secret: user.rows[0].twofa_secret,
      encoding: 'base32',
      token: code
    });
    if (!verified) return res.status(401).json({ error: 'Invalid 2FA code' });
    const token = jwt.sign({ userId, role: user.role || 'user' }, process.env.JWT_SECRET);
    res.json({ token, userId });
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired temp token' });
  }
});

app.post('/api/auth/2fa/setup', auth, async (req, res) => {
  const secret = speakeasy.generateSecret({ length: 20 });
  await db.query('UPDATE users SET twofa_secret = $1 WHERE id = $2', [secret.base32, req.userId]);
  const otpauthUrl = speakeasy.otpauthURL({ secret: secret.ascii, label: `VelozTrade:${req.userId}`, issuer: 'VelozTrade' });
  const qr = await QRCode.toDataURL(otpauthUrl);
  res.json({ qr, secret: secret.base32 });
});

app.post('/api/auth/2fa/enable', auth, async (req, res) => {
  const { code } = req.body;
  const user = await db.query('SELECT twofa_secret FROM users WHERE id = $1', [req.userId]);
  if (!user.rows[0]?.twofa_secret) return res.status(400).json({ error: '2FA not set up' });
  const verified = speakeasy.totp.verify({
    secret: user.rows[0].twofa_secret,
    encoding: 'base32',
    token: code
  });
  if (!verified) return res.status(400).json({ error: 'Invalid code' });
  await db.query('UPDATE users SET twofa_enabled = TRUE WHERE id = $1', [req.userId]);
  res.json({ success: true });
});

// ==================== Account Endpoints ====================
app.get('/api/account/balance', auth, async (req, res) => {
  const user = await db.query('SELECT balance, free_margin FROM users WHERE id = $1', [req.userId]);
  res.json(user.rows[0] || { balance: 0, free_margin: 0 });
});

app.get('/api/account/positions', auth, async (req, res) => {
  const positions = await db.query(`
    SELECT p.id, i.symbol, p.side, p.quantity, p.open_price, p.status, p.open_time,
           (SELECT ask FROM get_current_price(i.symbol)) as current_price
    FROM positions p
    JOIN instruments i ON p.instrument_id = i.id
    WHERE p.user_id = $1 AND p.status = 'open'
  `, [req.userId]);
  // Enrich with P&L (simplified)
  const enriched = positions.rows.map(p => ({
    ...p,
    pnl: p.side === 'buy'
      ? (Number(p.current_price) - Number(p.open_price)) * Number(p.quantity)
      : (Number(p.open_price) - Number(p.current_price)) * Number(p.quantity)
  }));
  res.json(enriched);
});

// ==================== Trade Endpoints ====================
app.post('/api/trade/market', auth, async (req, res) => {
  const { symbol, side, quantity } = req.body;
  if (!symbol || !side || !quantity) return res.status(400).json({ error: 'Missing fields' });
  const orderRequest = {
    userId: req.userId,
    symbol,
    side,
    quantity: parseFloat(quantity),
    type: 'market',
    timestamp: Date.now()
  };
  await redis.lpush('order_queue', JSON.stringify(orderRequest));
  res.json({ status: 'accepted', message: 'Order placed, processing...' });
});

app.post('/api/trade/close', auth, async (req, res) => {
  const { positionId } = req.body;
  if (!positionId) return res.status(400).json({ error: 'Missing positionId' });
  const position = await db.query('SELECT * FROM positions WHERE id = $1 AND user_id = $2 AND status = $3', [positionId, req.userId, 'open']);
  if (position.rows.length === 0) return res.status(404).json({ error: 'Position not found or already closed' });
  await redis.lpush('close_queue', JSON.stringify({ positionId, userId: req.userId }));
  res.json({ status: 'accepted', message: 'Close request accepted' });
});

// ==================== Deposit & Withdrawal Endpoints ====================
app.post('/api/account/withdraw', auth, async (req, res) => {
  const { amount, method, address } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  const user = await db.query('SELECT balance FROM users WHERE id = $1', [req.userId]);
  if (user.rows[0].balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
  await db.query(
    'INSERT INTO withdrawal_requests (user_id, amount, method, address) VALUES ($1,$2,$3,$4)',
    [req.userId, amount, method, address]
  );
  res.json({ success: true, message: 'Withdrawal request submitted for approval' });
});

// Stripe webhook (deposit)
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    const amount = session.amount_total / 100;
    await db.query('UPDATE users SET balance = balance + $1, free_margin = free_margin + $1 WHERE id = $2', [amount, userId]);
    await db.query('INSERT INTO deposits (user_id, amount, gateway_txn_id) VALUES ($1,$2,$3)', [userId, amount, session.id]);
  }
  res.json({ received: true });
});

// ==================== Admin Endpoints ====================
app.get('/api/admin/users', auth, adminAuth, async (req, res) => {
  const users = await db.query('SELECT id, email, full_name, kyc_status, balance, is_blocked, created_at FROM users');
  res.json(users.rows);
});

app.get('/api/admin/withdrawals', auth, adminAuth, async (req, res) => {
  const withdrawals = await db.query(`
    SELECT w.*, u.email FROM withdrawal_requests w
    JOIN users u ON w.user_id = u.id
    WHERE w.status = 'pending'
    ORDER BY w.created_at DESC
  `);
  res.json(withdrawals.rows);
});

app.post('/api/admin/withdrawals/:id/approve', auth, adminAuth, async (req, res) => {
  const { id } = req.params;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const withdrawal = await client.query('SELECT * FROM withdrawal_requests WHERE id = $1 FOR UPDATE', [id]);
    if (withdrawal.rows.length === 0) throw new Error('Not found');
    const w = withdrawal.rows[0];
    if (w.status !== 'pending') throw new Error('Already processed');
    await client.query('UPDATE users SET balance = balance - $1, free_margin = free_margin - $1 WHERE id = $2', [w.amount, w.user_id]);
    await client.query('UPDATE withdrawal_requests SET status = $1 WHERE id = $2', ['approved', id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.put('/api/admin/instruments/:id/spread', auth, adminAuth, async (req, res) => {
  const { id } = req.params;
  const { spread } = req.body;
  if (!spread) return res.status(400).json({ error: 'Spread required' });
  await db.query('UPDATE instruments SET spread = $1 WHERE id = $2', [spread, id]);
  res.json({ success: true });
});

// ==================== WebSocket for Live Prices ====================
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);
  socket.on('subscribe', (symbol) => {
    socket.join(`price_${symbol}`);
  });
  const redisSub = new Redis(process.env.REDIS_URL);
  redisSub.subscribe('marketdata:prices');
  redisSub.on('message', (channel, message) => {
    const { symbol, bid, ask } = JSON.parse(message);
    io.to(`price_${symbol}`).emit('price', { symbol, bid, ask });
  });
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
    redisSub.disconnect();
  });
});

// ==================== Start Server ====================
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});