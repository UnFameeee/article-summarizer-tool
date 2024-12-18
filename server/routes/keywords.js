const express = require('express');
const router = express.Router();
const db = require('../config/database');

// POST /api/keywords - Add new keyword
router.post('/', async (req, res) => {
  try {
    const { keyword } = req.body;
    
    // Check if keyword already exists
    const [existing] = await db.execute(
      'SELECT * FROM keywords WHERE keyword = ?',
      [keyword]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Keyword already exists'
      });
    }

    // Add new keyword
    const [result] = await db.execute(
      'INSERT INTO keywords (keyword) VALUES (?)',
      [keyword]
    );

    res.json({
      success: true,
      data: {
        id: result.insertId,
        keyword
      }
    });

  } catch (error) {
    console.error('Error in keyword creation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add keyword'
    });
  }
});

// GET /api/keywords - Get list of keywords
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM keywords ORDER BY created_at DESC'
    );
    
    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Error fetching keywords:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch keywords'
    });
  }
});

// DELETE /api/keywords/:id - Delete keyword
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await db.execute(
      'DELETE FROM keywords WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Keyword not found'
      });
    }

    res.json({
      success: true,
      message: 'Keyword deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting keyword:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete keyword'
    });
  }
});

module.exports = router; 