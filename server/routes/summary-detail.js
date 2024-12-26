const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { generateSummary } = require('../config/gemini');

router.get('/:slug', async (req, res) => {
    try {
        const [summaries] = await db.execute(
            'SELECT * FROM summaries WHERE slug = ? AND deleted = FALSE',
            [req.params.slug]
        );

        if (summaries.length === 0) {
            return res.status(404).render('error', {
                message: 'Summary not found'
            });
        }

        res.render('summary-detail', {
            summary: summaries[0]
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