const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function callGeminiAPI(url, prompt, summaryLevel) {
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
    let formattedPrompt = `${htmlFormatInstructions}\n\nURL: ${url}\n\n`;
    
    if (prompt) {
        formattedPrompt += `Custom Instructions: ${prompt}\n\n`;
    }

    switch(summaryLevel) {
        case 'short':
            formattedPrompt += "Please provide a very concise summary in 3 short sentences, following the HTML formatting instructions above.";
            break;
        case 'medium':
            formattedPrompt += "Please provide a balanced summary covering the main points, following the HTML formatting instructions above.";
            break;
        case 'detailed':
            formattedPrompt += "Please provide a detailed summary with all important information, following the HTML formatting instructions above.";
            break;
    }

    // Generate content
    const result = await model.generateContent(formattedPrompt);
    const response = await result.response;
    return response.text();
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