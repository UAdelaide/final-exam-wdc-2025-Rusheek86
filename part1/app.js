const express = require('express');
const path = require('path');

const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Route for API
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

module.exports = app;
