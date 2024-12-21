const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config();

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Constants from environment variables
const MAX_CONTENT_LENGTH = process.env.MAX_CONTENT_LENGTH || 7000000;
const MAX_CUSTOM_PROMPT_LENGTH = process.env.MAX_CUSTOM_PROMPT_LENGTH || 5000;

// Function to create HTML template
function createHtmlTemplate() {
    return `
Format the output using this HTML structure:
<div class="summary-content">
    <h1 style="text-align: center; color: #2c3e50; font-family: Arial, sans-serif; margin-bottom: 20px;">Document Summary</h1>
    
    <h2 style="color: #3498db; margin-top: 20px; font-family: Arial, sans-serif;">Key Points</h2>
    <ul style="line-height: 1.6; margin-bottom: 20px;">
        [List the main points here]
    </ul>

    <h2 style="color: #3498db; margin-top: 20px; font-family: Arial, sans-serif;">Detailed Summary</h2>
    <p style="line-height: 1.8; font-family: Arial, sans-serif; text-align: justify; margin-bottom: 20px;">
        [Provide the detailed summary here, using <strong>bold text</strong> for important points]
    </p>

    <h2 style="color: #3498db; margin-top: 20px; font-family: Arial, sans-serif;">Conclusions</h2>
    <ul style="line-height: 1.6;">
        [List the key takeaways here]
    </ul>
</div>`;
}

// Function to get max length based on summary level
function getMaxLengthForLevel(level) {
    switch(level) {
        case 'short': return 1000;
        case 'detailed': return 2000;
        default: return 1500; // medium
    }
}

// Function to validate and process content
function processContent(content) {
    if (content.length > MAX_CONTENT_LENGTH) {
        console.log(`Content truncated from ${content.length} to ${MAX_CONTENT_LENGTH} characters`);
        return content.substring(0, MAX_CONTENT_LENGTH);
    }
    return content;
}

// Function to validate custom prompt
function validateCustomPrompt(prompt) {
    if (prompt && prompt.length > MAX_CUSTOM_PROMPT_LENGTH) {
        throw new Error(`Custom prompt exceeds the maximum allowed length of ${MAX_CUSTOM_PROMPT_LENGTH} characters`);
    }
    return prompt;
}

// Function to create prompt
function createPrompt(content, keywords = '', level = 'medium', customPrompt = '') {
    try {
        // Validate and process inputs
        content = processContent(content);
        customPrompt = validateCustomPrompt(customPrompt);
        const maxLength = getMaxLengthForLevel(level);

        // Build the prompt
        let basePrompt = customPrompt || 'Please provide a comprehensive summary of the following content';
        
        // Add level-specific instructions
        switch (level) {
            case 'short':
                basePrompt += ' focusing only on the most essential points';
                break;
            case 'detailed':
                basePrompt += ' including all significant details and supporting information';
                break;
            default: // medium
                basePrompt += ' with a balance of main points and key details';
        }

        // Add length constraint
        basePrompt += `. Limit the summary to approximately ${maxLength} characters`;

        // Add HTML template requirement
        basePrompt += `. ${createHtmlTemplate()}`;

        // Add language detection instruction
        basePrompt += '\nDetect if a language is mentioned in the prompt and use it as the primary language for the summary. If no language is mentioned, default to the language of the original content before summarizing.';

        // Add keywords if provided
        if (keywords) {
            basePrompt += `\nEnsure to focus on and highlight these keywords: ${keywords}`;
        }

        // Add the content
        basePrompt += `\n\nContent to summarize:\n${content}`;

        // Log the prompt (without actual content for clarity)
        // const logPrompt = basePrompt.replace(content, '[CONTENT]');
        console.log('\nPrompt being sent to Gemini API:');
        console.log('----------------------------------------');
        console.log(logPrompt);
        console.log('----------------------------------------\n');

        return basePrompt;

    } catch (error) {
        throw error;
    }
}

// Function to generate summary
async function generateSummary(content, keywords = '', level = 'medium', customPrompt = '') {
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
    generateSummary,
    MAX_CONTENT_LENGTH,
    MAX_CUSTOM_PROMPT_LENGTH
}; 