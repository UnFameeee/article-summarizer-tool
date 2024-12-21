document.addEventListener('DOMContentLoaded', function() {
    const summarizeBtn = document.getElementById('summarizeBtn');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const summaryContainer = document.getElementById('summaryContainer');
    const summaryContent = document.getElementById('summaryContent');
    const viewDetailBtn = document.getElementById('viewDetailBtn');
    
    // Load saved prompt and summary level
    chrome.storage.local.get(['customPrompt', 'summaryLevel'], function(data) {
        if (data.customPrompt) {
            document.getElementById('customPrompt').value = data.customPrompt;
        }
        if (data.summaryLevel) {
            document.querySelector(`input[name="summaryLevel"][value="${data.summaryLevel}"]`).checked = true;
        }
    });

    summarizeBtn.addEventListener('click', async function() {
        try {
            // Show loading
            loadingDiv.style.display = 'block';
            errorDiv.style.display = 'none';
            summaryContainer.style.display = 'none';

            // Get current tab URL
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            
            // Get values
            const customPrompt = document.getElementById('customPrompt').value;
            const summaryLevel = document.querySelector('input[name="summaryLevel"]:checked').value;

            // Save settings
            chrome.storage.local.set({
                customPrompt: customPrompt,
                summaryLevel: summaryLevel
            });

            // Send request to server
            const response = await fetch('http://localhost:3000/api/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: tab.url,
                    prompt: customPrompt,
                    summaryLevel: summaryLevel
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