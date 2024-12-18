// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Web Summarizer extension installed');
});

// Optional: Add context menu
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'summarizeSelection',
        title: 'Summarize Selection',
        contexts: ['selection']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'summarizeSelection') {
        // Open popup with selected text
        chrome.storage.local.set({ selectedText: info.selectionText }, () => {
            chrome.action.openPopup();
        });
    }
}); 