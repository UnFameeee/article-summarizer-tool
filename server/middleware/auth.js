const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1] || req.cookies.adminToken;
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = verified;
        next();
    } catch (error) {
        res.redirect('/admin/login');
    }
};

// Rate Limiting Middleware
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Login Rate Limiting
const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // limit each IP to 5 login attempts per windowMs
    message: 'Too many login attempts from this IP, please try again after 10 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    authenticateToken,
    apiLimiter,
    loginLimiter
}; 