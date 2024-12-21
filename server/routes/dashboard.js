const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET dashboard page
router.get('/', async (req, res) => {
    try {
        // Fetch all summaries ordered by created_at desc
        const [summaries] = await db.execute(`
            SELECT * FROM summaries 
            ORDER BY created_at DESC
        `);

        res.render('index', { 
            summaries,
            title: 'Dashboard'
        });
    } catch (error) {
        console.error('Error fetching summaries:', error);
        res.status(500).render('error', {
            message: 'Failed to load dashboard'
        });
    }
});

module.exports = router; 