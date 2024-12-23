const express = require('express');
const cors = require('cors');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const initializeDatabase = require('./config/database-init');
const { apiLimiter } = require('./middleware/auth');
const requestLogger = require('./middleware/request-logger');

// Import routes
const apiRoutes = require('./routes/api');
const summaryDetailRoutes = require('./routes/summary-detail');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Serve static files
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(apiLimiter);
app.use('/api', requestLogger);

// Routes
app.use('/api', apiLimiter, apiRoutes);
app.use('/summary', summaryDetailRoutes);

// Landing page route
app.get('/', (req, res) => {
    res.render('landing', {
        title: 'Chunk Sum - AI-Powered Web Content Summarizer',
        layout: 'layouts/main',
        extensionId: process.env.EXTENSION_ID
    });
});

// Dashboard routes - only handle /dashboard path
app.use('/dashboard', dashboardRoutes);

app.use('/admin', adminRoutes);

// Add privacy policy route
app.get('/privacy-policy', (req, res) => {
    res.render('privacy-policy', {
        title: 'Privacy Policy',
        layout: 'layouts/main',
        path: '/privacy-policy'
    });
});

// Initialize database
initializeDatabase().catch(console.error);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 