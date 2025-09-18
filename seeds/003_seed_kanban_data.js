const fs = require('fs');
const path = require('path');

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('kanban_task_assignments').del();
  await knex('kanban_nested_subtasks').del();
  await knex('kanban_subtasks').del();
  await knex('kanban_tasks').del();
  await knex('kanban_columns').del();
  await knex('kanban_labels').del();
  await knex('kanban_epics').del();

  // Get the specific user ptaha-ha-ha@rambler.ru
  const user = await knex('users').where('email', 'ptaha-ha-ha@rambler.ru').first();
  if (!user) {
    console.log('User ptaha-ha-ha@rambler.ru not found, skipping kanban data seeding');
    return;
  }

  const userId = user.id;

  // Parse CSV data
  const csvPath = path.join(__dirname, '../asana_data/Дела.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

  // Parse CSV with multiline support
  const records = parseCSVWithMultiline(lines);
  console.log(`Parsed ${records.length} records from CSV`);

  // Create default columns
  const columns = [
    { user_id: userId, column_id: 'todo', title: 'To Do', order_index: 0 },
    { user_id: userId, column_id: 'in-progress', title: 'In Progress', order_index: 1 },
    { user_id: userId, column_id: 'done', title: 'Done', order_index: 2 }
  ];
  await knex('kanban_columns').insert(columns);

  // Process tasks
  const tasks = [];
  const subtasks = [];
  const nestedSubtasks = [];
  const taskAssignments = [];

  for (let i = 1; i < records.length; i++) {
    const record = records[i].trim();
    if (!record) continue;

    const values = parseCSVLine(record);
    if (values.length < headers.length) continue;

    const taskId = 'task-' + Date.now() + '-' + i;
    const title = values[4] || 'Untitled Task';
    const parentTask = values[13] || '';
    const status = values[17] || 'По плану';
    const priority = mapPriority(values[16]);
    const description = values[11] || '';
    const dueDate = values[9] || '';
    const createdAt = values[1] || new Date().toISOString();

    // Determine column based on status
    let columnId = 'todo';
    if (status === 'Отстаёт') {
      columnId = 'in-progress';
    } else if (status === 'Готово' || status === 'Done') {
      columnId = 'done';
    }

    const task = {
      user_id: userId,
      task_id: taskId,
      title: title,
      description: description,
      priority: priority,
      status: status,
      labels: JSON.stringify([]),
      epic: values[12] || '',
      parent_task: parentTask,
      due_date: dueDate,
      created_at_date: createdAt,
      subtasks_expanded: true
    };

    tasks.push(task);
    taskAssignments.push({
      user_id: userId,
      task_id: taskId,
      column_id: columnId,
      order_index: tasks.length - 1
    });
  }

  // Insert tasks
  await knex('kanban_tasks').insert(tasks);

  // Create task map for easier lookup
  const taskMap = new Map();
  tasks.forEach(task => {
    taskMap.set(task.title, task);
  });

  // Process subtasks (second pass)
  for (let i = 1; i < records.length; i++) {
    const record = records[i].trim();
    if (!record) continue;

    const values = parseCSVLine(record);
    if (values.length < headers.length) continue;

    const title = values[4] || 'Untitled Task';
    const parentTask = values[13] || '';
    const status = values[17] || 'По плану';

    if (parentTask && parentTask.trim()) {
      // Find parent task
      const parentTaskRecord = taskMap.get(parentTask.trim());
      if (parentTaskRecord) {
        const subtaskId = 'subtask-' + Date.now() + '-' + i;
        subtasks.push({
          user_id: userId,
          task_id: parentTaskRecord.task_id,
          subtask_id: subtaskId,
          title: title,
          completed: status === 'Готово' || status === 'Done',
          order_index: subtasks.length
        });
      }
    }
  }

  // Insert subtasks
  if (subtasks.length > 0) {
    await knex('kanban_subtasks').insert(subtasks);
  }

  // Process nested subtasks (third pass)
  // Create a map of subtasks by their title for easier lookup
  const subtaskMap = new Map();
  subtasks.forEach(subtask => {
    subtaskMap.set(subtask.title, subtask);
  });

  // First, identify which subtasks have their own subtasks
  const subtasksWithSubtasks = new Set();
  for (let i = 1; i < records.length; i++) {
    const record = records[i].trim();
    if (!record) continue;

    const values = parseCSVLine(record);
    if (values.length < headers.length) continue;

    const title = values[4] || 'Untitled Task';
    const parentTask = values[13] || '';

    if (parentTask && parentTask.trim()) {
      // Check if parentTask is a subtask
      const parentSubtask = subtaskMap.get(parentTask.trim());
      if (parentSubtask) {
        subtasksWithSubtasks.add(parentTask.trim());
      }
    }
  }

  // Now process nested subtasks
  for (let i = 1; i < records.length; i++) {
    const record = records[i].trim();
    if (!record) continue;

    const values = parseCSVLine(record);
    if (values.length < headers.length) continue;

    const title = values[4] || 'Untitled Task';
    const parentTask = values[13] || '';
    const status = values[17] || 'По плану';

    if (parentTask && parentTask.trim()) {
      // Check if parentTask is a subtask (nested subtask)
      const parentSubtask = subtaskMap.get(parentTask.trim());
      if (parentSubtask) {
        // This is a nested subtask
        const nestedSubtaskId = 'nested-subtask-' + Date.now() + '-' + i;
        nestedSubtasks.push({
          user_id: userId,
          subtask_id: parentSubtask.subtask_id,
          nested_subtask_id: nestedSubtaskId,
          title: title,
          completed: status === 'Готово' || status === 'Done',
          order_index: nestedSubtasks.length
        });
        console.log(`Found nested subtask: ${title} -> parent subtask: ${parentTask}`);
      } else {
        // Check if parentTask is a main task (this should have been handled in second pass)
        const parentTaskRecord = taskMap.get(parentTask.trim());
        if (parentTaskRecord) {
          console.log(`Skipping direct subtask: ${title} -> parent task: ${parentTask} (already handled)`);
        } else {
          console.log(`Could not find parent for: ${title} -> parent: ${parentTask}`);
        }
      }
    }
  }

  // Insert nested subtasks
  if (nestedSubtasks.length > 0) {
    await knex('kanban_nested_subtasks').insert(nestedSubtasks);
  }

  // Insert task assignments
  await knex('kanban_task_assignments').insert(taskAssignments);

  console.log(`Seeded ${tasks.length} tasks, ${subtasks.length} subtasks, ${nestedSubtasks.length} nested subtasks for user ${userId}`);
};

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

function parseCSVWithMultiline(lines) {
  const records = [];
  let currentRecord = '';
  let inQuotes = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if we're starting a new record (not in quotes)
    if (!inQuotes && currentRecord === '') {
      currentRecord = line;
    } else {
      currentRecord += '\n' + line;
    }
    
    // Count quotes to determine if we're still in a quoted field
    let quoteCount = 0;
    for (let j = 0; j < line.length; j++) {
      if (line[j] === '"') quoteCount++;
    }
    
    // If we have an even number of quotes, we're not in a quoted field
    if (quoteCount % 2 === 0) {
      inQuotes = false;
    } else {
      inQuotes = true;
    }
    
    // If we're not in quotes, we can process this record
    if (!inQuotes) {
      records.push(currentRecord);
      currentRecord = '';
    }
  }
  
  // Add the last record if there's one
  if (currentRecord.trim()) {
    records.push(currentRecord);
  }
  
  return records;
}

function mapPriority(priority) {
  const priorityMap = {
    'Высокий': 'high',
    'Средний': 'medium',
    'Низкий': 'low'
  };
  return priorityMap[priority] || 'medium';
}
