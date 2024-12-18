const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const dotenv = require('dotenv');
const expressLayouts = require('express-ejs-layouts');
const cors = require('cors');

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// View engine setup
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

// Add this before routes
app.use(cors({
    origin: ['chrome-extension://*'],
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true
}));

// Routes
app.use('/api/summary', require('./routes/summary'));
app.use('/api/keywords', require('./routes/keywords'));

// Add summary detail route
app.use('/summary', require('./routes/summary-detail'));

// UI Routes
app.get('/', async (req, res) => {
    const db = require('./config/database');
    try {
        const [summaries] = await db.execute('SELECT * FROM summaries ORDER BY created_at DESC');
        res.render('dashboard', { summaries });
    } catch (error) {
        console.error('Error fetching summaries:', error);
        res.render('dashboard', { summaries: [], error: 'Failed to fetch summaries' });
    }
});

app.get('/keywords', async (req, res) => {
    const db = require('./config/database');
    try {
        const [keywords] = await db.execute('SELECT * FROM keywords ORDER BY created_at DESC');
        res.render('keywords', { keywords });
    } catch (error) {
        console.error('Error fetching keywords:', error);
        res.render('keywords', { keywords: [], error: 'Failed to fetch keywords' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 