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
        // Inject floating container with selected text
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: injectFloatingContainer,
            args: [{
                selectedText: info.selectionText,
                url: tab.url
            }]
        });
    }
});

// Function to inject floating container
function injectFloatingContainer(data) {
    // Create container if not exists
    if (!document.getElementById('chunksum-container')) {
        const container = document.createElement('div');
        container.id = 'chunksum-container';
        
        // Style for container
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 550px;
            height: 600px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 2147483647;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;

        // Create draggable header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 8px;
            background: #72d1a8;
            cursor: move;
            display: flex;
            justify-content: flex-end;
            user-select: none;
        `;
        header.innerHTML = `
            <button style="
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 24px;
                font-weight: bold;
                padding: 0;
                border-radius: 4px;
                transition: background-color 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                line-height: 1;
                margin-right: 4px;
            ">×</button>
        `;

        // Add hover effect for close button
        const closeBtn = header.querySelector('button');
        closeBtn.addEventListener('mouseover', () => {
            closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        });
        closeBtn.addEventListener('mouseout', () => {
            closeBtn.style.backgroundColor = 'transparent';
        });

        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.src = chrome.runtime.getURL('popup.html');
        iframe.style.cssText = `
            flex: 1;
            width: 100%;
            border: none;
            background: white;
        `;

        // Wait for iframe to load then send message
        iframe.onload = () => {
            iframe.contentWindow.postMessage({
                type: 'SELECTED_TEXT',
                data: {
                    selectedText: data.selectedText,
                    url: data.url
                }
            }, '*');
        };

        // Add drag functionality
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        header.addEventListener('mousedown', function(e) {
            isDragging = true;
            initialX = e.clientX - container.offsetLeft;
            initialY = e.clientY - container.offsetTop;
        });

        document.addEventListener('mousemove', function(e) {
            if (isDragging) {
                e.preventDefault();
                // Calculate new position
                let newX = e.clientX - initialX;
                let newY = e.clientY - initialY;
                
                // Get viewport dimensions
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                
                // Get container dimensions
                const containerWidth = container.offsetWidth;
                const containerHeight = container.offsetHeight;
                
                // Add some padding to ensure container stays fully in viewport
                const padding = 2;
                
                // Limit X position
                newX = Math.min(Math.max(newX, padding), viewportWidth - containerWidth - padding);
                
                // Limit Y position
                newY = Math.min(Math.max(newY, padding), viewportHeight - containerHeight - padding);
                
                // Apply new position
                container.style.left = newX + 'px';
                container.style.top = newY + 'px';
                container.style.right = 'auto';
            }
        });

        document.addEventListener('mouseup', function() {
            isDragging = false;
        });

        // Close button functionality
        header.querySelector('button').addEventListener('click', function() {
            container.remove();
        });

        // Append elements
        container.appendChild(header);
        container.appendChild(iframe);
        document.body.appendChild(container);
    }
}

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