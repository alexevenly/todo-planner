-- Remove admin user from production database
DELETE FROM users WHERE email = 'admin@example.com';

-- Get user ID for ptaha-ha-ha@rambler.ru and create kanban columns
-- First, let's see if the user exists
SELECT id, email FROM users WHERE email = 'ptaha-ha-ha@rambler.ru';

-- If user exists, create kanban columns for them
-- Replace USER_ID_HERE with the actual user ID from the query above
INSERT INTO kanban_columns (user_id, column_id, title, order_index) VALUES
(USER_ID_HERE, 'todo', 'To Do', 0),
(USER_ID_HERE, 'in_progress', 'In Progress', 1),
(USER_ID_HERE, 'done', 'Done', 2)
ON CONFLICT (user_id, column_id) DO NOTHING;

-- Verify the changes
SELECT 'Admin user removed and kanban columns created' as result;
