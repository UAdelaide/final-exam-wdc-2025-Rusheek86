const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
const PORT = 8080;

app.use(express.json());

// Create database connection
const dbConfig = {
  host: 'localhost',
  user: 'root',
  database: 'DogWalkService'
};

// /api/dogs
app.get('/api/dogs', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT d.name AS dog_name, d.size, u.username AS owner_username
      FROM Dogs d
      JOIN Users u ON d.owner_id = u.user_id;
    `);
    res.json(rows);
    connection.end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve dogs.' });
  }
});

// /api/walkrequests/open
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT wr.request_id, d.name AS dog_name, wr.requested_time, wr.duration_minutes, wr.location, u.username AS owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open';
    `);
    res.json(rows);
    connection.end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve open walk requests.' });
  }
});

// /api/walkers/summary
app.get('/api/walkers/summary', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT
        u.username AS walker_username,
        COUNT(r.rating_id) AS total_ratings,
        ROUND(AVG(r.rating), 1) AS average_rating,
        (
          SELECT COUNT(*)
          FROM WalkRequests wr
          JOIN WalkApplications wa ON wr.request_id = wa.request_id
          WHERE wr.status = 'completed' AND wa.status = 'accepted' AND wa.walker_id = u.user_id
        ) AS completed_walks
      FROM Users u
      LEFT JOIN WalkRatings r ON u.user_id = r.walker_id
      WHERE u.role = 'walker'
      GROUP BY u.username;
    `);
    res.json(rows);
    connection.end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve walker summary.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
