#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function removeAdminUser() {
  try {
    console.log('🗑️  Removing admin user from production database...');
    
    // Connect to production database and remove admin user
    const { stdout, stderr } = await execAsync(`
      PGPASSWORD=$DATABASE_PASSWORD psql $DATABASE_URL -c "
        DELETE FROM users WHERE email = 'admin@example.com';
        SELECT 'Admin user removed' as result;
      "
    `);
    
    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);
    console.log('✅ Admin user removed successfully');
  } catch (error) {
    console.error('❌ Failed to remove admin user:', error.message);
  }
}

async function addKanbanDataForUser() {
  try {
    console.log('🌱 Adding kanban data for user ptaha-ha-ha@rambler.ru...');
    
    // First, get the user ID for ptaha-ha-ha@rambler.ru
    const { stdout: userResult } = await execAsync(`
      PGPASSWORD=$DATABASE_PASSWORD psql $DATABASE_URL -c "
        SELECT id FROM users WHERE email = 'ptaha-ha-ha@rambler.ru';
      "
    `);
    
    const userIdMatch = userResult.match(/^\s*(\d+)\s*$/m);
    if (!userIdMatch) {
      console.log('❌ User ptaha-ha-ha@rambler.ru not found');
      return;
    }
    
    const userId = userIdMatch[1];
    console.log(`Found user ID: ${userId}`);
    
    // Create default columns for the user
    const { stdout: columnsResult } = await execAsync(`
      PGPASSWORD=$DATABASE_PASSWORD psql $DATABASE_URL -c "
        INSERT INTO kanban_columns (user_id, column_id, title, order_index) VALUES
        (${userId}, 'todo', 'To Do', 0),
        (${userId}, 'in_progress', 'In Progress', 1),
        (${userId}, 'done', 'Done', 2)
        ON CONFLICT (user_id, column_id) DO NOTHING;
        SELECT 'Columns created for user ${userId}' as result;
      "
    `);
    
    console.log(columnsResult);
    console.log('✅ Kanban columns added for user');
    
  } catch (error) {
    console.error('❌ Failed to add kanban data:', error.message);
  }
}

async function main() {
  console.log('🚀 Fixing production database...');
  
  await removeAdminUser();
  await addKanbanDataForUser();
  
  console.log('✅ Production database fixed!');
}

main().catch(console.error);
