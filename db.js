const mysql = require('mysql2/promise');
require('dotenv').config();

// Создайте подключение к базе данных
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

async function checkConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Подключение к базе данных установлено.');
        connection.release();
    } catch (err) {
        console.error('Ошибка подключения к базе данных:', err.stack);
    }
}

checkConnection();

module.exports = pool;