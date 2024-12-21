const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { generateSummary } = require('../config/gemini');
const axios = require('axios');
const cheerio = require('cheerio');

// Function to extract main content from webpage
async function extractMainContent(url) {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        // Remove unwanted elements
        $('script, style, iframe, nav, header, footer, aside').remove();

        // Get text from main content areas
        let content = '';
        const mainSelectors = [
            'article',
            '[role="main"]',
            '.article-content',
            '.post-content',
            '.entry-content',
            'main',
            '#main-content'
        ];

        for (const selector of mainSelectors) {
            const element = $(selector);
            if (element.length) {
                content = element.text().trim();
                if (content.length > 100) break;
            }
        }

        // If no content found from main selectors, get all paragraphs
        if (!content) {
            const paragraphs = [];
            $('p').each((i, elem) => {
                const text = $(elem).text().trim();
                if (text.length > 50) {
                    paragraphs.push(text);
                }
            });
            content = paragraphs.join('\n\n');
        }

        return content.trim();
    } catch (error) {
        console.error('Error extracting content:', error);
        throw new Error('Failed to extract content from URL');
    }
}

// POST /api/summarize endpoint
router.post('/summarize', async (req, res) => {
    try {
        const { url, prompt, summaryLevel } = req.body;

        if (!url) {
            return res.status(400).json({ 
                error: 'URL is required' 
            });
        }

        // Extract content from URL
        const content = await extractMainContent(url);

        if (!content) {
            return res.status(400).json({
                error: 'Could not extract content from URL'
            });
        }

        // Generate summary using Gemini API
        const summary = await generateSummary(content, '', summaryLevel, prompt);

        // Save to database
        const [result] = await db.execute(
            'INSERT INTO summaries (url, content, prompt, summary_level, summary_html) VALUES (?, ?, ?, ?, ?)',
            [url, content, prompt || '', summaryLevel || 'medium', summary]
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
        res.status(500).json({ 
            success: false,
            error: error.message || 'Internal server error' 
        });
    }
});

module.exports = router; 