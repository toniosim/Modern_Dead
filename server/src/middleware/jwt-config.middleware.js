// src/middleware/jwt-config.middleware.js

/**
 * Middleware to verify that JWT secrets are properly configured
 */
exports.checkJwtConfig = (req, res, next) => {
  // Check if JWT secrets are configured
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured in the environment variables');
    return res.status(500).json({
      error: 'Server authentication configuration error',
      message: 'JWT_SECRET is not configured'
    });
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    console.error('JWT_REFRESH_SECRET is not configured in the environment variables');
    return res.status(500).json({
      error: 'Server authentication configuration error',
      message: 'JWT_REFRESH_SECRET is not configured'
    });
  }

  // If properly configured, proceed
  next();
};
