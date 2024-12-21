const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

let isInitialized = false;

// Add new columns to summaries table if they don't exist
async function addColumnIfNotExists(connection, table, column, definition) {
    try {
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
        `, [process.env.DB_NAME, table, column]);

        if (columns.length === 0) {
            await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
            console.log(`Added column ${column} to ${table}`);
        }
    } catch (error) {
        console.error(`Error adding column ${column}:`, error);
        throw error;
    }
}

async function initializeDatabase() {
    // Return early if already initialized
    if (isInitialized) {
        return;
    }

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

        // Create user_prompts table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_prompts (
                user_id VARCHAR(255) PRIMARY KEY,
                prompt TEXT NOT NULL,
                summary_level ENUM('short', 'medium', 'detailed') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create or modify summaries table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS summaries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                url VARCHAR(255) NOT NULL,
                prompt TEXT NOT NULL,
                summary_level ENUM('short', 'medium', 'detailed') NOT NULL,
                summary_html TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Add new columns to summaries table if they don't exist
        await addColumnIfNotExists(connection, 'summaries', 'prompt', 'TEXT');
        await addColumnIfNotExists(connection, 'summaries', 'summary_level', "ENUM('short', 'medium', 'detailed') NOT NULL DEFAULT 'medium'");
        await addColumnIfNotExists(connection, 'summaries', 'summary_html', 'TEXT');

        console.log('Database and tables initialized successfully');
        await connection.end();
        
        // Set the flag after successful initialization
        isInitialized = true;

    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

module.exports = initializeDatabase; 