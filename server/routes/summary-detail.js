const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/:id', async (req, res) => {
    try {
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

module.exports = router; 