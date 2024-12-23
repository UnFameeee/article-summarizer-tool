const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const requestLogger = async (req, res, next) => {
    try {
        // Get IP address
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        
        // Get User-Agent
        const userAgent = req.headers['user-agent'];
        
        // Get endpoint
        const endpoint = req.originalUrl;
        
        // Get payload (if any)
        const payload = ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : null;

        // Log to database
        await db.query(
            `INSERT INTO request_logs (id, ip_address, user_agent, endpoint, payload) 
             VALUES (?, ?, ?, ?, ?)`,
            [
                uuidv4(),
                ip,
                userAgent,
                endpoint,
                payload ? JSON.stringify(payload) : null
            ]
        );

        next();
    } catch (error) {
        console.error('Error logging request:', error);
        next(); // Continue even if logging fails
    }
};

module.exports = requestLogger; 