// Store API URL
const API_URL = 'http://localhost:3000/api';

// Function to fetch keywords from server
async function fetchKeywords() {
    try {
        const response = await fetch(`${API_URL}/keywords`);
        const data = await response.json();
        
        if (data.success) {
            displayKeywords(data.data);
        }
    } catch (error) {
        console.error('Error fetching keywords:', error);
        showError('Failed to fetch keywords');
    }
}

// Function to display keywords
function displayKeywords(keywords) {
    const keywordsList = document.getElementById('keywordsList');
    keywordsList.innerHTML = '';
    
    keywords.forEach(keyword => {
        const chip = document.createElement('span');
        chip.className = 'keyword-chip';
        chip.textContent = keyword.keyword;
        keywordsList.appendChild(chip);
    });
}

// Function to add new keyword
async function addKeyword(keyword) {
    try {
        const response = await fetch(`${API_URL}/keywords`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ keyword })
        });
        
        const data = await response.json();
        
        if (data.success) {
            fetchKeywords();
            document.getElementById('newKeyword').value = '';
        } else {
            showError(data.error);
        }
    } catch (error) {
        console.error('Error adding keyword:', error);
        showError('Failed to add keyword');
    }
}

// Function to get current tab content
async function getCurrentTabContent() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
            // Get main content (you might want to customize this based on your needs)
            const content = document.body.innerText;
            return {
                url: window.location.href,
                content: content
            };
        }
    });
    
    return result[0].result;
}

// Function to summarize content
async function summarizeContent() {
    try {
        showLoading(true);
        showError('');
        
        // Get page content
        const pageData = await getCurrentTabContent();
        
        // Get keywords
        const response = await fetch(`${API_URL}/keywords`);
        const keywordsData = await response.json();
        const keywords = keywordsData.data.map(k => k.keyword).join(',');
        
        // Send to server for summarization
        const summaryResponse = await fetch(`${API_URL}/summary`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: pageData.url,
                content: pageData.content,
                keywords: keywords
            })
        });
        
        const summaryData = await summaryResponse.json();
        
        if (summaryData.success) {
            displaySummary(summaryData.data.summary);
        } else {
            showError(summaryData.error);
        }
    } catch (error) {
        console.error('Error summarizing content:', error);
        showError('Failed to summarize content');
    } finally {
        showLoading(false);
    }
}

// UI Helper Functions
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('summarizeBtn').disabled = show;
}

function showError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.style.display = message ? 'block' : 'none';
}

function displaySummary(summary) {
    const container = document.getElementById('summaryContainer');
    const content = document.getElementById('summaryContent');
    container.style.display = 'block';
    content.textContent = summary;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Fetch initial keywords
    fetchKeywords();
    
    // Add keyword on Enter
    document.getElementById('newKeyword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const keyword = e.target.value.trim();
            if (keyword) {
                addKeyword(keyword);
            }
        }
    });
    
    // Summarize button click
    document.getElementById('summarizeBtn').addEventListener('click', summarizeContent);
}); 