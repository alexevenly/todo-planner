exports.up = function(knex) {
  return knex.schema
    .createTable('calendar_colors', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('color', 7).notNullable(); // Hex color code
      table.string('description', 255).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.unique(['user_id', 'color']); // Prevent duplicate colors per user
    })
    .createTable('calendar_dates', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.date('date').notNullable();
      table.integer('color_id').unsigned().notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('color_id').references('id').inTable('calendar_colors').onDelete('CASCADE');
      table.unique(['user_id', 'date']); // One color per date per user
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('calendar_dates')
    .dropTable('calendar_colors');
};
