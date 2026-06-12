const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const testKeyRoute = require('./routes/testKey');
const translateAudioRoute = require('./routes/translateAudio');
const ttsRoute = require('./routes/tts');
const translateTextRoute = require('./routes/translateText');

const app = express();
const PORT = process.env.PORT || 3001;

// Resolve allowed CORS origin(s) from env: "*" (any) or a comma-separated list
const corsOriginEnv = (process.env.CORS_ORIGIN || '*').trim();
const corsOrigin =
  corsOriginEnv === '*'
    ? true
    : corsOriginEnv.split(',').map((o) => o.trim()).filter(Boolean);

// Middlewares
app.use(cors({ origin: corsOrigin }));
// Set payload limits high enough to handle base64 audio uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Endpoints
app.use('/api', testKeyRoute);
app.use('/api', translateAudioRoute);
app.use('/api', ttsRoute);
app.use('/api', translateTextRoute);

// Serve static files from client/dist (React build outputs)
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

// Fallback all other GET requests to client/dist/index.html for React Router compatibility
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  URL: http://localhost:${PORT}          `);
  console.log(`=========================================`);
});
