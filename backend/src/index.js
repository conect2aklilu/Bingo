require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
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

const candidatePaths = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), 'dist'),
];

const frontendDistPath = candidatePaths.find((candidate) => fs.existsSync(candidate));
const frontendIndexPath = frontendDistPath ? path.join(frontendDistPath, 'index.html') : null;

if (frontendDistPath) {
  app.use(express.static(frontendDistPath));
}

app.get('/', (req, res) => {
  if (frontendIndexPath && fs.existsSync(frontendIndexPath)) {
    return res.sendFile(frontendIndexPath);
  }
  res.type('html').send(`<!doctype html><html><body><h1>Yene Bingo</h1><p>The app is running.</p></body></html>`);
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (frontendIndexPath && fs.existsSync(frontendIndexPath)) {
    return res.sendFile(frontendIndexPath);
  }
  res.status(404).send('Not found');
});

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
