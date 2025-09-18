exports.up = function(knex) {
  return knex.schema
    .createTable('kanban_columns', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('column_id', 50).notNullable(); // e.g., 'todo', 'in-progress', 'done'
      table.string('title', 100).notNullable();
      table.integer('order_index').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.unique(['user_id', 'column_id']);
    })
    .createTable('kanban_tasks', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('task_id', 100).notNullable(); // e.g., 'task-1234567890-1'
      table.string('title', 255).notNullable();
      table.text('description').defaultTo('');
      table.enum('priority', ['low', 'medium', 'high']).defaultTo('medium');
      table.string('status', 50).defaultTo('По плану');
      table.text('labels').defaultTo('[]'); // JSON array of labels
      table.string('epic', 255).defaultTo('');
      table.string('parent_task', 255).defaultTo('');
      table.string('due_date', 50).defaultTo('');
      table.string('created_at_date', 50).defaultTo('');
      table.boolean('subtasks_expanded').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.unique(['user_id', 'task_id']);
    })
    .createTable('kanban_subtasks', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('task_id', 100).notNullable(); // Parent task ID
      table.string('subtask_id', 100).notNullable(); // Subtask ID
      table.string('title', 255).notNullable();
      table.boolean('completed').defaultTo(false);
      table.integer('order_index').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('task_id').references('task_id').inTable('kanban_tasks').onDelete('CASCADE');
    })
    .createTable('kanban_nested_subtasks', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('subtask_id', 100).notNullable(); // Parent subtask ID
      table.string('nested_subtask_id', 100).notNullable(); // Nested subtask ID
      table.string('title', 255).notNullable();
      table.boolean('completed').defaultTo(false);
      table.integer('order_index').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    })
    .createTable('kanban_labels', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('name', 100).notNullable();
      table.string('color', 7).notNullable(); // Hex color code
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.unique(['user_id', 'name']);
    })
    .createTable('kanban_epics', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('name', 255).notNullable();
      table.string('color', 7).defaultTo('#3498db'); // Hex color code
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.unique(['user_id', 'name']);
    })
    .createTable('kanban_task_assignments', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('task_id', 100).notNullable();
      table.string('column_id', 50).notNullable();
      table.integer('order_index').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('task_id').references('task_id').inTable('kanban_tasks').onDelete('CASCADE');
      table.foreign('column_id').references('column_id').inTable('kanban_columns').onDelete('CASCADE');
      table.unique(['user_id', 'task_id', 'column_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('kanban_task_assignments')
    .dropTableIfExists('kanban_epics')
    .dropTableIfExists('kanban_labels')
    .dropTableIfExists('kanban_nested_subtasks')
    .dropTableIfExists('kanban_subtasks')
    .dropTableIfExists('kanban_tasks')
    .dropTableIfExists('kanban_columns');
};
