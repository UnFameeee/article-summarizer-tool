const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { generateSummary } = require('../config/gemini');

router.get('/:id', async (req, res) => {
    try {
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(req.params.id)) {
            return res.status(400).render('error', {
                message: 'Invalid summary ID format'
            });
        }

        const [rows] = await db.execute(
            'SELECT * FROM summaries WHERE id = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).render('error', {
                message: 'Summary not found'
            });
        }

        res.render('summary-detail', {
            summary: rows[0]
        });

    } catch (error) {
        console.error('Error fetching summary detail:', error);
        res.status(500).render('error', {
            message: 'Failed to fetch summary detail'
        });
    }
});

router.post('/api/summarize', async (req, res) => {
    try {
        const { url, content, prompt, summaryLevel } = req.body;

        if (!content) {
            return res.status(400).json({ 
                error: 'Content is required' 
            });
        }

        // Format input cho Gemini API dựa trên mức độ tóm tắt
        const summary = await generateSummary(content, '', summaryLevel, prompt);

        // Lưu vào database - Thêm trường content vào câu lệnh INSERT
        const [result] = await db.query(
            'INSERT INTO summaries (url, content, prompt, summary_level, summary_html) VALUES (?, ?, ?, ?, ?)',
            [url, content, prompt, summaryLevel, summary]
        );

        res.json({ 
            success: true,
            data: {
                id: result.insertId,
                summary,
                url
            }
        });
    } catch (error) {
        console.error('Error in /api/summarize:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

module.exports = router; 