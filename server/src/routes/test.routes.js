// src/routes/test.routes.js
const express = require('express');
const router = express.Router();

router.get('/ping', (req, res) => {
  res.json({
    message: 'Pong!',
    timestamp: new Date().toISOString(),
    serverInfo: {
      name: 'Modern Dead API',
      version: '0.1.0'
    }
  });
});

module.exports = router;
