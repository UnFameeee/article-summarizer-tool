document.addEventListener('DOMContentLoaded', function() {
    const summarizeBtn = document.getElementById('summarizeBtn');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const summaryContainer = document.getElementById('summaryContainer');
    const summaryContent = document.getElementById('summaryContent');
    const viewDetailBtn = document.getElementById('viewDetailBtn');
    const textarea = document.getElementById('customPrompt');
    const currentCount = document.getElementById('currentCount');
    
    // Get API endpoint from config
    const API_ENDPOINT = config.apiEndpoint;
    
    // Check if there's a stored summary to display
    async function checkStoredSummary() {
        const { selectedText, selectedTabUrl, shouldAutoSummarize } = await chrome.storage.local.get([
            'selectedText',
            'selectedTabUrl',
            'shouldAutoSummarize'
        ]);

        // If we have selected text and should auto summarize
        if (selectedText && shouldAutoSummarize) {
            // Get current settings
            const customPrompt = document.getElementById('customPrompt').value;
            const summaryLevel = document.querySelector('input[name="summaryLevel"]:checked').value;

            // Show loading
            loadingDiv.style.display = 'block';
            errorDiv.style.display = 'none';
            summaryContainer.style.display = 'none';

            try {
                // Send request to API
                const response = await fetch(`${API_ENDPOINT}/api/summarize`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        url: selectedTabUrl,
                        content: selectedText,
                        prompt: customPrompt,
                        summaryLevel: summaryLevel
                    })
                });

                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || 'Failed to get summary');
                }

                // Display summary
                summaryContent.innerHTML = data.data.summary;
                summaryContainer.style.display = 'block';
                
                if (data.data.slug) {
                    viewDetailBtn.style.display = 'block';
                    viewDetailBtn.onclick = () => {
                        chrome.tabs.create({
                            url: `${API_ENDPOINT}/summary/${data.data.slug}`
                        });
                    };
                }
            } catch (error) {
                console.error('Error:', error);
                errorDiv.textContent = error.message || 'Error: Could not generate summary. Please try again.';
                errorDiv.style.display = 'block';
            } finally {
                loadingDiv.style.display = 'none';
                // Clear stored data
                chrome.storage.local.remove(['selectedText', 'selectedTabUrl', 'shouldAutoSummarize']);
            }
        }
    }

    // Character count function
    function updateCharCount() {
        const count = textarea.value.length;
        currentCount.textContent = count;
        
        if (count > 4000) {
            currentCount.style.color = '#e74c3c';
        } else {
            currentCount.style.color = '#636e72';
        }
    }

    // Add character count event listeners
    textarea.addEventListener('input', updateCharCount);
    textarea.addEventListener('keyup', updateCharCount);
    textarea.addEventListener('paste', updateCharCount);

    // Initial character count
    updateCharCount();

    // Load saved settings
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
            const response = await fetch(`${API_ENDPOINT}/api/latest-summary?url=${encodeURIComponent(tab.url)}&userId=${userId}`);
            const data = await response.json();

            if (data.success) {
                // Set the saved prompt and summary level from latest user prompt
                if (data.data.latestPrompt) {
                    document.getElementById('customPrompt').value = data.data.latestPrompt.prompt;
                    document.querySelector(`input[name="summaryLevel"][value="${data.data.latestPrompt.summary_level}"]`).checked = true;
                    updateCharCount();
                }
            }
        } catch (error) {
            console.error('Error loading saved settings:', error);
        }
    }

    // Call initial functions
    loadSavedSettings();
    checkStoredSummary();

    summarizeBtn.addEventListener('click', async function() {
        try {
            // Show loading
            loadingDiv.style.display = 'block';
            errorDiv.style.display = 'none';
            summaryContainer.style.display = 'none';
            summarizeBtn.disabled = true;
            summarizeBtn.classList.add('disabled');

            // Get current tab URL and user ID
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            const { userId } = await chrome.storage.local.get(['userId']);
            
            // Get values
            const customPrompt = document.getElementById('customPrompt').value;
            const summaryLevel = document.querySelector('input[name="summaryLevel"]:checked').value;

            // Send request to server
            const response = await fetch(`${API_ENDPOINT}/api/summarize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'YOUR_API_KEY',
                    'X-Extension-ID': chrome.runtime.id
                },
                body: JSON.stringify({
                    url: tab.url,
                    prompt: customPrompt,
                    summaryLevel: summaryLevel,
                    userId: userId
                })
            });

            // Check if response is JSON
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Server error. Please try again later.");
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Unable to generate summary. Please try again.');
            }

            // Display summary
            summaryContent.innerHTML = data.data.summary;
            summaryContainer.style.display = 'block';
            
            // Setup view detail button
            if (data.data.slug) {
                viewDetailBtn.style.display = 'block';
                viewDetailBtn.onclick = () => {
                    chrome.tabs.create({
                        url: `${API_ENDPOINT}/summary/${data.data.slug}`
                    });
                };
            }

        } catch (error) {
            console.error('Error:', error);
            // Show user-friendly error message
            let userMessage = 'Sorry, we encountered an error. Please try again.';
            
            if (!navigator.onLine) {
                userMessage = 'Please check your internet connection and try again.';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                userMessage = 'Unable to connect to server. Please try again later.';
            } else if (error.message.includes('timeout')) {
                userMessage = 'Request timed out. Please try again.';
            }
            
            errorDiv.textContent = userMessage;
            errorDiv.style.display = 'block';
        } finally {
            loadingDiv.style.display = 'none';
            summarizeBtn.disabled = false;
            summarizeBtn.classList.remove('disabled');
        }
    });

    // Listen for messages from parent window
    window.addEventListener('message', async function(event) {
        if (event.data.type === 'SELECTED_TEXT') {
            const { selectedText, url } = event.data.data;
            
            // Show loading
            loadingDiv.style.display = 'block';
            errorDiv.style.display = 'none';
            summaryContainer.style.display = 'none';
            summarizeBtn.disabled = true;
            summarizeBtn.classList.add('disabled');

            try {
                // Get current settings
                const customPrompt = document.getElementById('customPrompt').value;
                const summaryLevel = document.querySelector('input[name="summaryLevel"]:checked').value;

                // Send request to API
                const response = await fetch(`${API_ENDPOINT}/api/summarize`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': 'YOUR_API_KEY',
                        'X-Extension-ID': chrome.runtime.id
                    },
                    body: JSON.stringify({
                        url: url,
                        content: selectedText,
                        prompt: customPrompt,
                        summaryLevel: summaryLevel
                    })
                });

                // Check if response is JSON
                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error("Server error. Please try again later.");
                }

                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || 'Unable to generate summary. Please try again.');
                }

                // Display summary
                summaryContent.innerHTML = data.data.summary;
                summaryContainer.style.display = 'block';
                
                if (data.data.slug) {
                    viewDetailBtn.style.display = 'block';
                    viewDetailBtn.onclick = () => {
                        window.open(`${API_ENDPOINT}/summary/${data.data.slug}`);
                    };
                }
            } catch (error) {
                console.error('Error:', error);
                // Show user-friendly error message
                let userMessage = 'Sorry, we encountered an error. Please try again.';
                
                if (!navigator.onLine) {
                    userMessage = 'Please check your internet connection and try again.';
                } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    userMessage = 'Unable to connect to server. Please try again later.';
                } else if (error.message.includes('timeout')) {
                    userMessage = 'Request timed out. Please try again.';
                }
                
                errorDiv.textContent = userMessage;
                errorDiv.style.display = 'block';
            } finally {
                loadingDiv.style.display = 'none';
                summarizeBtn.disabled = false;
                summarizeBtn.classList.remove('disabled');
            }
        }
    });

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            html: true,
            template: `
                <div class="tooltip" role="tooltip">
                    <div class="tooltip-arrow"></div>
                    <div class="tooltip-inner text-start" style="max-width: 200px;"></div>
                </div>
            `
        });
    });
}); 