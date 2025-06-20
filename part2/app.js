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
  cookie: { secure: false } // true if HTTPS
}));

let db;

(async () => {
  try {
    // Connect to MySQL server without DB to create DB if needed
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '' // your MySQL password here
    });

    await connection.query('CREATE DATABASE IF NOT EXISTS DogWalkService');
    await connection.end();

    // Connect to DogWalkService DB
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'DogWalkService'
    });

    // Ensure users table exists (should match your schema)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255),
        role ENUM('owner', 'walker')
      )
    `);

  } catch (err) {
    console.error('DB setup error:', err);
  }
})();

// Login route
app.post('/users/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await db.execute('SELECT * FROM Users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = users[0];

    // Passwords stored as hashed strings (e.g., 'hashed123'), so match exactly here
    if (password !== user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Save to session
    req.session.userId = user.user_id;
    req.session.role = user.role;
    req.session.username = user.username;

    res.json({ user: { id: user.user_id, role: user.role, username: user.username } });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

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

// Owner dashboard route
app.get('/owner-dashboard', requireLogin, requireRole('owner'), (req, res) => {
  res.send(`Welcome to Owner Dashboard, ${req.session.username}!`);
});

// Walker dashboard route
app.get('/walker-dashboard', requireLogin, requireRole('walker'), (req, res) => {
  res.send(`Welcome to Walker Dashboard, ${req.session.username}!`);
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;
