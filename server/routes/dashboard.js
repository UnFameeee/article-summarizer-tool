const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET dashboard page
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;
        
        // Get search parameters
        const searchQuery = req.query.search || '';
        const levelFilter = req.query.level || 'all';

        // Build WHERE clause
        let whereClause = '1=1';
        let params = [];

        if (searchQuery) {
            whereClause += ' AND title LIKE ?';
            params.push(`%${searchQuery}%`);
        }

        if (levelFilter !== 'all') {
            whereClause += ' AND summary_level = ?';
            params.push(levelFilter);
        }

        // Get total count with filters
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM summaries WHERE ${whereClause}`,
            params
        );
        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);

        // Fetch paginated summaries with filters
        const [summaries] = await db.query(
            `SELECT * FROM summaries 
            WHERE ${whereClause}
            ORDER BY created_at DESC 
            LIMIT ?, ?`,
            [...params, offset, limit]
        );

        res.render('index', { 
            summaries,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages,
            searchQuery,
            levelFilter,
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