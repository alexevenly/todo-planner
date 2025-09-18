exports.up = function(knex) {
  return knex.schema.createTableIfNotExists('kanban_tasks_new', function(table) {
    table.increments('id').primary();
    table.integer('user_id').notNullable();
    table.string('task_id').notNullable(); // External ID for frontend
    table.string('title').notNullable();
    table.text('description');
    table.string('priority').defaultTo('medium');
    table.string('status').defaultTo('По плану');
    table.text('labels').defaultTo('[]'); // JSON string
    table.string('epic').defaultTo('');
    table.string('parent_id').nullable(); // References task_id of parent task
    table.string('due_date').defaultTo('');
    table.string('created_at_date').defaultTo('');
    table.boolean('subtasks_expanded').defaultTo(false);
    table.boolean('completed').defaultTo(false);
    table.string('task_type').defaultTo('task'); // 'task' or 'subtask'
    table.integer('order_index').defaultTo(0);
    table.timestamps(true, true);
    
    // Indexes for performance
    table.index(['user_id']);
    table.index(['parent_id']);
    table.index(['user_id', 'parent_id']);
    table.index(['user_id', 'task_type']);
    
    // Unique constraint on user_id + task_id
    table.unique(['user_id', 'task_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('kanban_tasks_new');
};
