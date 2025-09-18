exports.up = async function(knex) {
  // Skip the broken 006 migration and create tables directly
  
  // Create kanban_columns table
  const columnsExists = await knex.schema.hasTable('kanban_columns');
  if (!columnsExists) {
    await knex.schema.createTable('kanban_columns', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('column_id', 50).notNullable();
      table.string('title', 100).notNullable();
      table.integer('order_index').defaultTo(0);
      table.timestamps(true, true);
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.unique(['user_id', 'column_id']);
    });
    console.log('Created kanban_columns table');
  }

  // Create kanban_tasks table
  const tasksExists = await knex.schema.hasTable('kanban_tasks');
  if (!tasksExists) {
    await knex.schema.createTable('kanban_tasks', function(table) {
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
      table.timestamps(true, true);
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.unique(['user_id', 'task_id']);
    });
    console.log('Created kanban_tasks table');
  }

  // Create kanban_subtasks table WITHOUT foreign key constraint
  const subtasksExists = await knex.schema.hasTable('kanban_subtasks');
  if (!subtasksExists) {
    await knex.schema.createTable('kanban_subtasks', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('task_id', 100).notNullable();
      table.string('subtask_id', 100).notNullable();
      table.string('title', 255).notNullable();
      table.boolean('completed').defaultTo(false);
      table.integer('order_index').defaultTo(0);
      table.timestamps(true, true);
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      // NO foreign key constraint to kanban_tasks to avoid the error
    });
    console.log('Created kanban_subtasks table');
  }

  // Create kanban_nested_subtasks table
  const nestedSubtasksExists = await knex.schema.hasTable('kanban_nested_subtasks');
  if (!nestedSubtasksExists) {
    await knex.schema.createTable('kanban_nested_subtasks', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('subtask_id', 100).notNullable();
      table.string('nested_subtask_id', 100).notNullable();
      table.string('title', 255).notNullable();
      table.boolean('completed').defaultTo(false);
      table.integer('order_index').defaultTo(0);
      table.timestamps(true, true);
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    });
    console.log('Created kanban_nested_subtasks table');
  }

  // Create kanban_labels table
  const labelsExists = await knex.schema.hasTable('kanban_labels');
  if (!labelsExists) {
    await knex.schema.createTable('kanban_labels', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('name', 100).notNullable();
      table.string('color', 7).notNullable();
      table.timestamps(true, true);
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.unique(['user_id', 'name']);
    });
    console.log('Created kanban_labels table');
  }

  // Create kanban_epics table
  const epicsExists = await knex.schema.hasTable('kanban_epics');
  if (!epicsExists) {
    await knex.schema.createTable('kanban_epics', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('name', 255).notNullable();
      table.string('color', 7).defaultTo('#3498db');
      table.timestamps(true, true);
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.unique(['user_id', 'name']);
    });
    console.log('Created kanban_epics table');
  }

  // Create kanban_task_assignments table
  const assignmentsExists = await knex.schema.hasTable('kanban_task_assignments');
  if (!assignmentsExists) {
    await knex.schema.createTable('kanban_task_assignments', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('task_id', 100).notNullable();
      table.string('column_id', 50).notNullable();
      table.integer('order_index').defaultTo(0);
      table.timestamps(true, true);
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    });
    console.log('Created kanban_task_assignments table');
  }

  // Create kanban_tasks_new table (unlimited nesting)
  const tasksNewExists = await knex.schema.hasTable('kanban_tasks_new');
  if (!tasksNewExists) {
    await knex.schema.createTable('kanban_tasks_new', function(table) {
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
    console.log('Created kanban_tasks_new table');
  }

  console.log('All kanban tables created successfully!');
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
