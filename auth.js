const bcrypt = require('bcryptjs');

// Authentication middleware
function requireAuth(req, res, next) {
  console.log('=== AUTH CHECK ===');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('Session exists:', !!req.session);
  console.log('Session ID:', req.session?.id);
  console.log('Session userId:', req.session?.userId);
  console.log('Session username:', req.session?.username);
  console.log('User object exists:', !!req.user);
  console.log('User object:', req.user);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Cookies:', req.headers.cookie);
  
  if (req.session && req.session.userId) {
    console.log('✅ Authentication successful for user:', req.session.userId);
    return next();
  } else {
    console.log('❌ Authentication failed - no valid session');
    console.log('Session object:', req.session);
    return res.status(401).json({ error: 'Authentication required' });
  }
}

// Middleware to redirect to login if not authenticated (for HTML pages)
function requireAuthRedirect(req, res, next) {
  console.log('=== AUTH REDIRECT CHECK ===');
  console.log('Request URL:', req.url);
  console.log('Session exists:', !!req.session);
  console.log('Session userId:', req.session?.userId);
  
  if (req.session && req.session.userId) {
    console.log('✅ Authentication successful for redirect check');
    return next();
  } else {
    console.log('❌ Authentication failed - redirecting to login');
    return res.redirect('/login.html');
  }
}

// Middleware to add user info to request
function addUserToRequest(db) {
  return async (req, res, next) => {
    console.log('=== ADD USER TO REQUEST ===');
    console.log('Request URL:', req.url);
    console.log('Session exists:', !!req.session);
    console.log('Session userId:', req.session?.userId);
    
    if (req.session && req.session.userId) {
      try {
        console.log('Looking up user with ID:', req.session.userId);
        const user = await db('users').where('id', req.session.userId).first();
        if (user) {
          req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name
          };
          console.log('✅ User found and added to request:', req.user);
        } else {
          console.log('❌ User not found in database for ID:', req.session.userId);
        }
      } catch (error) {
        console.error('❌ Error fetching user:', error);
      }
    } else {
      console.log('No session or userId, skipping user lookup');
    }
    next();
  };
}

// Hash password
async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Verify password
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate username format
function isValidUsername(username) {
  // Username should be 3-30 characters, alphanumeric and underscores only
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
}

module.exports = {
  requireAuth,
  requireAuthRedirect,
  addUserToRequest,
  hashPassword,
  verifyPassword,
  isValidEmail,
  isValidUsername
}; 