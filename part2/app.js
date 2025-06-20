const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();

// Import route files
const userRoutes = require('./routes/userRoutes');
const walkRoutes = require('./routes/walkRoutes');

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session config
app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: true
}));

// Static files (HTML/CSS/JS)
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/users', userRoutes);
app.use('/walks', walkRoutes);

// Optional fallback to login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ✅ THIS LINE is crucial for `bin/www` to work
module.exports = app;