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

// Function to create slug from title
function createSlug(text) {
    // Mapping Vietnamese characters to ASCII
    const vietnameseMap = {
        'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a', 'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
        'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
        'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
        'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o', 'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
        'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u', 'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
        'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
        'đ': 'd',
        // Uppercase
        'À': 'a', 'Á': 'a', 'Ạ': 'a', 'Ả': 'a', 'Ã': 'a', 'Â': 'a', 'Ầ': 'a', 'Ấ': 'a', 'Ậ': 'a', 'Ẩ': 'a', 'Ẫ': 'a', 'Ă': 'a', 'Ằ': 'a', 'Ắ': 'a', 'Ặ': 'a', 'Ẳ': 'a', 'Ẵ': 'a',
        'È': 'e', 'É': 'e', 'Ẹ': 'e', 'Ẻ': 'e', 'Ẽ': 'e', 'Ê': 'e', 'Ề': 'e', 'Ế': 'e', 'Ệ': 'e', 'Ể': 'e', 'Ễ': 'e',
        'Ì': 'i', 'Í': 'i', 'Ị': 'i', 'Ỉ': 'i', 'Ĩ': 'i',
        'Ò': 'o', 'Ó': 'o', 'Ọ': 'o', 'Ỏ': 'o', 'Õ': 'o', 'Ô': 'o', 'Ồ': 'o', 'Ố': 'o', 'Ộ': 'o', 'Ổ': 'o', 'Ỗ': 'o', 'Ơ': 'o', 'Ờ': 'o', 'Ớ': 'o', 'Ợ': 'o', 'Ở': 'o', 'Ỡ': 'o',
        'Ù': 'u', 'Ú': 'u', 'Ụ': 'u', 'Ủ': 'u', 'Ũ': 'u', 'Ư': 'u', 'Ừ': 'u', 'Ứ': 'u', 'Ự': 'u', 'Ử': 'u', 'Ữ': 'u',
        'Ỳ': 'y', 'Ý': 'y', 'Ỵ': 'y', 'Ỷ': 'y', 'Ỹ': 'y',
        'Đ': 'd'
    };

    // Replace Vietnamese characters with ASCII equivalents
    const normalized = text.split('').map(char => vietnameseMap[char] || char).join('');

    // Get current date and time
    const now = new Date();
    const timestamp = [
        ('0' + now.getDate()).slice(-2),        // dd
        ('0' + (now.getMonth() + 1)).slice(-2), // mm
        now.getFullYear(),                       // yyyy
        ('0' + now.getHours()).slice(-2),       // hh
        ('0' + now.getMinutes()).slice(-2),     // mm
        ('0' + now.getSeconds()).slice(-2)      // ss
    ].join('');

    return normalized
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters except hyphen
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/--+/g, '-')     // Replace multiple - with single -
        .trim()                   // Trim - from start and end
        + '-' + timestamp;        // Add timestamp
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
            'SELECT * FROM user_prompts WHERE user_id = ? AND deleted = FALSE ORDER BY created_at DESC LIMIT 1',
            [userId]
        );

        // Get latest summary for this URL
        const [summaries] = await db.execute(
            'SELECT s.*, up.prompt as user_prompt, up.summary_level as user_prompt_level ' +
            'FROM summaries s ' +
            'LEFT JOIN user_prompts up ON s.user_prompt_id = up.id ' +
            'WHERE s.url = ? AND s.deleted = FALSE ' +
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
        const slug = createSlug(title);

        if (!content) {
            return res.status(400).json({
                error: 'Could not extract content from URL'
            });
        }

        const summary = await generateSummary(content, summaryLevel, prompt, title);

        // Save to database with UUID and user_prompt_id
        await db.execute(
            'INSERT INTO summaries (id, url, content, prompt, summary_level, summary_html, user_prompt_id, title, slug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [summaryId, url, content, prompt || '', summaryLevel || 'medium', summary, userPromptId, title, slug]
        );

        res.json({ 
            success: true,
            data: {
                id: summaryId,
                slug: slug,
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