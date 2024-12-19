const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const initializeDatabase = require('./config/database-init');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Initialize database
initializeDatabase().catch(console.error);

// Routes
app.use('/summary', require('./routes/summary-detail'));
app.use('/api', require('./routes/api'));

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { message: 'Something broke!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 