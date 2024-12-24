const API_ENDPOINT = 'http://localhost:3000';

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Chunk Sum extension installed');
    
    // Create context menu
    chrome.contextMenus.create({
        id: 'summarizeSelection',
        title: 'Summarize With ChunkSum',
        contexts: ['selection']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'summarizeSelection') {
        // Get current settings
        chrome.storage.local.get(['customPrompt', 'summaryLevel'], async (result) => {
            const customPrompt = result.customPrompt || '';
            const summaryLevel = result.summaryLevel || 'medium';

            try {
                // Send request to API
                const response = await fetch(`${API_ENDPOINT}/api/summarize`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        text: info.selectionText,
                        customPrompt: customPrompt || '',
                        level: summaryLevel || 'medium'
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to get summary');
                }

                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || 'Failed to get summary');
                }

                // Store summary in local storage
                chrome.storage.local.set({
                    latestSummary: data.data.summary,
                    summaryId: data.data.id,
                    error: null
                }, () => {
                    // Open popup after storing data
                    chrome.action.openPopup();
                });

            } catch (error) {
                console.error('Error:', error);
                // Store error in local storage
                chrome.storage.local.set({
                    error: error.message || 'Failed to generate summary'
                }, () => {
                    chrome.action.openPopup();
                });
            }
        });
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSelectedText') {
        chrome.storage.local.get(['selectedText', 'summarizeType'], (data) => {
            sendResponse(data);
            // Clear stored text after sending
            chrome.storage.local.remove(['selectedText', 'summarizeType']);
        });
        return true; // Will respond asynchronously
    }
}); 