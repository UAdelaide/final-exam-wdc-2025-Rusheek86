const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Load route files
const userRoutes = require('./routes/userRoutes');
const walkRoutes = require('./routes/walkRoutes');

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
  secret: 'top-secret-session-key',
  resave: false,
  saveUninitialized: true
}));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount routes
app.use('/users', userRoutes);  // login, logout, register, etc.
app.use('/walks', walkRoutes);  // walk-related endpoints if needed

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
