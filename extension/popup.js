document.addEventListener('DOMContentLoaded', function() {
    const summarizeBtn = document.getElementById('summarizeBtn');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const summaryContainer = document.getElementById('summaryContainer');
    const summaryContent = document.getElementById('summaryContent');
    const viewDetailBtn = document.getElementById('viewDetailBtn');
    
    // Load saved prompt and summary level
    async function loadSavedSettings() {
        try {
            // Get current tab URL
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            
            // Get or create user ID
            let { userId } = await chrome.storage.local.get(['userId']);
            if (!userId) {
                userId = 'user_' + Math.random().toString(36).substr(2, 9);
                await chrome.storage.local.set({ userId });
            }

            // Fetch latest data from server
            const response = await fetch(`http://localhost:3000/api/latest-summary?url=${encodeURIComponent(tab.url)}&userId=${userId}`);
            const data = await response.json();

            if (data.success) {
                // Set the saved prompt and summary level from latest user prompt
                if (data.data.latestPrompt) {
                    document.getElementById('customPrompt').value = data.data.latestPrompt.prompt;
                    document.querySelector(`input[name="summaryLevel"][value="${data.data.latestPrompt.summary_level}"]`).checked = true;
                }

                // Display the latest summary if exists
                if (data.data.latestSummary) {
                    summaryContent.innerHTML = data.data.latestSummary.summary_html;
                    summaryContainer.style.display = 'block';
                    
                    if (data.data.latestSummary.id) {
                        viewDetailBtn.style.display = 'block';
                        viewDetailBtn.onclick = () => {
                            chrome.tabs.create({
                                url: `http://localhost:3000/summary/${data.data.latestSummary.id}`
                            });
                        };
                    }
                }
            }
        } catch (error) {
            console.error('Error loading saved settings:', error);
        }
    }

    // Call this function when popup is opened
    loadSavedSettings();

    summarizeBtn.addEventListener('click', async function() {
        try {
            // Show loading
            loadingDiv.style.display = 'block';
            errorDiv.style.display = 'none';
            summaryContainer.style.display = 'none';

            // Get current tab URL and user ID
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            const { userId } = await chrome.storage.local.get(['userId']);
            
            // Get values
            const customPrompt = document.getElementById('customPrompt').value;
            const summaryLevel = document.querySelector('input[name="summaryLevel"]:checked').value;

            // Send request to server
            const response = await fetch('http://localhost:3000/api/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: tab.url,
                    prompt: customPrompt,
                    summaryLevel: summaryLevel,
                    userId: userId
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error);
            }

            // Display summary
            summaryContent.innerHTML = data.data.summary;
            summaryContainer.style.display = 'block';
            
            // Setup view detail button
            if (data.data.id) {
                viewDetailBtn.style.display = 'block';
                viewDetailBtn.onclick = () => {
                    chrome.tabs.create({
                        url: `http://localhost:3000/summary/${data.data.id}`
                    });
                };
            }

        } catch (error) {
            console.error('Error:', error);
            errorDiv.textContent = error.message || 'Error: Could not generate summary. Please try again.';
            errorDiv.style.display = 'block';
        } finally {
            loadingDiv.style.display = 'none';
        }
    });
}); 