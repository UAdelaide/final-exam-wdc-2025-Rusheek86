const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise'); // or mysql

const app = express();

app.use(bodyParser.json());
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true if HTTPS
}));

// Setup your MySQL connection pool (adjust credentials)
const pool = mysql.createPool({
  host: 'localhost',
  user: 'your_mysql_user',
  password: 'your_mysql_password',
  database: 'DogWalkService',
});

// POST /users/login handler
app.post('/users/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    // For now assume passwords stored in plaintext (or adjust with bcrypt)
    if (password !== user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Save session data
    req.session.userId = user.user_id;
    req.session.role = user.role;
    req.session.username = user.username;

    res.json({ user: { id: user.user_id, role: user.role, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
