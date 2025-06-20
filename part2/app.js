const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

// Import routes
const userRoutes = require('./routes/userRoutes');
const walkRoutes = require('./routes/walkRoutes');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions
app.use(session({
  secret: 'super-secret',
  resave: false,
  saveUninitialized: true
}));

// Serve static files (e.g., login.html)
app.use(express.static(path.join(__dirname, 'public')));

// Route setup
app.use('/users', userRoutes);
app.use('/walks', walkRoutes);

// Default route (optional)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Export app for use in bin/www
module.exports = app;
