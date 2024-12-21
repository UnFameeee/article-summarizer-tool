// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Chunk Sum extension installed');
    
    // Create context menu
    chrome.contextMenus.create({
        id: 'summarizeSelection',
        title: 'Summarize Selection',
        contexts: ['selection']
    });

    // Create context menu for page
    chrome.contextMenus.create({
        id: 'summarizePage',
        title: 'Summarize Entire Page',
        contexts: ['page']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'summarizeSelection') {
        // Store selected text and open popup
        chrome.storage.local.set({ 
            selectedText: info.selectionText,
            summarizeType: 'selection'
        }, () => {
            chrome.action.openPopup();
        });
    } else if (info.menuItemId === 'summarizePage') {
        // Open popup for entire page
        chrome.storage.local.set({ 
            summarizeType: 'page'
        }, () => {
            chrome.action.openPopup();
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