const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mysql = require('mysql2/promise');
const session = require('express-session');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(session({
  secret: 'your_strong_secret_here',// change to a strong secret in production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }// set to true if HTTPS
}));

let db;

// Initialize database connection and create DB if not exists
(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''// update with your DB password if needed
    });
    await connection.query('CREATE DATABASE IF NOT EXISTS DogWalkService');
    await connection.end();

    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'DogWalkService'
    });

  } catch (err) {
    console.error('DB setup error:', err);
  }
})();

// Middleware to require login
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).send('Unauthorized');
  }
  next();
}

// Middleware to require specific role
function requireRole(role) {
  return (req, res, next) => {
    if (req.session.role !== role) {
      return res.status(403).send('Forbidden');
    }
    next();
  };
}

// POST login route
app.post('/users/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [users] = await db.execute('SELECT * FROM Users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const user = users[0];

    if (password !== user.password_hash) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.userId = user.user_id;
    req.session.role = user.role;
    req.session.username = user.username;

    res.json({ user: { id: user.user_id, role: user.role, username: user.username } });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve owner dashboard page (only logged in owners)
app.get('/owner-dashboard', requireLogin, requireRole('owner'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'owner-dashboard.html'));
});

// Serve walker dashboard page (only logged in walkers)
app.get('/walker-dashboard', requireLogin, requireRole('walker'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'walker-dashboard.html'));
});

// Fetch dogs owned by logged-in owner (for dropdown/select)
app.get('/owner/dogs', requireLogin, requireRole('owner'), async (req, res) => {
  try {
    const ownerId = req.session.userId;
    const [dogs] = await db.execute(
      'SELECT dog_id, name FROM Dogs WHERE owner_id = ?',
      [ownerId]
    );
    res.json(dogs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

// Fetch owner walk requests
app.get('/owner/walkrequests', requireLogin, requireRole('owner'), async (req, res) => {
  try {
    const ownerId = req.session.userId;
    const [walks] = await db.execute(`
      SELECT wr.walk_id, d.name AS dog_name, wr.requested_time, wr.duration_minutes, wr.location, wr.status
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      WHERE d.owner_id = ?
      ORDER BY wr.requested_time DESC
    `, [ownerId]);
    res.json(walks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch walk requests' });
  }
});

// Fetch walker walk requests (only open)
app.get('/walker/walkrequests', requireLogin, requireRole('walker'), async (req, res) => {
  try {
    const [walks] = await db.execute(`
      SELECT wr.walk_id, d.name AS dog_name, wr.requested_time, wr.duration_minutes, wr.location, wr.status
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      WHERE wr.status = 'open'
      ORDER BY wr.requested_time ASC
    `);
    res.json(walks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch walk requests' });
  }
});

// New API endpoint: fetch all dogs for homepage (no login required)
app.get('/api/dogs', async (req, res) => {
  try {
    const [dogs] = await db.execute('SELECT dog_id, name, size, owner_id FROM Dogs ORDER BY dog_id ASC');
    res.json(dogs);
  } catch (err) {
    console.error('Failed to fetch dogs:', err);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

// Logout route (clears session and redirects to login)
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;
