const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Create a reusable model instance
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Function to create prompt based on summary level
function createPrompt(content, keywords = '', level = 'medium', customPrompt = '') {
    let basePrompt = customPrompt || 'Please summarize the following content';
    
    // Add level-specific instructions
    switch (level) {
        case 'short':
            basePrompt += ' in 3 concise sentences';
            break;
        case 'detailed':
            basePrompt += ' in detail, including all important points';
            break;
        // medium is default
    }

    // Add HTML formatting instruction
    basePrompt += '. Format the output in HTML with appropriate tags (headings, paragraphs, lists)';

    // Add language instruction
    basePrompt += '. Please detect the language of the content and provide the summary in the same language as the original content';

    // Add keywords if provided
    if (keywords) {
        basePrompt += `. Focus on these keywords: ${keywords}`;
    }

    // Add the actual content
    basePrompt += `.\n\nContent: ${content}`;

    // Add final instruction for language handling
    basePrompt += '\n\nNote: The summary should be in the same language as the provided content unless specifically requested otherwise.';

    // Log the prompt with simplified content
    const logPrompt = basePrompt.replace(content, 'content');
    console.log('\nPrompt being sent to Gemini API:');
    console.log('----------------------------------------');
    console.log(logPrompt);
    console.log('----------------------------------------\n');

    return basePrompt;
}

// Function to generate summary
async function generateSummary(content = 'content', keywords = '', level = 'medium', customPrompt = '') {
    try {
        const prompt = createPrompt(content, keywords, level, customPrompt);
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