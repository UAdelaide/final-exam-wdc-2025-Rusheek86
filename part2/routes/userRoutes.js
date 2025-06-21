const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

// Example DB connection – adjust if needed
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'DogWalkService'
};

// Login route
router.post('/login', async (req, res) => {
  try {
    const { user, pass } = req.body;

    const db = await mysql.createConnection(dbConfig);
    const [rows] = await db.execute('SELECT * FROM Users WHERE username = ?', [user]);

    if (rows.length === 0 || rows[0].password_hash !== pass) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const userInfo = rows[0];

    // Store session data
    req.session.userId = userInfo.user_id;
    req.session.username = userInfo.username;
    req.session.role = userInfo.role;

    return res.status(200).json({ message: `Welcome ${userInfo.username}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    return res.status(200).json({ message: 'Logged out' });
  });
});

module.exports = router;