exports.up = function(knex) {
  return knex.schema
    .createTableIfNotExists('kanban_columns', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('column_id', 50).notNullable();
      table.string('title', 100).notNullable();
      table.integer('order_index').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.unique(['user_id', 'column_id']);
    })
    .createTableIfNotExists('kanban_tasks', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('task_id', 100).notNullable();
      table.string('title', 255).notNullable();
      table.text('description').defaultTo('');
      table.enum('priority', ['low', 'medium', 'high']).defaultTo('medium');
      table.string('status', 50).defaultTo('По плану');
      table.text('labels').defaultTo('[]');
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
    .createTableIfNotExists('kanban_subtasks', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('task_id', 100).notNullable();
      table.string('subtask_id', 100).notNullable();
      table.string('title', 255).notNullable();
      table.boolean('completed').defaultTo(false);
      table.integer('order_index').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    })
    .createTableIfNotExists('kanban_nested_subtasks', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('subtask_id', 100).notNullable();
      table.string('nested_subtask_id', 100).notNullable();
      table.string('title', 255).notNullable();
      table.boolean('completed').defaultTo(false);
      table.integer('order_index').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    })
    .createTableIfNotExists('kanban_labels', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('name', 100).notNullable();
      table.string('color', 7).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.unique(['user_id', 'name']);
    })
    .createTableIfNotExists('kanban_epics', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('name', 255).notNullable();
      table.string('color', 7).defaultTo('#3498db');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.unique(['user_id', 'name']);
    })
    .createTableIfNotExists('kanban_task_assignments', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('task_id', 100).notNullable();
      table.string('column_id', 50).notNullable();
      table.integer('order_index').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
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
