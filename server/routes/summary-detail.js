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

router.post('/api/summarize', async (req, res) => {
  try {
    const { url, prompt, summaryLevel } = req.body;
    
    // Format input cho Gemini API dựa trên mức độ tóm tắt
    let formattedPrompt = '';
    switch(summaryLevel) {
      case 'short':
        formattedPrompt = `${prompt}\nTóm tắt nội dung thành 3 câu ngắn gọn nhất.`;
        break;
      case 'medium':
        formattedPrompt = `${prompt}\nTóm tắt nội dung thành một đoạn văn bản dễ đọc, bao gồm các ý chính.`;
        break;
      case 'detailed':
        formattedPrompt = `${prompt}\nTóm tắt nội dung đầy đủ với định dạng HTML, bao gồm các tiêu đề và danh sách gạch đầu dòng.`;
        break;
    }

    // Gọi Gemini API và xử lý response
    const summary = await callGeminiAPI(url, formattedPrompt);

    // Lưu vào database
    await db.query(
      'INSERT INTO summaries (url, prompt, summary_level, summary_html) VALUES (?, ?, ?, ?)',
      [url, prompt, summaryLevel, summary]
    );

    res.json({ summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 