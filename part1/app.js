const express = require('express');
const mysql = require('mysql2/promise');
const logger = require('morgan');
const cookieParser = require('cookie-parser');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let db;

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '' // Update this if your MySQL password is different
    });

    await connection.query('CREATE DATABASE IF NOT EXISTS dogwalks');
    await connection.end();

    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'dogwalks'
    });

    await db.execute(`
      CREATE TABLE IF NOT EXISTS dogs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        breed VARCHAR(100)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS walkers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS walkrequests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dog_id INT,
        walker_id INT,
        status VARCHAR(20),
        FOREIGN KEY (dog_id) REFERENCES dogs(id),
        FOREIGN KEY (walker_id) REFERENCES walkers(id)
      )
    `);

    const [[{ count }]] = await db.execute('SELECT COUNT(*) AS count FROM dogs');
    if (count === 0) {
      await db.execute(`INSERT INTO dogs (name, breed) VALUES ('Buddy', 'Beagle'), ('Luna', 'Labrador')`);
      await db.execute(`INSERT INTO walkers (name) VALUES ('Alice'), ('Bob')`);
      await db.execute(`INSERT INTO walkreques
