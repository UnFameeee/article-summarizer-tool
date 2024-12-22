const express = require('express');
const cors = require('cors');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const initializeDatabase = require('./config/database-init');

// Import routes
const apiRoutes = require('./routes/api');
const summaryDetailRoutes = require('./routes/summary-detail');
const dashboardRoutes = require('./routes/dashboard');

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

// Routes
app.use('/api', apiRoutes);
app.use('/summary', summaryDetailRoutes);
app.use('/', dashboardRoutes);

// Initialize database
initializeDatabase().catch(console.error);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 