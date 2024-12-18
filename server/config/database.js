const mysql = require('mysql2');
const dotenv = require('dotenv');
const initializeDatabase = require('./database-init');

dotenv.config();

// Initialize database and tables
initializeDatabase().catch(console.error);

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise(); 