#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    const { stdout, stderr } = await execAsync('npx knex migrate:latest');
    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.log('⚠️  Migration failed, trying alternative approach...');
    console.log('Error:', error.message);
    
    // Try to run the specific migration that should work
    try {
      console.log('🔄 Trying alternative migration...');
      const { stdout, stderr } = await execAsync('npx knex migrate:up 012_skip_broken_migration.js');
      if (stdout) console.log(stdout);
      if (stderr) console.log(stderr);
      console.log('✅ Alternative migration completed successfully');
    } catch (altError) {
      console.log('⚠️  Alternative migration also failed, but continuing...');
      console.log('Alt Error:', altError.message);
    }
  }
}

async function runSeeds() {
  try {
    console.log('🌱 Running database seeds...');
    const { stdout, stderr } = await execAsync('npx knex seed:run');
    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);
    console.log('✅ Seeds completed successfully');
  } catch (error) {
    console.log('⚠️  Seeding failed, but continuing...');
    console.log('Error:', error.message);
  }
}

async function startApp() {
  try {
    console.log('🚀 Starting application...');
    require('./app.js');
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Starting todo-planner application...');
  
  await runMigrations();
  await runSeeds();
  await startApp();
}

main().catch(console.error);
