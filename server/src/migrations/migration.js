// server/src/migrations/migration.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Schema for migration tracking
const migrationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    required: true
  }
});

const Migration = mongoose.model('Migration', migrationSchema);

class MigrationManager {
  constructor() {
    this.migrationsDir = path.join(__dirname, 'scripts');
    this.migrations = [];
  }

  // Load all migration scripts
  async loadMigrations() {
    if (!fs.existsSync(this.migrationsDir)) {
      throw new Error(`Migrations directory not found: ${this.migrationsDir}`);
    }

    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort(); // Sort to ensure migrations run in order

    this.migrations = files.map(file => {
      const migrationPath = path.join(this.migrationsDir, file);
      const migration = require(migrationPath);
      return {
        name: file,
        version: this.extractVersionFromFilename(file),
        migrate: migration.up,
        rollback: migration.down
      };
    });

    return this.migrations;
  }

  // Extract version number from filename (e.g., 001_init.js -> 1)
  extractVersionFromFilename(filename) {
    const versionMatch = filename.match(/^(\d+)_/);
    return versionMatch ? parseInt(versionMatch[1], 10) : 0;
  }

  // Get applied migrations from database
  async getAppliedMigrations() {
    return await Migration.find().sort('version');
  }

  // Apply pending migrations
  async applyPendingMigrations() {
    await this.loadMigrations();
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedNames = appliedMigrations.map(m => m.name);

    const pendingMigrations = this.migrations.filter(
      m => !appliedNames.includes(m.name)
    );

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to apply');
      return [];
    }

    console.log(`Applying ${pendingMigrations.length} pending migrations...`);

    const results = [];
    for (const migration of pendingMigrations) {
      try {
        console.log(`Applying migration: ${migration.name}`);
        await migration.migrate();

        // Record successful migration
        await Migration.create({
          name: migration.name,
          version: migration.version,
          appliedAt: new Date()
        });

        results.push({
          name: migration.name,
          success: true
        });
      } catch (error) {
        console.error(`Error applying migration ${migration.name}:`, error);
        results.push({
          name: migration.name,
          success: false,
          error: error.message
        });
        // Stop migration process on error
        break;
      }
    }

    return results;
  }

  // Rollback migrations
  async rollbackMigration(steps = 1) {
    await this.loadMigrations();
    const appliedMigrations = await this.getAppliedMigrations();

    if (appliedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return [];
    }

    // Get migrations to rollback
    const toRollback = appliedMigrations
      .slice(-steps)
      .map(m => {
        const migration = this.migrations.find(mig => mig.name === m.name);
        return {
          dbRecord: m,
          migration
        };
      })
      .filter(m => m.migration && m.migration.rollback);

    if (toRollback.length === 0) {
      console.log('No migrations available to rollback');
      return [];
    }

    console.log(`Rolling back ${toRollback.length} migrations...`);

    const results = [];
    for (const {dbRecord, migration} of toRollback.reverse()) {
      try {
        console.log(`Rolling back migration: ${migration.name}`);
        await migration.rollback();

        // Remove migration record
        await Migration.deleteOne({ _id: dbRecord._id });

        results.push({
          name: migration.name,
          success: true
        });
      } catch (error) {
        console.error(`Error rolling back migration ${migration.name}:`, error);
        results.push({
          name: migration.name,
          success: false,
          error: error.message
        });
        // Stop rollback process on error
        break;
      }
    }

    return results;
  }
}

module.exports = new MigrationManager();
