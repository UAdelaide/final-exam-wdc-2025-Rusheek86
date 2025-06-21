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
  secret: 'your_strong_secret_here',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

let db;

// Initialize DB connection and create DB if not exists
(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
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
    // console.error('DB setup error:', err);
    return;
  }
})();

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).send('Unauthorized');
  }
  return next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.session.role !== role) {
      return res.status(403).send('Forbidden');
    }
    return next();
  };
}

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

    return res.json({ user: { id: user.user_id, role: user.role, username: user.username } });
  } catch (err) {
    // console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/owner-dashboard', requireLogin, requireRole('owner'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'owner-dashboard.html'));
});

app.get('/walker-dashboard', requireLogin, requireRole('walker'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'walker-dashboard.html'));
});

app.get('/owner/dogs', requireLogin, requireRole('owner'), async (req, res) => {
  try {
    const ownerId = req.session.userId;
    const [dogs] = await db.execute(
      'SELECT dog_id, name FROM Dogs WHERE owner_id = ?',
      [ownerId]
    );
    return res.json(dogs);
  } catch (err) {
    // console.error(err);
    return res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

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
    return res.json(walks);
  } catch (err) {
    // console.error(err);
    return res.status(500).json({ error: 'Failed to fetch walk requests' });
  }
});

app.get('/walker/walkrequests', requireLogin, requireRole('walker'), async (req, res) => {
  try {
    const [walks] = await db.execute(`
      SELECT wr.walk_id, d.name AS dog_name, wr.requested_time, wr.duration_minutes, wr.location, wr.status
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      WHERE wr.status = 'open'
      ORDER BY wr.requested_time ASC
    `);
    return res.json(walks);
  } catch (err) {
    // console.error(err);
    return res.status(500).json({ error: 'Failed to fetch walk requests' });
  }
});

app.get('/api/dogs', async (req, res) => {
  try {
    const [dogs] = await db.execute('SELECT dog_id, name, size, owner_id FROM Dogs ORDER BY dog_id ASC');
    return res.json(dogs);
  } catch (err) {
    // console.error('Failed to fetch dogs:', err);
    return res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;