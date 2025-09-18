-- Create kanban tables directly in production
-- Run this if migrations fail

-- Create kanban_columns table
CREATE TABLE IF NOT EXISTS kanban_columns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  column_id VARCHAR(50) NOT NULL,
  title VARCHAR(100) NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, column_id)
);

-- Create kanban_tasks table
CREATE TABLE IF NOT EXISTS kanban_tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'По плану',
  labels TEXT DEFAULT '[]',
  epic VARCHAR(255) DEFAULT '',
  parent_task VARCHAR(255) DEFAULT '',
  due_date VARCHAR(50) DEFAULT '',
  created_at_date VARCHAR(50) DEFAULT '',
  subtasks_expanded BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

-- Create kanban_subtasks table (without foreign key constraint)
CREATE TABLE IF NOT EXISTS kanban_subtasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id VARCHAR(100) NOT NULL,
  subtask_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  completed BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create kanban_nested_subtasks table
CREATE TABLE IF NOT EXISTS kanban_nested_subtasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subtask_id VARCHAR(100) NOT NULL,
  nested_subtask_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  completed BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create kanban_labels table
CREATE TABLE IF NOT EXISTS kanban_labels (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create kanban_epics table
CREATE TABLE IF NOT EXISTS kanban_epics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#3498db',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create kanban_task_assignments table
CREATE TABLE IF NOT EXISTS kanban_task_assignments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id VARCHAR(100) NOT NULL,
  column_id VARCHAR(50) NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create kanban_tasks_new table (unlimited nesting)
CREATE TABLE IF NOT EXISTS kanban_tasks_new (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  task_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'По плану',
  labels TEXT DEFAULT '[]',
  epic VARCHAR(255) DEFAULT '',
  parent_id VARCHAR(100),
  due_date VARCHAR(50) DEFAULT '',
  created_at_date VARCHAR(50) DEFAULT '',
  subtasks_expanded BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false,
  task_type VARCHAR(50) DEFAULT 'task',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_new_user_id ON kanban_tasks_new(user_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_new_parent_id ON kanban_tasks_new(parent_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_new_user_parent ON kanban_tasks_new(user_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_new_user_type ON kanban_tasks_new(user_id, task_type);

-- Insert a record into knex_migrations to mark migration as completed
INSERT INTO knex_migrations (name, batch, migration_time) 
VALUES ('012_skip_broken_migration.js', 1, NOW())
ON CONFLICT (name) DO NOTHING;
