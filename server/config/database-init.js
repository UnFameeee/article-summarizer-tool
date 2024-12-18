const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function initializeDatabase() {
    try {
        // First connection to create database if not exists
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        // Create database if not exists
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        
        // Use the database
        await connection.query(`USE ${process.env.DB_NAME}`);

        // Create tables
        await connection.query(`
            CREATE TABLE IF NOT EXISTS keywords (
                id INT PRIMARY KEY AUTO_INCREMENT,
                keyword VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS summaries (
                id INT PRIMARY KEY AUTO_INCREMENT,
                url TEXT NOT NULL,
                content TEXT NOT NULL,
                summary TEXT NOT NULL,
                keywords TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Database and tables initialized successfully');
        await connection.end();

    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

module.exports = initializeDatabase; 