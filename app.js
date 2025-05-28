require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');
const KnexSessionStore = require('connect-session-knex')(session);
const knex = require('knex');
const knexConfig = require('./knexfile');
const auth = require('./auth');

const app = express();
const port = process.env.PORT || 3000;
const environment = process.env.NODE_ENV || 'development';

// Initialize database
const db = knex(knexConfig[environment]);

// Session store
const store = new KnexSessionStore({
  knex: db,
  tablename: 'sessions'
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com", "data:"],
      scriptSrcAttr: ["'unsafe-inline'"],
    },
  },
}));
app.use(compression());
app.use(cors({
  credentials: true,
  origin: process.env.NODE_ENV === 'production' ? false : true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  store: store,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Add user to request
app.use(auth.addUserToRequest(db));

// Serve static files (login/register pages should be accessible without auth)
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Routes

// Register
app.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password, first_name, last_name } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (!auth.isValidUsername(username)) {
      return res.status(400).json({ error: 'Username must be 3-30 characters and contain only letters, numbers, and underscores' });
    }

    if (!auth.isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await db('users')
      .where('username', username)
      .orWhere('email', email)
      .first();

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Username already exists' });
      } else {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // Hash password and create user
    const passwordHash = await auth.hashPassword(password);
    
    const [userId] = await db('users').insert({
      username,
      email,
      password_hash: passwordHash,
      first_name: first_name || null,
      last_name: last_name || null
    }).returning('id');

    res.status(201).json({ 
      message: 'User created successfully',
      userId: userId.id || userId
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username or email
    const user = await db('users')
      .where('username', username)
      .orWhere('email', username)
      .first();

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    // Verify password
    const isValidPassword = await auth.verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await db('users').where('id', user.id).update({
      last_login: new Date()
    });

    // Create session
    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ 
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});

// Get current user
app.get('/auth/user', auth.requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Protected Routes (require authentication)

// Get all available dates
app.get('/dates', auth.requireAuth, async (req, res) => {
  try {
    const dates = await db('daily_entries')
      .select('entry_date')
      .where('user_id', req.user.id)
      .orderBy('entry_date', 'desc');
    const dateStrings = dates.map(row => {
      // Handle both Date objects (PostgreSQL) and strings (SQLite)
      if (row.entry_date instanceof Date) {
        return row.entry_date.toISOString().split('T')[0];
      } else {
        return row.entry_date; // Already a string in SQLite
      }
    });
    res.json(dateStrings);
  } catch (error) {
    console.error('Error fetching dates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get history for a specific date
app.get('/getHistory', auth.requireAuth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    // For now, return empty array as the original implementation seems incomplete
    res.json([]);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get checklist items
app.get('/checklist', auth.requireAuth, async (req, res) => {
  try {
    const items = await db('checklist_items')
      .select('*')
      .where('user_id', req.user.id)
      .orderBy('order_index');
    const checklist = items.map(item => item.content);
    res.json(checklist);
  } catch (error) {
    console.error('Error fetching checklist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update checklist
app.post('/checklist', auth.requireAuth, async (req, res) => {
  try {
    const checklist = req.body;
    
    // Clear existing checklist for this user
    await db('checklist_items').where('user_id', req.user.id).del();
    
    // Insert new checklist items
    if (checklist && checklist.length > 0) {
      const items = checklist.map((content, index) => ({
        content,
        order_index: index,
        user_id: req.user.id
      }));
      await db('checklist_items').insert(items);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating checklist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get daily data
app.get('/data/:date', auth.requireAuth, async (req, res) => {
  try {
    const { date } = req.params;
    
    // Get daily entry for this user
    const dailyEntry = await db('daily_entries')
      .where('entry_date', date)
      .where('user_id', req.user.id)
      .first();
    
    if (!dailyEntry) {
      return res.json({
        name: `${date}.json`,
        content: {
          lists: { priorities: [], todo: [], memento: [] },
          table: ''
        }
      });
    }
    
    // Get list items
    const listItems = await db('daily_lists')
      .where('daily_entry_id', dailyEntry.id)
      .orderBy('order_index');
    
    // Group by list type
    const lists = { priorities: [], todo: [], memento: [] };
    listItems.forEach(item => {
      lists[item.list_type].push({
        content: item.content,
        checked: item.checked
      });
    });
    
    res.json({
      name: `${date}.json`,
      content: {
        lists,
        table: dailyEntry.table_content || ''
      }
    });
  } catch (error) {
    console.error('Error fetching daily data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save daily data
app.post('/save', auth.requireAuth, async (req, res) => {
  try {
    const data = req.body;
    const date = data.name.replace('.json', '');
    
    // Start transaction
    await db.transaction(async (trx) => {
      // Upsert daily entry for this user
      const existingEntry = await trx('daily_entries')
        .where('entry_date', date)
        .where('user_id', req.user.id)
        .first();
      
      let dailyEntryId;
      if (existingEntry) {
        await trx('daily_entries')
          .where('entry_date', date)
          .where('user_id', req.user.id)
          .update({
            table_content: data.content?.table || '',
            updated_at: new Date()
          });
        dailyEntryId = existingEntry.id;
      } else {
        const [newEntry] = await trx('daily_entries').insert({
          entry_date: date,
          table_content: data.content?.table || '',
          user_id: req.user.id
        }).returning('id');
        dailyEntryId = newEntry.id || newEntry;
      }
      
      // Delete existing list items
      await trx('daily_lists').where('daily_entry_id', dailyEntryId).del();
      
      // Insert new list items
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
        await trx('daily_lists').insert(listItems);
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving daily data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve HTML pages with authentication
app.get('/', auth.requireAuthRedirect, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/template.html', auth.requireAuthRedirect, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'template.html'));
});

// Public routes (no auth required)
app.get('/login.html', (req, res) => {
  // Redirect to main page if already logged in
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register.html', (req, res) => {
  // Redirect to main page if already logged in
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${environment}`);
}); 