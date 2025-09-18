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
const cookieSignature = require('cookie-signature');

const app = express();
const port = process.env.PORT || 3000;
const environment = process.env.NODE_ENV || 'development';

// Initialize database
const db = knex(knexConfig[environment]);

console.log('=== DATABASE CONFIG ===');
console.log('Environment:', environment);
console.log('Database client:', knexConfig[environment].client);
console.log('Database connection:', knexConfig[environment].connection);
console.log('Database URL exists:', !!process.env.DATABASE_URL);

// Session store
const store = new KnexSessionStore({
  knex: db,
  tablename: 'sessions'
});

console.log('=== SESSION STORE CONFIG ===');
console.log('Session store initialized with table: sessions');
console.log('Session store database client:', db.client.config.client);

// Add session store event listeners for debugging
store.on('connect', () => {
  console.log('✅ Session store connected');
});

store.on('disconnect', () => {
  console.log('❌ Session store disconnected');
});

// Override the get method to add debugging
const originalGet = store.get.bind(store);
store.get = function(sid, callback) {
  console.log('🔍 Session store GET called for SID:', sid);
  return originalGet(sid, (err, session) => {
    if (err) {
      console.log('❌ Session store GET error:', err);
    } else if (session) {
      console.log('✅ Session store GET found session:', { userId: session.userId, username: session.username });
    } else {
      console.log('❌ Session store GET - no session found for SID:', sid);
    }
    callback(err, session);
  });
};

// Override the set method to add debugging
const originalSet = store.set.bind(store);
store.set = function(sid, session, callback) {
  console.log('💾 Session store SET called for SID:', sid, 'with data:', { userId: session.userId, username: session.username });
  return originalSet(sid, session, callback);
};

// Override the destroy method to add debugging
const originalDestroy = store.destroy.bind(store);
store.destroy = function(sid, callback) {
  console.log('🗑️ Session store DESTROY called for SID:', sid);
  return originalDestroy(sid, callback);
};

// Override the touch method to add debugging
const originalTouch = store.touch.bind(store);
store.touch = function(sid, session, callback) {
  console.log('👆 Session store TOUCH called for SID:', sid);
  return originalTouch(sid, session, callback);
};

// Test session store connection
store.ready = store.ready || Promise.resolve();
store.ready.then(() => {
  console.log('✅ Session store ready');
}).catch((err) => {
  console.error('❌ Session store error:', err);
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
  origin: process.env.NODE_ENV === 'production' ? 
    (process.env.FRONTEND_URL || true) : // Allow configured frontend URL or same origin in production
    true // Allow all origins in development
}));

console.log('=== CORS CONFIG ===');
console.log('Environment:', process.env.NODE_ENV);
console.log('CORS origin setting:', process.env.NODE_ENV === 'production' ? 
  (process.env.FRONTEND_URL || true) : true);
console.log('CORS credentials:', true);
console.log('Frontend URL env var:', process.env.FRONTEND_URL);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (simplified)
app.use((req, res, next) => {
  // Only log important requests, not static files
  if (!req.url.includes('.css') && !req.url.includes('.js') && !req.url.includes('.ico')) {
    console.log(`\n=== ${req.method} ${req.url} ===`);
    console.log('Session cookie found:', !!req.headers.cookie?.includes('connect.sid'));
    if (req.headers.cookie?.includes('connect.sid')) {
      const sessionCookie = req.headers.cookie
        .split(';')
        .find(cookie => cookie.trim().startsWith('connect.sid='));
      console.log('Session cookie:', sessionCookie?.trim().substring(0, 50) + '...');
    }
  }
  next();
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  store: store,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Allow cross-site cookies in production
  },
  // Add debugging for session middleware
  genid: function(req) {
    const newId = require('crypto').randomBytes(16).toString('base64').replace(/[+/=]/g, '');
    console.log('🆔 Session middleware generating new ID:', newId);
    return newId;
  }
}));

// Middleware to clear invalid unsigned session cookies
app.use((req, res, next) => {
  if (req.headers.cookie && req.headers.cookie.includes('connect.sid=')) {
    const cookies = req.headers.cookie.split(';');
    const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('connect.sid='));
    
    if (sessionCookie) {
      const cookieValue = sessionCookie.split('=')[1];
      try {
        const decodedValue = decodeURIComponent(cookieValue);
        
        // Check if it's a signed cookie that lacks a signature
        if (decodedValue.startsWith('s:') && !decodedValue.includes('.')) {
          console.log('🧹 Clearing invalid unsigned session cookie:', decodedValue);
          res.clearCookie('connect.sid', {
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
          });
        }
      } catch (e) {
        console.log('Error checking session cookie:', e.message);
      }
    }
  }
  next();
});

// Debug middleware to track session creation vs loading
app.use((req, res, next) => {
  if (req.session && req.url !== '/favicon.ico' && !req.url.includes('.css') && !req.url.includes('.js')) {
    const isNewSession = req.session.isNew;
    console.log('📋 Session middleware result:', {
      isNew: isNewSession,
      sessionId: req.session.id,
      hasUserId: !!req.session.userId,
      cookieSessionId: req.headers.cookie?.includes('connect.sid=') ? 
        req.headers.cookie.split('connect.sid=')[1]?.split(';')[0]?.replace('s%3A', '') : 'none'
    });
    
    // Additional debugging for session cookie parsing
    if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(';');
      const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('connect.sid='));
      if (sessionCookie) {
        const cookieValue = sessionCookie.split('=')[1];
        console.log('Raw session cookie value:', cookieValue);
        
        // Decode the session ID from the cookie
        try {
          const decodedValue = decodeURIComponent(cookieValue);
          console.log('Decoded session cookie:', decodedValue);
          
          // Extract the actual session ID (remove 's:' prefix and signature)
          if (decodedValue.startsWith('s:')) {
            const sessionIdWithSig = decodedValue.substring(2);
            const sessionId = sessionIdWithSig.split('.')[0];
            console.log('Extracted session ID from cookie:', sessionId);
            console.log('Current session ID from middleware:', req.session.id);
            console.log('Session IDs match:', sessionId === req.session.id);
            console.log('Full cookie with signature:', sessionIdWithSig);
            console.log('Has signature (contains dot):', sessionIdWithSig.includes('.'));
          }
        } catch (e) {
          console.log('Error decoding session cookie:', e.message);
        }
      }
    }
  }
  next();
});

console.log('=== SESSION CONFIG ===');
console.log('Environment:', process.env.NODE_ENV);
console.log('Cookie secure:', process.env.NODE_ENV === 'production');
console.log('Cookie sameSite:', process.env.NODE_ENV === 'production' ? 'none' : 'lax');
console.log('Session secret exists:', !!(process.env.SESSION_SECRET || 'your-secret-key-change-in-production'));

// Add user to request
app.use(auth.addUserToRequest(db));

// Serve static files (login/register pages should be accessible without auth)
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Routes

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    console.log('=== HEALTH CHECK ===');
    
    // Test database connection
    await db.raw('SELECT 1');
    console.log('✅ Database connection OK');
    
    // Check session store
    const sessionCount = await db('sessions').count('* as count').first();
    console.log('Active sessions:', sessionCount.count);
    
    // Check users table
    const userCount = await db('users').count('* as count').first();
    console.log('Total users:', userCount.count);
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: 'connected',
      sessions: sessionCount.count,
      users: userCount.count
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Session test endpoint (no auth required)
app.get('/test-session', (req, res) => {
  console.log('=== SESSION TEST ===');
  console.log('Session exists:', !!req.session);
  console.log('Session ID:', req.session?.id);
  console.log('Session userId:', req.session?.userId);
  console.log('Session data:', req.session);
  console.log('User object:', req.user);
  
  res.json({
    sessionExists: !!req.session,
    sessionId: req.session?.id,
    userId: req.session?.userId,
    userObject: req.user,
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check session store
app.get('/debug-sessions', async (req, res) => {
  try {
    console.log('=== SESSION STORE DEBUG ===');
    
    // Get all sessions from database
    const sessions = await db('sessions').select('*').limit(10);
    console.log('Sessions in database:', sessions.length);
    
    sessions.forEach((session, index) => {
      console.log(`Session ${index + 1}:`, {
        sid: session.sid,
        expired: session.expired,
        sess: typeof session.sess === 'string' ? JSON.parse(session.sess) : session.sess
      });
    });
    
    res.json({
      sessionCount: sessions.length,
      sessions: sessions.map(s => ({
        sid: s.sid,
        expired: s.expired,
        sess: typeof s.sess === 'string' ? JSON.parse(s.sess) : s.sess
      }))
    });
  } catch (error) {
    console.error('❌ Session store debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to manually test session store operations
app.get('/test-store', async (req, res) => {
  try {
    console.log('=== TESTING SESSION STORE OPERATIONS ===');
    
    const testSessionId = 'test-session-123';
    const testSessionData = {
      cookie: { maxAge: 86400000, httpOnly: true, secure: true },
      userId: 999,
      username: 'test-user'
    };
    
    // Test SET operation
    console.log('Testing store.set...');
    await new Promise((resolve, reject) => {
      store.set(testSessionId, testSessionData, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ store.set successful');
    
    // Test GET operation
    console.log('Testing store.get...');
    const retrievedSession = await new Promise((resolve, reject) => {
      store.get(testSessionId, (err, session) => {
        if (err) reject(err);
        else resolve(session);
      });
    });
    console.log('✅ store.get successful:', retrievedSession);
    
    // Test DESTROY operation
    console.log('Testing store.destroy...');
    await new Promise((resolve, reject) => {
      store.destroy(testSessionId, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ store.destroy successful');
    
    res.json({
      message: 'Session store test completed successfully',
      testData: testSessionData,
      retrievedData: retrievedSession
    });
  } catch (error) {
    console.error('❌ Session store test error:', error);
    res.status(500).json({ error: error.message });
  }
});

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
    console.log('=== LOGIN ATTEMPT ===');
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('❌ Missing username or password');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username or email
    console.log('Looking up user:', username);
    const user = await db('users')
      .where('username', username)
      .orWhere('email', username)
      .first();

    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ User found:', user.username);

    if (!user.is_active) {
      console.log('❌ User account is disabled:', user.id);
      return res.status(401).json({ error: 'Account is disabled' });
    }

    // Verify password
    const isValidPassword = await auth.verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', user.id);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ Password verified for user:', user.id);

    // Update last login
    await db('users').where('id', user.id).update({
      last_login: new Date()
    });

    // Create session
    console.log('Creating session...');
    
    // Set session data directly without regeneration first
    req.session.userId = user.id;
    req.session.username = user.username;
    
    console.log('Session ID before save:', req.session.id);
    console.log('Session data before save:', { userId: req.session.userId, username: req.session.username });

    // Explicitly save the session to ensure cookie is set
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({ error: 'Session save failed' });
      }
      
      console.log('✅ Session saved successfully');
      console.log('Session ID after save:', req.session.id);
      console.log('Session data saved:', { userId: req.session.userId, username: req.session.username });
      
      // Manually set the session cookie if needed
      const sessionCookieName = 'connect.sid';
      const sessionId = req.session.id;
      const signature = cookieSignature.sign(sessionId, process.env.SESSION_SECRET || 'your-secret-key-change-in-production');
      const signedSessionId = 's:' + signature;
      
      // Set cookie with proper options for production
      const cookieOptions = {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/'
      };
      
      console.log('Setting session cookie manually:', {
        name: sessionCookieName,
        value: signedSessionId.substring(0, 20) + '...',
        options: cookieOptions
      });
      
      res.cookie(sessionCookieName, signedSessionId, cookieOptions);
      
      const responseData = { 
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name
        }
      };
      
      console.log('✅ Login successful, sending response');
      res.json(responseData);
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
app.post('/auth/logout', (req, res) => {
  console.log('=== LOGOUT ATTEMPT ===');
  console.log('Session before logout:', req.session);
  console.log('Session ID:', req.session?.id);
  console.log('User ID:', req.session?.userId);
  
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ error: 'Could not log out' });
    }
    console.log('✅ Session destroyed successfully');
    res.clearCookie('connect.sid');
    console.log('✅ Cookie cleared');
    res.json({ message: 'Logout successful' });
  });
});

// Get current user
app.get('/auth/user', auth.requireAuth, (req, res) => {
  console.log('=== /auth/user ENDPOINT ===');
  console.log('Session exists:', !!req.session);
  console.log('Session userId:', req.session?.userId);
  console.log('User object:', req.user);
  
  if (!req.user) {
    console.log('❌ No user object found in request');
    return res.status(401).json({ error: 'User not found' });
  }
  
  console.log('✅ Returning user data:', req.user);
  res.json({ user: req.user });
});

// Calendar API endpoints

// Get all calendar colors for user
app.get('/api/calendar/colors', auth.requireAuth, async (req, res) => {
  try {
    const colors = await db('calendar_colors')
      .select('*')
      .where('user_id', req.user.id)
      .orderBy('created_at', 'asc');
    
    res.json(colors);
  } catch (error) {
    console.error('Error fetching calendar colors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new calendar color
app.post('/api/calendar/colors', auth.requireAuth, async (req, res) => {
  try {
    const { color, description } = req.body;
    
    if (!color || !description) {
      return res.status(400).json({ error: 'Color and description are required' });
    }
    
    // Validate hex color format
    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({ error: 'Invalid color format. Use hex format like #FF0000' });
    }
    
    // Check if color already exists for this user
    const existingColor = await db('calendar_colors')
      .where('user_id', req.user.id)
      .where('color', color)
      .first();
    
    if (existingColor) {
      return res.status(400).json({ error: 'Color already exists' });
    }
    
    const [newColor] = await db('calendar_colors')
      .insert({
        user_id: req.user.id,
        color,
        description
      })
      .returning('*');
    
    res.status(201).json(newColor);
  } catch (error) {
    console.error('Error adding calendar color:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update calendar color
app.put('/api/calendar/colors/:id', auth.requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { color, description } = req.body;
    
    if (!color || !description) {
      return res.status(400).json({ error: 'Color and description are required' });
    }
    
    // Validate hex color format
    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({ error: 'Invalid color format. Use hex format like #FF0000' });
    }
    
    // Check if color already exists for this user (excluding current record)
    const existingColor = await db('calendar_colors')
      .where('user_id', req.user.id)
      .where('color', color)
      .where('id', '!=', id)
      .first();
    
    if (existingColor) {
      return res.status(400).json({ error: 'Color already exists' });
    }
    
    const updatedColor = await db('calendar_colors')
      .where('id', id)
      .where('user_id', req.user.id)
      .update({
        color,
        description,
        updated_at: new Date()
      })
      .returning('*');
    
    if (updatedColor.length === 0) {
      return res.status(404).json({ error: 'Color not found' });
    }
    
    res.json(updatedColor[0]);
  } catch (error) {
    console.error('Error updating calendar color:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete calendar color
app.delete('/api/calendar/colors/:id', auth.requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // First, remove all date assignments for this color
    await db('calendar_dates')
      .where('color_id', id)
      .where('user_id', req.user.id)
      .del();
    
    // Then delete the color
    const deleted = await db('calendar_colors')
      .where('id', id)
      .where('user_id', req.user.id)
      .del();
    
    if (deleted === 0) {
      return res.status(404).json({ error: 'Color not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar color:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get calendar dates for a specific month
app.get('/api/calendar/dates', auth.requireAuth, async (req, res) => {
  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }
    
    // Get start and end dates for the month
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const dates = await db('calendar_dates')
      .select('calendar_dates.*', 'calendar_colors.color', 'calendar_colors.description')
      .join('calendar_colors', 'calendar_dates.color_id', 'calendar_colors.id')
      .where('calendar_dates.user_id', req.user.id)
      .whereBetween('calendar_dates.date', [startDate, endDate])
      .orderBy('calendar_dates.date', 'asc');
    
    res.json(dates);
  } catch (error) {
    console.error('Error fetching calendar dates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set color for a specific date
app.post('/api/calendar/dates', auth.requireAuth, async (req, res) => {
  try {
    const { date, color_id } = req.body;
    
    if (!date || !color_id) {
      return res.status(400).json({ error: 'Date and color_id are required' });
    }
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    // Check if color belongs to user
    const color = await db('calendar_colors')
      .where('id', color_id)
      .where('user_id', req.user.id)
      .first();
    
    if (!color) {
      return res.status(400).json({ error: 'Color not found' });
    }
    
    // Upsert the date assignment
    const existingDate = await db('calendar_dates')
      .where('user_id', req.user.id)
      .where('date', date)
      .first();
    
    if (existingDate) {
      const updated = await db('calendar_dates')
        .where('user_id', req.user.id)
        .where('date', date)
        .update({
          color_id,
          updated_at: new Date()
        })
        .returning('*');
      
      res.json(updated[0]);
    } else {
      const [newDate] = await db('calendar_dates')
        .insert({
          user_id: req.user.id,
          date,
          color_id
        })
        .returning('*');
      
      res.status(201).json(newDate);
    }
  } catch (error) {
    console.error('Error setting calendar date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove color from a specific date
app.delete('/api/calendar/dates/:date', auth.requireAuth, async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    const deleted = await db('calendar_dates')
      .where('user_id', req.user.id)
      .where('date', date)
      .del();
    
    if (deleted === 0) {
      return res.status(404).json({ error: 'Date not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing calendar date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Kanban API endpoints
// Get all kanban data for user
app.get('/api/kanban/data', auth.requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get columns
    const columns = await db('kanban_columns')
      .select('*')
      .where('user_id', userId)
      .orderBy('order_index');
    
    // Get all tasks using the new unlimited nesting structure
    const tasks = await db('kanban_tasks_new')
      .select('*')
      .where('user_id', userId)
      .orderBy('order_index', 'asc');
    
    // Get labels
    const labels = await db('kanban_labels')
      .select('*')
      .where('user_id', userId);
    
    // Get epics
    const epics = await db('kanban_epics')
      .select('*')
      .where('user_id', userId);
    
    // Get task assignments
    const assignments = await db('kanban_task_assignments')
      .select('*')
      .where('user_id', userId);

    // Build hierarchical structure
    const taskMap = new Map();
    const rootTasks = [];

    // First pass: create task objects
    tasks.forEach(task => {
      const taskObj = {
        id: task.task_id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        labels: JSON.parse(task.labels || '[]'),
        epic: task.epic,
        parentTask: task.parent_id,
        dueDate: task.due_date,
        createdAt: task.created_at_date,
        subtasks: [],
        subtasksExpanded: task.subtasks_expanded || false, // Collapsed by default
        completed: task.completed,
        taskType: task.task_type
      };
      taskMap.set(task.task_id, taskObj);
    });

    // Second pass: build hierarchy - only root tasks (no parent_id) should be in rootTasks
    tasks.forEach(task => {
      const taskObj = taskMap.get(task.task_id);
      if (task.parent_id) {
        const parent = taskMap.get(task.parent_id);
        if (parent) {
          parent.subtasks.push(taskObj);
        }
      } else {
        // Only add to rootTasks if it's a main task (task_type = 'task')
        if (task.task_type === 'task') {
          rootTasks.push(taskObj);
        }
      }
    });
    
    // Debug: Check if subtasks have subtasksExpanded property
    rootTasks.forEach(task => {
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach(subtask => {
          if (subtask.subtasks && subtask.subtasks.length > 0) {
            console.log(`Subtask "${subtask.title}" has subtasks, subtasksExpanded:`, subtask.subtasksExpanded);
          }
        });
      }
    });
    
    // Process columns to include task assignments
    const processedColumns = columns.map(column => {
      const columnTasks = assignments
        .filter(assignment => assignment.column_id === column.column_id)
        .sort((a, b) => a.order_index - b.order_index)
        .map(assignment => assignment.task_id);
      
      return {
        id: column.column_id,
        title: column.title,
        tasks: columnTasks
      };
    });
    
    res.json({
      columns: processedColumns,
      tasks: rootTasks,
      labels: labels.map(label => ({ name: label.name, color: label.color })),
      epics: epics.map(epic => ({ name: epic.name, color: epic.color }))
    });
  } catch (error) {
    console.error('Error fetching kanban data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save kanban data
app.post('/api/kanban/data', auth.requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { columns, tasks, labels, epics } = req.body;
    
    console.log('Received kanban data save request for user:', userId);
    console.log('Columns:', columns.length, 'Tasks:', tasks.length);
    
    // Start transaction
    await db.transaction(async (trx) => {
      // Clear existing data
      await trx('kanban_task_assignments').where('user_id', userId).del();
      await trx('kanban_tasks_new').where('user_id', userId).del();
      await trx('kanban_columns').where('user_id', userId).del();
      await trx('kanban_labels').where('user_id', userId).del();
      await trx('kanban_epics').where('user_id', userId).del();
      
      // Insert columns
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        await trx('kanban_columns').insert({
          user_id: userId,
          column_id: column.id,
          title: column.title,
          order_index: i
        });
      }
      
      // Recursive function to insert tasks and their subtasks
      const insertTaskRecursively = async (task, parentId = null, orderIndex = 0) => {
        const taskType = parentId ? 'subtask' : 'task';
        
        await trx('kanban_tasks_new').insert({
          user_id: userId,
          task_id: task.id,
          title: task.title,
          description: task.description || '',
          priority: task.priority || 'medium',
          status: task.status || 'По плану',
          labels: JSON.stringify(task.labels || []),
          epic: task.epic || '',
          parent_id: parentId,
          due_date: task.dueDate || '',
          created_at_date: task.createdAt || '',
          subtasks_expanded: task.subtasksExpanded || false,
          completed: task.completed || false,
          task_type: taskType,
          order_index: orderIndex
        });
        
        // Insert subtasks recursively
        if (task.subtasks && task.subtasks.length > 0) {
          for (let i = 0; i < task.subtasks.length; i++) {
            await insertTaskRecursively(task.subtasks[i], task.id, i);
          }
        }
      };
      
      // Insert all tasks recursively
      for (let i = 0; i < tasks.length; i++) {
        await insertTaskRecursively(tasks[i], null, i);
      }
      
      // Insert labels
      for (const label of labels) {
        await trx('kanban_labels').insert({
          user_id: userId,
          name: label.name,
          color: label.color
        });
      }
      
      // Insert epics
      for (const epic of epics) {
        await trx('kanban_epics').insert({
          user_id: userId,
          name: epic.name,
          color: epic.color
        });
      }
      
      // Insert task assignments
      for (const column of columns) {
        if (column.tasks && column.tasks.length > 0) {
          for (let i = 0; i < column.tasks.length; i++) {
            const taskId = column.tasks[i];
            await trx('kanban_task_assignments').insert({
              user_id: userId,
              task_id: taskId,
              column_id: column.id,
              order_index: i
            });
          }
        }
      }
    });
    
    console.log('Kanban data saved successfully for user:', userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving kanban data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected Routes (require authentication)

// Get all available dates
app.get('/dates', auth.requireAuth, async (req, res) => {
  try {
    console.log('=== /dates ENDPOINT ===');
    console.log('User ID:', req.user?.id);
    
    if (!req.user || !req.user.id) {
      console.log('❌ No user object or user ID found');
      return res.status(401).json({ error: 'User not found in request' });
    }
    
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
    
    console.log('✅ Returning', dateStrings.length, 'dates');
    res.json(dateStrings);
  } catch (error) {
    console.error('❌ Error fetching dates:', error);
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