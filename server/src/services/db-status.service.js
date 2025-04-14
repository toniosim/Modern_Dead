// server/src/services/db-status.service.js
const mongoose = require('mongoose');

class DatabaseStatusService {
  constructor() {
    this.isConnected = false;
    this.lastChecked = null;
    this.stats = {
      connections: 0,
      queries: 0,
      slowQueries: 0
    };

    this.setupListeners();
  }

  setupListeners() {
    // Track connection status
    mongoose.connection.on('connected', () => {
      this.isConnected = true;
      console.log('MongoDB connection established');
    });

    mongoose.connection.on('disconnected', () => {
      this.isConnected = false;
      console.log('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      this.isConnected = true;
      console.log('MongoDB reconnected');
    });

    // Track connection pool status if in development
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        this.checkStatus();
      }, 60000); // Check every minute
    }
  }

  async checkStatus() {
    try {
      if (!mongoose.connection.readyState) {
        this.isConnected = false;
        return false;
      }

      // Get server status if admin access is available
      if (mongoose.connection.db) {
        const adminDb = mongoose.connection.db.admin();
        const serverStatus = await adminDb.serverStatus();

        this.stats.connections = serverStatus.connections.current;
        // Log additional metrics if needed
      }

      this.isConnected = true;
      this.lastChecked = new Date();
      return true;
    } catch (error) {
      console.error('Error checking database status:', error);
      return false;
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      lastChecked: this.lastChecked,
      connectionState: mongoose.connection.readyState,
      stats: this.stats
    };
  }
}

module.exports = new DatabaseStatusService();
