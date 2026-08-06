require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const gameRoutes = require('./routes/games');
const adminRoutes = require('./routes/admin');
const gameManager = require('./game/gameManager');

const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/admin', adminRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: allowedOrigins } });
gameManager.init(io);

// Authenticate socket connections via JWT passed in the handshake.
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Missing auth token'));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.userId = payload.id;
    next();
  } catch (err) {
    next(new Error('Invalid auth token'));
  }
});

io.on('connection', (socket) => {
  gameManager.attachSocket(socket, socket.data.userId);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Merged Bingo backend listening on port ${PORT}`);
});
