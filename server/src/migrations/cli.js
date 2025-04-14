// server/src/migrations/cli.js
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const migrationManager = require('./migration');

// Parse command-line arguments
const args = process.argv.slice(2);
const command = args[0] || 'status';
const options = args.slice(1);

// Connection to database
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/modern-dead', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Disconnect from database
async function disconnectDB() {
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

// Main function
async function main() {
  await connectDB();

  try {
    switch (command) {
      case 'status':
        // Show migration status
        const migrations = await migrationManager.loadMigrations();
        const applied = await migrationManager.getAppliedMigrations();

        console.log('Migration Status:');
        console.log('-----------------');
        console.log(`Total migrations: ${migrations.length}`);
        console.log(`Applied migrations: ${applied.length}`);
        console.log(`Pending migrations: ${migrations.length - applied.length}`);

        if (applied.length > 0) {
          console.log('\nApplied Migrations:');
          applied.forEach(m => {
            console.log(`- ${m.name} (applied at ${m.appliedAt.toISOString()})`);
          });
        }

        const pending = migrations.filter(
          m => !applied.some(a => a.name === m.name)
        );

        if (pending.length > 0) {
          console.log('\nPending Migrations:');
          pending.forEach(m => {
            console.log(`- ${m.name}`);
          });
        }
        break;

      case 'up':
        // Apply migrations
        const results = await migrationManager.applyPendingMigrations();

        if (results.length > 0) {
          console.log('\nMigration Results:');
          results.forEach(r => {
            console.log(`- ${r.name}: ${r.success ? 'SUCCESS' : 'FAILED - ' + r.error}`);
          });
        }

        console.log(`\nApplied ${results.filter(r => r.success).length} migrations`);
        break;

      case 'down':
        // Rollback migrations
        const steps = options[0] ? parseInt(options[0], 10) : 1;
        const rollbackResults = await migrationManager.rollbackMigration(steps);

        if (rollbackResults.length > 0) {
          console.log('\nRollback Results:');
          rollbackResults.forEach(r => {
            console.log(`- ${r.name}: ${r.success ? 'SUCCESS' : 'FAILED - ' + r.error}`);
          });
        }

        console.log(`\nRolled back ${rollbackResults.filter(r => r.success).length} migrations`);
        break;

      case 'create':
        // Create a new migration file (not implemented here)
        console.log('Migration creation not implemented in this example');
        break;

      default:
        console.log(`Unknown command: ${command}`);
        console.log('Available commands: status, up, down, create');
    }
  } catch (error) {
    console.error('Error running migration command:', error);
  } finally {
    await disconnectDB();
  }
}

// Run the CLI
main();
