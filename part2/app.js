const express = require('express');
const session = require('express-session');
const path = require('path');
const usersRouter = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup sessions
app.use(session({
  secret: 'super-secret-key', // You can replace this with a more secure key
  resave: false,
  saveUninitialized: true
}));

// Serve static files (like login.html) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Use the users route for login, logout, register etc.
app.use('/users', usersRouter);

// Default route to show basic message (optional)
app.get('/', (req, res) => {
  res.send('Welcome to the Dog Walking Service API');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
