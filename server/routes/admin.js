const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticateToken, loginLimiter } = require('../middleware/auth');

// Render login page
router.get('/login', (req, res) => {
    res.render('admin/login', { layout: 'layouts/main' });
});

// Render dashboard page
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder || 'DESC';

        // Validate sort parameters
        const allowedSortFields = ['title', 'url', 'summary_level', 'created_at'];
        const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder : 'DESC';

        // Build search condition
        let whereClause = 'deleted = FALSE';
        let params = [];

        if (search) {
            whereClause += ' AND (title LIKE ? OR url LIKE ? OR summary_level LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const [summaries] = await db.query(
            `SELECT * FROM summaries WHERE ${whereClause} ORDER BY ${validSortBy} ${validSortOrder} LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const [countResult] = await db.execute(
            `SELECT COUNT(*) as total FROM summaries WHERE ${whereClause}`,
            params
        );

        const totalItems = countResult[0].total;

        res.render('admin/dashboard', {
            layout: 'layouts/main',
            summaries,
            currentPage: page,
            totalPages: Math.ceil(totalItems / limit),
            search,
            sortBy: validSortBy,
            sortOrder: validSortOrder
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).render('error', { message: 'Failed to load dashboard' });
    }
});

// Admin Login
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        // Get admin from database
        const [admins] = await db.execute(
            'SELECT * FROM admins WHERE username = ? AND deleted = FALSE',
            [username]
        );

        if (admins.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const admin = admins[0];
        const validPassword = await bcrypt.compare(password, admin.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Create and assign token
        const token = jwt.sign(
            { id: admin.id, username: admin.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Set cookie
        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600000 // 1 hour
        });

        res.json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all summaries with pagination (protected route)
router.get('/summaries', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const [summaries] = await db.query(
            'SELECT * FROM summaries WHERE deleted = FALSE ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );

        const [countResult] = await db.execute('SELECT COUNT(*) as total FROM summaries WHERE deleted = FALSE');
        const totalItems = countResult[0].total;

        res.json({
            summaries,
            currentPage: page,
            totalPages: Math.ceil(totalItems / limit)
        });
    } catch (error) {
        console.error('Error fetching summaries:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete summary (protected route)
router.delete('/summaries/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Get current timestamp
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // Update deleted status and add deleted timestamp
        await db.execute(
            'UPDATE summaries SET deleted = TRUE, deleted_at = ? WHERE id = ?',
            [now, id]
        );

        res.json({ message: 'Summary deleted successfully' });
    } catch (error) {
        console.error('Error deleting summary:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// View summary detail
router.get('/summary/:slug', authenticateToken, async (req, res) => {
    try {
        const [summaries] = await db.execute(
            'SELECT * FROM summaries WHERE slug = ? AND deleted = FALSE',
            [req.params.slug]
        );

        if (summaries.length === 0) {
            return res.status(404).render('error', { 
                message: 'Summary not found',
                layout: 'layouts/main'
            });
        }

        res.render('admin/summary-detail', {
            layout: 'layouts/main',
            summary: summaries[0]
        });
    } catch (error) {
        console.error('Error fetching summary:', error);
        res.status(500).render('error', { 
            message: 'Failed to load summary',
            layout: 'layouts/main'
        });
    }
});

// GET request logs
router.get('/logs', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;

        // Get total count
        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM request_logs WHERE is_deleted = FALSE'
        );
        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);

        // Fetch paginated logs
        const [logs] = await db.query(
            `SELECT * FROM request_logs 
             WHERE is_deleted = FALSE 
             ORDER BY created_at DESC 
             LIMIT ?, ?`,
            [offset, limit]
        );

        res.render('admin/logs', {
            logs,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).render('error', {
            message: 'Failed to load logs'
        });
    }
});

module.exports = router; 