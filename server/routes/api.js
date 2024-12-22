const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { generateSummary } = require('../config/gemini');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

// Function to extract main content from webpage
async function extractMainContent(url) {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        // Extract page title from h1 or title tag
        let pageTitle = '';
        const h1 = $('h1').first().text().trim();
        const titleTag = $('title').text().trim();
        pageTitle = h1 || titleTag || 'Tóm tắt';

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

        return {
            title: pageTitle,
            content: content.trim()
        };
    } catch (error) {
        console.error('Error extracting content:', error);
        throw new Error('Failed to extract content from URL');
    }
}

// GET latest prompt and summary for URL
router.get('/latest-summary', async (req, res) => {
    try {
        const { url, userId } = req.query;

        if (!url || !userId) {
            return res.status(400).json({
                success: false,
                error: 'URL and userId are required'
            });
        }

        // Get latest user prompt for this user
        const [userPrompts] = await db.execute(
            'SELECT * FROM user_prompts WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            [userId]
        );

        // Get latest summary for this URL
        const [summaries] = await db.execute(
            'SELECT s.*, up.prompt as user_prompt, up.summary_level as user_prompt_level ' +
            'FROM summaries s ' +
            'LEFT JOIN user_prompts up ON s.user_prompt_id = up.id ' +
            'WHERE s.url = ? ' +
            'ORDER BY s.created_at DESC LIMIT 1',
            [url]
        );

        res.json({
            success: true,
            data: {
                latestPrompt: userPrompts[0] || null,
                latestSummary: summaries[0] || null
            }
        });

    } catch (error) {
        console.error('Error fetching latest data:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

// POST /api/summarize endpoint
router.post('/summarize', async (req, res) => {
    try {
        const { url, prompt, summaryLevel, userId } = req.body;
        const summaryId = uuidv4();
        let userPromptId = null;

        if (!url) {
            return res.status(400).json({ 
                error: 'URL is required' 
            });
        }

        // Save user prompt if provided
        if (userId) {
            const promptId = uuidv4();
            await db.execute(
                'INSERT INTO user_prompts (id, user_id, prompt, summary_level) VALUES (?, ?, ?, ?)',
                [promptId, userId, prompt || '', summaryLevel || 'medium']
            );
            userPromptId = promptId;
        }

        const { title, content } = await extractMainContent(url);

        if (!content) {
            return res.status(400).json({
                error: 'Could not extract content from URL'
            });
        }

        const summary = await generateSummary(content, summaryLevel, prompt, title);

        // Save to database with UUID and user_prompt_id
        await db.execute(
            'INSERT INTO summaries (id, url, content, prompt, summary_level, summary_html, user_prompt_id, title) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [summaryId, url, content, prompt || '', summaryLevel || 'medium', summary, userPromptId, title]
        );

        res.json({ 
            success: true,
            data: {
                id: summaryId,
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