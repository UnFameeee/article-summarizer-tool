const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const cheerio = require('cheerio');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function extractMainContent(html) {
    const $ = cheerio.load(html);

    // Remove all unwanted elements
    $('script, style, iframe, nav, header, footer, aside, .header, .footer, .nav, .menu, .sidebar, .ad, .advertisement, .banner, .social, .share, .comment, .related, .recommended').remove();
    
    // Get text from specific article containers first
    let mainContent = '';
    const articleSelectors = [
        'article',
        '[role="main"]',
        '[role="article"]',
        '.article-content',
        '.post-content',
        '.entry-content',
        '.content-area',
        '.main-content',
        '#main-content',
        '.story-content'
    ];

    // Try to find content in article containers first
    for (const selector of articleSelectors) {
        const content = $(selector).text();
        if (content && content.length > mainContent.length) {
            mainContent = content;
        }
    }

    // If no article content found, try to get content from body paragraphs
    if (!mainContent) {
        const paragraphs = [];
        $('body p').each((i, elem) => {
            const text = $(elem).text().trim();
            // Only include paragraphs with meaningful content (more than 100 characters)
            if (text.length > 100) {
                paragraphs.push(text);
            }
        });
        mainContent = paragraphs.join('\n\n');
    }

    // Clean the text
    return mainContent
        .replace(/\s+/g, ' ')        // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n')   // Replace multiple newlines with single newline
        .replace(/[^\S\r\n]+/g, ' ') // Replace multiple horizontal whitespace with single space
        .replace(/\s*\n\s*/g, '\n')  // Clean up spaces around newlines
        .trim()                      // Remove leading/trailing whitespace
        .slice(0, 30000);            // Limit content length
}

async function callGeminiAPI(url, prompt, summaryLevel) {
    try {
        // Fetch page content
        const response = await axios.get(url);
        
        // Extract and clean main content
        const content = await extractMainContent(response.data);

        // Initialize the model
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Base HTML formatting instructions
        const htmlFormatInstructions = `
Format the output in HTML with appropriate tags (headings, paragraphs, lists) for human-friendly readability. Use a clean and consistent structure with the following skeleton:

1. Document Title: Use <h1> for the main title and center it. Add inline styles for font and color for better visual clarity.
2. Section Headings: Use <h2> for section titles with a distinct color to differentiate them.
3. Content: Use <p> tags for explanatory content, with critical points highlighted using <strong>.
4. Lists: Use <ul> and <li> for bulleted points, ensuring each list item is concise and readable.
5. Styling: Add inline styles to improve readability (e.g., font-family, line-height, colors).
6. Consistency: Ensure spacing and alignment are uniform for a polished and professional layout.
`;

        // Format the prompt based on summary level
        let formattedPrompt = `${htmlFormatInstructions}\n\nContent to summarize:\n${content}\n\n`;
        
        if (prompt) {
            formattedPrompt += `Custom Instructions: ${prompt}\n\n`;
        }

        switch(summaryLevel) {
            case 'short':
                formattedPrompt += "Please provide a summary with approximately 1000 characters (not counting HTML tags and headings). The summary should be concise while covering the essential points.";
                break;
            case 'medium':
                formattedPrompt += "Please provide a summary with approximately 1500 characters (not counting HTML tags and headings). The summary should provide a balanced coverage of all important aspects.";
                break;
            case 'detailed':
                formattedPrompt += "Please provide a comprehensive summary with approximately 2000 characters (not counting HTML tags and headings). The summary should cover all significant details and supporting information.";
                break;
        }

        // Generate content
        const result = await model.generateContent(formattedPrompt);
        const geminiResponse = await result.response;
        return geminiResponse.text();

    } catch (error) {
        console.error('Error in callGeminiAPI:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        throw new Error('Failed to process content: ' + error.message);
    }
}

router.post('/summarize', async (req, res) => {
    try {
        const { url, prompt, summaryLevel } = req.body;

        // Call Gemini API
        const summary = await callGeminiAPI(url, prompt, summaryLevel);

        // Save to database
        const [result] = await db.execute(
            'INSERT INTO summaries (url, prompt, summary_level, summary_html) VALUES (?, ?, ?, ?)',
            [url, prompt, summaryLevel, summary]
        );

        // Return response
        res.json({
            id: result.insertId,
            summary: summary
        });

    } catch (error) {
        console.error('Error in /api/summarize:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 