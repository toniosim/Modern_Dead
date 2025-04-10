#!/usr/bin/env node

/**
 * Setup script to generate JWT secrets and update the .env file
 * Run this with: node setup.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENV_FILE_PATH = path.join(__dirname, 'src', '.env');

// Generate a random JWT secret
function generateSecret() {
  return crypto.randomBytes(64).toString('hex');
}

// Update or create the .env file with JWT secrets
function updateEnvFile() {
  console.log('Setting up JWT secrets...');

  // Check if .env file exists
  let envContent = '';
  if (fs.existsSync(ENV_FILE_PATH)) {
    // Read existing .env file
    envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
  }

  // Generate new secrets
  const jwtSecret = generateSecret();
  const jwtRefreshSecret = generateSecret();

  // Check if JWT_SECRET already exists
  if (envContent.includes('JWT_SECRET=')) {
    // Replace existing JWT_SECRET
    envContent = envContent.replace(
      /JWT_SECRET=.*/,
      `JWT_SECRET=${jwtSecret}`
    );
  } else {
    // Add JWT_SECRET
    envContent += `\nJWT_SECRET=${jwtSecret}`;
  }

  // Check if JWT_REFRESH_SECRET already exists
  if (envContent.includes('JWT_REFRESH_SECRET=')) {
    // Replace existing JWT_REFRESH_SECRET
    envContent = envContent.replace(
      /JWT_REFRESH_SECRET=.*/,
      `JWT_REFRESH_SECRET=${jwtRefreshSecret}`
    );
  } else {
    // Add JWT_REFRESH_SECRET
    envContent += `\nJWT_REFRESH_SECRET=${jwtRefreshSecret}`;
  }

  // Write to .env file
  fs.writeFileSync(ENV_FILE_PATH, envContent.trim());
  console.log('JWT secrets successfully configured in .env file.');
}

// Main function
function setup() {
  try {
    updateEnvFile();
    console.log('Setup completed successfully!');
  } catch (error) {
    console.error('Error during setup:', error);
    process.exit(1);
  }
}

// Run setup
setup();
