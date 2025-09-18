const fs = require('fs');
const path = require('path');

// CSV parser for Node.js environment
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

exports.seed = async function(knex) {
  // Get the first user
  // Get the specific user ptaha-ha-ha@rambler.ru
  const users = await knex('users').select('*').where('email', 'ptaha-ha-ha@rambler.ru');
  if (users.length === 0) {
    console.log('User ptaha-ha-ha@rambler.ru not found, skipping kanban data seeding');
    return;
  }
  
  const userId = users[0].id;
  console.log(`Seeding unlimited nesting kanban data for user ${userId} (ptaha-ha-ha@rambler.ru)`);

  // Clear existing data
  await knex('kanban_tasks_new').where('user_id', userId).del();
  await knex('kanban_columns').where('user_id', userId).del();

  // Read CSV data
  const csvPath = path.join(__dirname, '../asana_data/Дела.csv');
  if (!fs.existsSync(csvPath)) {
    console.log('CSV file not found, skipping kanban data seeding');
    return;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    console.log('CSV file is empty, skipping kanban data seeding');
    return;
  }

  const headers = parseCSVLine(lines[0]);
  
  console.log('Headers:', headers);
  console.log(`Found ${lines.length - 1} records`);

  // Parse CSV records - handle multi-line records
  const records = [];
  let currentRecord = '';
  let inQuotes = false;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if we're in a quoted field that spans multiple lines
    for (let j = 0; j < line.length; j++) {
      if (line[j] === '"') {
        inQuotes = !inQuotes;
      }
    }
    
    if (currentRecord) {
      currentRecord += '\n' + line;
    } else {
      currentRecord = line;
    }
    
    // If we're not in quotes, we have a complete record
    if (!inQuotes) {
      const values = parseCSVLine(currentRecord);
      if (values.length >= headers.length) {
        records.push(values);
      }
      currentRecord = '';
    }
  }

  console.log(`Parsed ${records.length} records from CSV`);
  
  // Debug: Check if ВНЖ Испании is in the records
  const vnzhRecord = records.find(record => record[4] && record[4].includes('ВНЖ Испании'));
  if (vnzhRecord) {
    console.log('Found ВНЖ Испании record:', vnzhRecord[4]);
  } else {
    console.log('ВНЖ Испании not found in records');
    // Let's see what records we do have
    console.log('First few record titles:', records.slice(0, 5).map(r => r[4]));
  }

  // Create task map for parent-child relationships
  const taskMap = new Map();
  const tasks = [];

  // First pass: create all tasks
  for (let i = 0; i < records.length; i++) {
    const values = records[i];
    const title = values[4] || 'Untitled Task';
    const parentTask = values[13] || '';
    const status = values[17] || 'По плану';
    
    const taskId = `task-${Date.now()}-${i}`;
    // A task is a main task if it has no parent OR if it's explicitly a main task
    const taskType = parentTask ? 'subtask' : 'task';
    
    // Debug logging for main tasks
    if (title === 'ВНЖ Испании') {
      console.log(`Processing ВНЖ Испании as main task`);
    }
    
    const task = {
      user_id: userId,
      task_id: taskId,
      title: title,
      description: '',
      priority: 'medium',
      status: status,
      labels: '[]',
      epic: '',
      parent_id: null, // Will be set in second pass
      due_date: '',
      created_at_date: new Date().toISOString().split('T')[0],
      subtasks_expanded: false,
      completed: status === 'Готово' || status === 'Done',
      task_type: taskType,
      order_index: i
    };
    
    tasks.push(task);
    taskMap.set(title.trim(), task);
  }

  // Second pass: establish parent-child relationships
  for (let i = 0; i < records.length; i++) {
    const values = records[i];
    const title = values[4] || 'Untitled Task';
    const parentTask = values[13] || '';
    
    if (parentTask && parentTask.trim()) {
      const parent = taskMap.get(parentTask.trim());
      if (parent) {
        const currentTask = taskMap.get(title.trim());
        if (currentTask) {
          currentTask.parent_id = parent.task_id;
          currentTask.task_type = 'subtask';
        }
      } else {
        console.log(`Could not find parent for: ${title} -> parent: ${parentTask}`);
      }
    }
  }

  // Insert tasks into database
  if (tasks.length > 0) {
    await knex('kanban_tasks_new').insert(tasks);
    console.log(`Inserted ${tasks.length} tasks with unlimited nesting`);
  }

  // Don't create columns automatically - let the user create them manually
  console.log('Skipping automatic column creation - user will create columns manually');

  console.log('Seeded unlimited nesting kanban data successfully');
};

