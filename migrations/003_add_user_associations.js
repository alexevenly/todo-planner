exports.up = function(knex) {
  return knex.schema
    .alterTable('checklist_items', function(table) {
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.index('user_id');
    })
    .alterTable('daily_entries', function(table) {
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.index('user_id');
      table.dropUnique(['entry_date']);
      table.unique(['entry_date', 'user_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('daily_entries', function(table) {
      table.dropUnique(['entry_date', 'user_id']);
      table.dropIndex(['user_id']);
      table.dropColumn('user_id');
      table.unique(['entry_date']);
    })
    .alterTable('checklist_items', function(table) {
      table.dropIndex(['user_id']);
      table.dropColumn('user_id');
    });
}; 