const fs = require('fs');
const path = require('path');

exports.seed = async function(knex) {
  // Clear existing data
  await knex('daily_lists').del();
  await knex('daily_entries').del();
  await knex('checklist_items').del();

  // Migrate checklist data
  try {
    const checklistData = JSON.parse(fs.readFileSync('check_list.json', 'utf8'));
    const checklistItems = checklistData.map((item, index) => ({
      content: item,
      order_index: index
    }));
    await knex('checklist_items').insert(checklistItems);
    console.log('Migrated checklist items');
  } catch (error) {
    console.log('No checklist file found or error reading it:', error.message);
  }

  // Migrate daily data
  const dataDir = path.join(__dirname, '..', 'data');
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
    
    for (const file of files) {
      try {
        const filePath = path.join(dataDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const date = file.replace('.json', '');
        
        // Insert daily entry
        const [dailyEntry] = await knex('daily_entries').insert({
          entry_date: date,
          table_content: data.content?.table || ''
        }).returning('id');
        
        const dailyEntryId = dailyEntry.id || dailyEntry;
        
        // Insert list items
        const lists = data.content?.lists || {};
        const listItems = [];
        
        ['priorities', 'todo', 'memento'].forEach(listType => {
          if (lists[listType]) {
            lists[listType].forEach((item, index) => {
              listItems.push({
                daily_entry_id: dailyEntryId,
                list_type: listType,
                content: item.content || '',
                checked: item.checked || false,
                order_index: index
              });
            });
          }
        });
        
        if (listItems.length > 0) {
          await knex('daily_lists').insert(listItems);
        }
        
        console.log(`Migrated data for ${date}`);
      } catch (error) {
        console.log(`Error migrating ${file}:`, error.message);
      }
    }
  }
}; 