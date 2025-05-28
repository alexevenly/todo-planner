exports.up = function(knex) {
  return knex.schema
    .createTable('users', function(table) {
      table.increments('id').primary();
      table.string('username').notNullable().unique();
      table.string('email').notNullable().unique();
      table.string('password_hash').notNullable();
      table.string('first_name');
      table.string('last_name');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('last_login');
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('users');
}; 