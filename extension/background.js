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
        // Store selected text and tab info
        chrome.storage.local.set({
            selectedText: info.selectionText,
            selectedTabUrl: tab.url,
            shouldAutoSummarize: true
        }, async () => {
            // Get current window to calculate position
            const windows = await chrome.windows.getAll();
            const currentWindow = windows[0];
            
            // Open popup immediately
            chrome.windows.create({
                url: chrome.runtime.getURL('popup.html'),
                type: 'popup',
                width: 500,
                height: 600,
                left: Math.max(currentWindow.left + currentWindow.width - 520, 0),
                top: currentWindow.top + 20,
                focused: true,
                state: 'normal'
            });
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