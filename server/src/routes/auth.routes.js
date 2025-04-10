// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { validateRequest } = require('../middleware/validation.middleware');

// Register new user
router.post(
  '/register',
  [
    body('username').isLength({ min: 3, max: 20 }),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    validateRequest
  ],
  authController.register
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    validateRequest
  ],
  authController.login
);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

// Logout
router.post('/logout', authController.logout);

module.exports = router;
