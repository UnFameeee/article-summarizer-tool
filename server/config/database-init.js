const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

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
    if (isInitialized) {
        return;
    }

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        await connection.query(`USE ${process.env.DB_NAME}`);

        // First create user_prompts table if not exists
        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_prompts (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(255),
                prompt TEXT NOT NULL,
                summary_level ENUM('short', 'medium', 'detailed') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted BOOLEAN DEFAULT FALSE
            )
        `);

        // Create base summaries table if not exists
        await connection.query(`
            CREATE TABLE IF NOT EXISTS summaries (
                id VARCHAR(36) PRIMARY KEY,
                url VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                prompt TEXT NOT NULL,
                summary_level ENUM('short', 'medium', 'detailed') NOT NULL,
                summary_html TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMP NULL
            )
        `);

        // Add user_prompt_id column if not exists
        await addColumnIfNotExists(
            connection, 
            'summaries', 
            'user_prompt_id', 
            'VARCHAR(36)'
        );

        // Add foreign key if not exists
        const [foreignKeys] = await connection.query(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'summaries' 
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
            AND CONSTRAINT_NAME = 'fk_user_prompt'
        `, [process.env.DB_NAME]);

        if (foreignKeys.length === 0) {
            await connection.query(`
                ALTER TABLE summaries 
                ADD CONSTRAINT fk_user_prompt 
                FOREIGN KEY (user_prompt_id) 
                REFERENCES user_prompts(id)
            `);
            console.log('Added foreign key constraint for user_prompt_id');
        }

        // Convert existing INT id to UUID if needed
        const [idType] = await connection.query(`
            SELECT COLUMN_TYPE 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'summaries' 
            AND COLUMN_NAME = 'id'
        `, [process.env.DB_NAME]);

        if (idType[0] && idType[0].COLUMN_TYPE === 'int') {
            // Create temporary column
            await connection.query(`ALTER TABLE summaries ADD COLUMN new_id VARCHAR(36)`);
            
            // Update with new UUIDs
            const [rows] = await connection.query('SELECT id FROM summaries');
            for (const row of rows) {
                await connection.query(
                    'UPDATE summaries SET new_id = ? WHERE id = ?',
                    [uuidv4(), row.id]
                );
            }

            // Drop old primary key and rename column
            await connection.query('ALTER TABLE summaries DROP PRIMARY KEY');
            await connection.query('ALTER TABLE summaries DROP COLUMN id');
            await connection.query('ALTER TABLE summaries CHANGE new_id id VARCHAR(36) PRIMARY KEY');
        }

        // Add title column if not exists
        await addColumnIfNotExists(
            connection, 
            'summaries', 
            'title', 
            'TEXT'
        );

        // Add admin table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id VARCHAR(36) PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted BOOLEAN DEFAULT FALSE
            )
        `);

        // Add deleted column if not exists to existing tables
        await addColumnIfNotExists(connection, 'summaries', 'deleted', 'BOOLEAN DEFAULT FALSE');
        await addColumnIfNotExists(connection, 'user_prompts', 'deleted', 'BOOLEAN DEFAULT FALSE');
        await addColumnIfNotExists(connection, 'admins', 'deleted', 'BOOLEAN DEFAULT FALSE');

        // Add deleted_at column if not exists
        await addColumnIfNotExists(
            connection, 
            'summaries', 
            'deleted_at', 
            'TIMESTAMP NULL'
        );

        // Create request_logs table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS request_logs (
                id VARCHAR(36) PRIMARY KEY,
                ip_address VARCHAR(45) NOT NULL,
                user_agent TEXT NOT NULL,
                endpoint VARCHAR(255) NOT NULL,
                payload JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_deleted BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMP NULL,
                INDEX idx_ip_address (ip_address),
                INDEX idx_created_at (created_at),
                INDEX idx_endpoint (endpoint)
            )
        `);

        console.log('Database and tables initialized successfully');
        await connection.end();
        
        isInitialized = true;

    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

module.exports = initializeDatabase; 