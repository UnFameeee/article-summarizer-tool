const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Create a reusable model instance
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Function to generate summary
async function generateSummary(content, keywords = '') {
    try {
        // Create prompt based on whether keywords are provided
        const prompt = keywords 
            ? `Please provide a concise summary of the following content, focusing on these keywords: ${keywords}.\n\nContent: ${content}`
            : `Please provide a concise summary of the following content.\n\nContent: ${content}`;

        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error generating summary:', error);
        throw new Error('Failed to generate summary');
    }
}

module.exports = {
    generateSummary
}; 