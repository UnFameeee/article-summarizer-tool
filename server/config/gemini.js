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
function createHtmlTemplate(title) {
    return ` 
Format the output using this HTML structure:
<div class="summary-content">
    <h1 style="text-align: center; color: #72d1a8; font-family: Arial, sans-serif; margin-bottom: 20px; font-size: 18px;">${title}</h1>
    
    <h2 style="color: #72d1a8; margin-top: 20px; font-family: Arial, sans-serif; font-size: 18px;">Key Points</h2>
    <ul style="line-height: 1.6; margin-bottom: 20px; font-size: 15px;">
        [List the main points here]
    </ul>

    <h2 style="color: #72d1a8; margin-top: 20px; font-family: Arial, sans-serif; font-size: 18px;">Detailed Summary</h2>
    <ul style="line-height: 1.8; font-family: Arial, sans-serif; text-align: justify; margin-bottom: 20px; font-size: 14px;">
        [List the detailed summary here using <strong>bold text</strong> for important points]
    </ul>

    <h2 style="color: #72d1a8; margin-top: 20px; font-family: Arial, sans-serif; font-size: 18px;">Conclusions</h2>
    <ul style="line-height: 1.6; font-size: 15px;">
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
function createPrompt(content, level = 'medium', customPrompt = '', title = 'Tóm tắt') {
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
                basePrompt += ', and focusing only on the most essential points';
                break;
            case 'detailed':
                basePrompt += ', and including all significant details and supporting information';
                break;
            default: // medium
                basePrompt += ', and with a balance of main points and key details';
        }

        // Add length constraint
        basePrompt += `. Limit the summary to approximately ${maxLength} characters`;

        // Add HTML template requirement
        basePrompt += `. ${createHtmlTemplate(title)}`;

        // Add language detection instruction
        basePrompt += '\nDetect if a language is mentioned in the prompt and use it as the primary language for the summary. If no language is mentioned, default to the language of the original content before summarizing.';

        // Add the content
        basePrompt += `\n\nContent to summarize:\n${content}`;

        // Log the prompt (without actual content for clarity)
        // const logPrompt = basePrompt;
        // console.log('\nPrompt being sent to Gemini API:');
        // console.log('----------------------------------------');
        // console.log(logPrompt);
        // console.log('----------------------------------------\n');

        return basePrompt;

    } catch (error) {
        throw error;
    }
}

// Function to generate summary
async function generateSummary(content, level = 'medium', customPrompt = '', title = 'Tóm tắt') {
    try {
        const prompt = createPrompt(content, level, customPrompt, title);
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