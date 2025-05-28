const bcrypt = require('bcryptjs');

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
}

// Middleware to redirect to login if not authenticated (for HTML pages)
function requireAuthRedirect(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.redirect('/login.html');
  }
}

// Middleware to add user info to request
function addUserToRequest(db) {
  return async (req, res, next) => {
    if (req.session && req.session.userId) {
      try {
        const user = await db('users').where('id', req.session.userId).first();
        if (user) {
          req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name
          };
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
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