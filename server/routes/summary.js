const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { generateSummary } = require('../config/gemini');

// POST /api/summary - Create new summary
router.post('/', async (req, res) => {
    try {
        const { url, content, keywords } = req.body;

        // Validate input
        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Content is required'
            });
        }

        // Generate summary using Gemini API
        const summary = await generateSummary(content, keywords);

        // Save to database
        const [result] = await db.execute(
            'INSERT INTO summaries (url, content, summary, keywords) VALUES (?, ?, ?, ?)',
            [url, content, summary, keywords]
        );

        res.json({
            success: true,
            data: {
                id: result.insertId,
                summary,
                url,
                keywords
            }
        });

    } catch (error) {
        console.error('Error in summary creation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create summary'
        });
    }
});

// GET /api/summary - Get list of summaries
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM summaries ORDER BY created_at DESC'
        );
        
        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Error fetching summaries:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch summaries'
        });
    }
});

module.exports = router; 