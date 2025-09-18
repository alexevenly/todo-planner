exports.up = async function(knex) {
  // Check if tables exist and create them if they don't
  const tables = [
    'kanban_columns',
    'kanban_tasks', 
    'kanban_subtasks',
    'kanban_nested_subtasks',
    'kanban_labels',
    'kanban_epics',
    'kanban_task_assignments',
    'kanban_tasks_new'
  ];

  for (const tableName of tables) {
    const exists = await knex.schema.hasTable(tableName);
    if (!exists) {
      console.log(`Creating table: ${tableName}`);
      
      switch (tableName) {
        case 'kanban_columns':
          await knex.schema.createTable(tableName, function(table) {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable();
            table.string('column_id', 50).notNullable();
            table.string('title', 100).notNullable();
            table.integer('order_index').defaultTo(0);
            table.timestamps(true, true);
            
            table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
            table.unique(['user_id', 'column_id']);
          });
          break;
          
        case 'kanban_tasks_new':
          await knex.schema.createTable(tableName, function(table) {
            table.increments('id').primary();
            table.integer('user_id').notNullable();
            table.string('task_id').notNullable();
            table.string('title').notNullable();
            table.text('description');
            table.string('priority').defaultTo('medium');
            table.string('status').defaultTo('По плану');
            table.text('labels').defaultTo('[]');
            table.string('epic').defaultTo('');
            table.string('parent_id').nullable();
            table.string('due_date').defaultTo('');
            table.string('created_at_date').defaultTo('');
            table.boolean('subtasks_expanded').defaultTo(false);
            table.boolean('completed').defaultTo(false);
            table.string('task_type').defaultTo('task');
            table.integer('order_index').defaultTo(0);
            table.timestamps(true, true);
            
            table.index(['user_id']);
            table.index(['parent_id']);
            table.index(['user_id', 'parent_id']);
            table.index(['user_id', 'task_type']);
            table.unique(['user_id', 'task_id']);
          });
          break;
          
        case 'kanban_task_assignments':
          await knex.schema.createTable(tableName, function(table) {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable();
            table.string('task_id', 100).notNullable();
            table.string('column_id', 50).notNullable();
            table.integer('order_index').defaultTo(0);
            table.timestamps(true, true);
            
            table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
          });
          break;
          
        case 'kanban_labels':
          await knex.schema.createTable(tableName, function(table) {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable();
            table.string('name', 100).notNullable();
            table.string('color', 7).notNullable();
            table.timestamps(true, true);
            
            table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
            table.unique(['user_id', 'name']);
          });
          break;
          
        case 'kanban_epics':
          await knex.schema.createTable(tableName, function(table) {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable();
            table.string('name', 255).notNullable();
            table.string('color', 7).defaultTo('#3498db');
            table.timestamps(true, true);
            
            table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
            table.unique(['user_id', 'name']);
          });
          break;
      }
    } else {
      console.log(`Table ${tableName} already exists, skipping...`);
    }
  }
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('kanban_task_assignments')
    .dropTableIfExists('kanban_epics')
    .dropTableIfExists('kanban_labels')
    .dropTableIfExists('kanban_tasks_new')
    .dropTableIfExists('kanban_nested_subtasks')
    .dropTableIfExists('kanban_subtasks')
    .dropTableIfExists('kanban_tasks')
    .dropTableIfExists('kanban_columns');
};
