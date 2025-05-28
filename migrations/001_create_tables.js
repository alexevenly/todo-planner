exports.up = function(knex) {
  return knex.schema
    .createTable('checklist_items', function(table) {
      table.increments('id').primary();
      table.text('content').notNullable();
      table.integer('order_index').defaultTo(0);
      table.timestamps(true, true);
    })
    .createTable('daily_entries', function(table) {
      table.increments('id').primary();
      table.date('entry_date').notNullable().unique();
      table.text('table_content').defaultTo('');
      table.timestamps(true, true);
    })
    .createTable('daily_lists', function(table) {
      table.increments('id').primary();
      table.integer('daily_entry_id').unsigned().references('id').inTable('daily_entries').onDelete('CASCADE');
      table.enum('list_type', ['priorities', 'todo', 'memento']).notNullable();
      table.text('content').notNullable();
      table.boolean('checked').defaultTo(false);
      table.integer('order_index').defaultTo(0);
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('daily_lists')
    .dropTableIfExists('daily_entries')
    .dropTableIfExists('checklist_items');
}; 