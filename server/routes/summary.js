const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { generateSummary } = require('../config/gemini');

// POST /api/summary - Create new summary
router.post('/', async (req, res) => {
    try {
        const { url, content, keywords, summaryLevel, customPrompt } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Content is required'
            });
        }

        // Generate summary using Gemini API
        const summaryHtml = await generateSummary(
            content, 
            keywords, 
            summaryLevel || 'medium',
            customPrompt
        );

        // Save to database
        const [result] = await db.execute(
            'INSERT INTO summaries (url, content, prompt, summary_level, summary_html, keywords) VALUES (?, ?, ?, ?, ?, ?)',
            [url, content, customPrompt, summaryLevel || 'medium', summaryHtml, keywords]
        );

        res.json({
            success: true,
            data: {
                id: result.insertId,
                summaryHtml,
                url,
                keywords,
                summaryLevel
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