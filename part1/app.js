const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
let db;

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    await connection.query('CREATE DATABASE IF NOT EXISTS dogwalks');
    await connection.end();

    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'dogwalks'
    });

    // Create tables
    await db.execute(`CREATE TABLE IF NOT EXISTS owners (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100)
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS walkers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100)
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS dogs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      size VARCHAR(20),
      owner_id INT,
      FOREIGN KEY (owner_id) REFERENCES owners(id)
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS walkrequests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dog_id INT,
      walker_id INT,
      requested_time DATETIME,
      location VARCHAR(100),
      duration_minutes INT,
      status VARCHAR(20),
      FOREIGN KEY (dog_id) REFERENCES dogs(id),
      FOREIGN KEY (walker_id) REFERENCES walkers(id)
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS ratings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      walker_id INT,
      rating INT,
      FOREIGN KEY (walker_id) REFERENCES walkers(id)
    )`);

    // Seed data if not present
    const [[{ count }]] = await db.execute('SELECT COUNT(*) AS count FROM owners');
    if (count === 0) {
      await db.execute(`INSERT INTO owners (username) VALUES ('alice123'), ('carol123')`);
      await db.execute(`INSERT INTO walkers (username) VALUES ('bobwalker'), ('newwalker')`);
      await db.execute(`INSERT INTO dogs (name, size, owner_id) VALUES
        ('Max', 'medium', 1),
        ('Bella', 'small', 2)`);
      await db.execute(`INSERT INTO walkrequests
        (dog_id, walker_id, requested_time, location, duration_minutes, status)
        VALUES
        (1, 1, '2025-06-10 08:00:00', 'Parklands', 30, 'open'),
        (2, 2, '2025-06-11 09:00:00', 'City Square', 45, 'closed')`);
      await db.execute(`INSERT INTO ratings (walker_id, rating) VALUES (1, 5), (1, 4)`);
    }
  } catch (err) {
    console.error('Database setup failed:', err.message);
  }
})();

// /api/dogs
app.get('/api/dogs', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT dogs.name AS dog_name, dogs.size, owners.username AS owner_username
      FROM dogs
      JOIN owners ON dogs.owner_id = owners.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch dogs' });
  }
});

// /api/walkrequests/open
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        wr.id AS request_id,
        d.name AS dog_name,
        wr.requested_time,
        wr.duration_minutes,
        wr.location,
        o.username AS owner_username
      FROM walkrequests wr
      JOIN dogs d ON wr.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      WHERE wr.status = 'open'
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch open walk requests' });
  }
});

// /api/walkers/summary
app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        w.username AS walker_username,
        COUNT(r.id) AS total_ratings,
        AVG(r.rating) AS average_rating,
        COUNT(wr.id) AS completed_walks
      FROM walkers w
      LEFT JOIN ratings r ON w.id = r.walker_id
      LEFT JOIN walkrequests wr ON w.id = wr.walker_id AND wr.status = 'closed'
      GROUP BY w.id, w.username
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch walker summaries' });
  }
});

app.listen(8080, () => {
  console.log('Server listening on http://localhost:8080');
});
