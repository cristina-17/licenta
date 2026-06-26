const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
});

// verificare conexiune la pornire
pool.getConnection()
    .then(conn => {
        console.log('Conectat la baza de date');
        conn.release();
    })
    .catch(err => {
        console.error('Eroare la conectarea la baza de date: ', err.message);
    });

module.exports = pool;