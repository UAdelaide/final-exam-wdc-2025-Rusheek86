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

    await db.execute(`CREATE TABLE IF NOT EXISTS dogs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      breed VARCHAR(100)
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS walkers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100)
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS walkrequests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dog_id INT,
      walker_id INT,
      status VARCHAR(20),
      FOREIGN KEY (dog_id) REFERENCES dogs(id),
      FOREIGN KEY (walker_id) REFERENCES walkers(id)
    )`);

    const [[{ count }]] = await db.execute('SELECT COUNT(*) AS count FROM dogs');
    if (count === 0) {
      await db.execute(`INSERT INTO dogs (name, breed) VALUES ('Buddy', 'Beagle'), ('Luna', 'Labrador')`);
      await db.execute(`INSERT INTO walkers (name) VALUES ('Alice'), ('Bob')`);
      await db.execute(`INSERT INTO walkrequests (dog_id, walker_id, status) VALUES (1, 1, 'open'), (2, 2, 'closed')`);
    }
  } catch (err) {
    console.error('Database setup failed:', err.message);
  }
})();

app.get('/api/dogs', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM dogs');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not get dogs' });
  }
});

app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM walkrequests WHERE status = 'open'");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not get open walk requests' });
  }
});

app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT walkers.id, walkers.name, COUNT(walkrequests.id) AS total_walks
      FROM walkers
      LEFT JOIN walkrequests ON walkers.id = walkrequests.walker_id
      GROUP BY walkers.id, walkers.name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not get walkers summary' });
  }
});

app.listen(8080, () => {
  console.log('Server listening on http://localhost:8080');
});
