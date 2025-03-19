// Global state
let conversationState = {
    isActive: false,
    isPaused: false,
    history: [],
    currentSpeaker: null,
    activeRetry: null,
    model1: null,
    model2: null,
    processingResponse: false, // Flag to track if we're currently processing a response
    stats: {
        startTime: null,
        messageCount: 0,
        estimatedTokens: 0
    }
};

// Get DOM elements
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const conversationDiv = document.getElementById('conversation');
const sidebarToggle = document.getElementById('sidebar-toggle');
const resizeHandle = document.getElementById('resize-handle');

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    startBtn.addEventListener('click', startConversation);
    pauseBtn.addEventListener('click', togglePause);
    resetBtn.addEventListener('click', resetConversation);
    sidebarToggle.addEventListener('click', toggleSidebar);
    
    // Initialize sidebar resize functionality
    initSidebarResize();
    
    // Check if we have a saved sidebar state
    const sidebarState = localStorage.getItem('sidebarState');
    const appContainer = document.querySelector('.app-container');
    
    if (sidebarState === 'collapsed') {
        appContainer.classList.add('sidebar-collapsed');
        appContainer.style.gridTemplateColumns = '40px 1fr';
        resizeHandle.style.left = '40px';
    } else {
        // If expanded, restore any saved width
        const savedWidth = localStorage.getItem('sidebarWidth');
        if (savedWidth) {
            const width = parseInt(savedWidth);
            if (width >= 200 && width <= 500) {
                appContainer.style.gridTemplateColumns = `${width}px 1fr`;
                resizeHandle.style.left = `${width}px`;
            }
        }
    }
    
    // Initialize theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.checked = true;
    }
    
    // Handle theme toggle
    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        }
    });
    
    // Handle pause slider
    const pauseSlider = document.getElementById('pause-duration');
    const pauseValue = document.getElementById('pause-value');
    
    pauseSlider.addEventListener('input', () => {
        pauseValue.textContent = `${pauseSlider.value}ms`;
    });
    
    // Initialize stats container
    updateStats();
});

// Start the conversation between models
async function startConversation() {
    // Get selected models
    const model1Id = document.getElementById('model1').value;
    const model2Id = document.getElementById('model2').value;
    
    // Validate selections
    if (!model1Id || !model2Id) {
        alert('Please select two models to start the conversation');
        return;
    }
    
    // Fetch model configurations
    conversationState.model1 = await getModelById(model1Id);
    conversationState.model2 = await getModelById(model2Id);
    
    // Use custom system prompts if provided
    const model1SystemPrompt = document.getElementById('model1-system-prompt').value;
    const model2SystemPrompt = document.getElementById('model2-system-prompt').value;
    
    if (model1SystemPrompt.trim()) {
        conversationState.model1.system_prompt = model1SystemPrompt;
    }
    
    if (model2SystemPrompt.trim()) {
        conversationState.model2.system_prompt = model2SystemPrompt;
    }
    
    // Get API keys if required
    if (conversationState.model1.requires_api_key) {
        conversationState.model1.api_key = document.getElementById('model1-api-key').value;
    }
    
    if (conversationState.model2.requires_api_key) {
        conversationState.model2.api_key = document.getElementById('model2-api-key').value;
    }
    
    // Update UI
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resetBtn.disabled = false;
    conversationDiv.innerHTML = '';
    
    // Initialize conversation state
    conversationState.isActive = true;
    conversationState.isPaused = false;
    conversationState.history = [];
    conversationState.currentSpeaker = 1; // Start with model1
    
    // Initialize stats
    conversationState.stats = {
        startTime: new Date(),
        messageCount: 0,
        estimatedTokens: 0
    };
    updateStats();
    
    // Set up stats update interval
    conversationState.statsInterval = setInterval(updateStats, 1000);
    
    // Begin the conversation
    await takeTurn();
}

// Reset the conversation
function resetConversation() {
    if (conversationState.isActive) {
        // Save conversation history
        saveConversationHistory();
        
        // Clear stats interval
        if (conversationState.statsInterval) {
            clearInterval(conversationState.statsInterval);
        }
        
        // Reset state
        conversationState.isActive = false;
        conversationState.isPaused = false;
        conversationState.currentSpeaker = null;
        conversationState.history = [];
        conversationState.processingResponse = false;
        
        // Reset stats
        conversationState.stats = {
            startTime: null,
            messageCount: 0,
            estimatedTokens: 0
        };
        updateStats();
        
        // Update UI
        conversationDiv.innerHTML = '';
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        pauseBtn.textContent = 'Pause';
        pauseBtn.classList.remove('resume');
        resetBtn.disabled = true;
    }
}

// Toggle conversation pause/resume
function togglePause() {
    if (!conversationState.isActive) return;
    
    conversationState.isPaused = !conversationState.isPaused;
    
    if (conversationState.isPaused) {
        pauseBtn.textContent = 'Resume';
        pauseBtn.classList.add('resume');
    } else {
        pauseBtn.textContent = 'Pause';
        pauseBtn.classList.remove('resume');
        
        // If we're resuming and not currently processing, trigger next turn
        if (!conversationState.processingResponse) {
            setTimeout(takeTurn, parseInt(document.getElementById('pause-duration').value, 10));
        }
    }
}

// Toggle sidebar collapse
function toggleSidebar() {
    const appContainer = document.querySelector('.app-container');
    appContainer.classList.toggle('sidebar-collapsed');
    
    // If expanding, update resize handle position
    if (!appContainer.classList.contains('sidebar-collapsed')) {
        const savedWidth = localStorage.getItem('sidebarWidth');
        if (savedWidth) {
            const width = parseInt(savedWidth);
            if (width >= 200 && width <= 500) {
                appContainer.style.gridTemplateColumns = `${width}px 1fr`;
                resizeHandle.style.left = `${width}px`;
            }
        } else {
            // Default to 300px if no saved width
            appContainer.style.gridTemplateColumns = '300px 1fr';
            resizeHandle.style.left = '300px';
        }
    } else {
        // Make sure grid columns are set correctly when collapsed
        appContainer.style.gridTemplateColumns = '40px 1fr';
        resizeHandle.style.left = '40px';
    }
    
    // Save state in localStorage
    if (appContainer.classList.contains('sidebar-collapsed')) {
        localStorage.setItem('sidebarState', 'collapsed');
    } else {
        localStorage.setItem('sidebarState', 'expanded');
    }
}

// Initialize sidebar resizing
function initSidebarResize() {
    const appContainer = document.querySelector('.app-container');
    const sidebar = document.querySelector('.sidebar');
    let isResizing = false;
    let lastX;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        lastX = e.clientX;
        resizeHandle.classList.add('active');
        appContainer.classList.add('resizing'); // Add class to prevent text selection
        e.preventDefault(); // Prevent default selection behavior
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        // Don't allow resizing if sidebar is collapsed
        if (appContainer.classList.contains('sidebar-collapsed')) return;
        
        // Use direct mouse position instead of delta calculations
        // This makes the resize more immediate and tied to actual mouse position
        const mouseX = e.clientX;
        const newWidth = Math.max(200, Math.min(500, mouseX));
        
        // Apply the resize directly without animation
        appContainer.style.transition = 'none';
        resizeHandle.style.transition = 'none';
        
        // Update layout
        appContainer.style.gridTemplateColumns = `${newWidth}px 1fr`;
        resizeHandle.style.left = `${newWidth}px`;
        
        // Store the sidebar width in localStorage
        localStorage.setItem('sidebarWidth', newWidth);
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            // Restore transitions after resize is complete
            setTimeout(() => {
                appContainer.style.transition = '';
                resizeHandle.style.transition = '';
            }, 0);
            
            isResizing = false;
            resizeHandle.classList.remove('active');
            appContainer.classList.remove('resizing'); // Remove class after resize
        }
    });
    
    // Restore saved sidebar width if exists
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth && !appContainer.classList.contains('sidebar-collapsed')) {
        const width = parseInt(savedWidth);
        if (width >= 200 && width <= 500) {
            appContainer.style.gridTemplateColumns = `${width}px 1fr`;
            resizeHandle.style.left = `${width}px`;
        }
    }
}

// Update stats display
function updateStats() {
    const totalMessages = document.getElementById('total-messages');
    const totalTokens = document.getElementById('total-tokens');
    const convDuration = document.getElementById('conv-duration');
    
    // Update message count
    totalMessages.textContent = `Messages: ${conversationState.stats.messageCount}`;
    
    // Update token estimate
    totalTokens.textContent = `Tokens: ~${conversationState.stats.estimatedTokens}`;
    
    // Update duration
    if (conversationState.stats.startTime) {
        const duration = Math.floor((new Date() - conversationState.stats.startTime) / 1000);
        let durationStr = '';
        
        if (duration < 60) {
            durationStr = `${duration}s`;
        } else if (duration < 3600) {
            const mins = Math.floor(duration / 60);
            const secs = duration % 60;
            durationStr = `${mins}m ${secs}s`;
        } else {
            const hours = Math.floor(duration / 3600);
            const mins = Math.floor((duration % 3600) / 60);
            durationStr = `${hours}h ${mins}m`;
        }
        
        convDuration.textContent = `Duration: ${durationStr}`;
    } else {
        convDuration.textContent = 'Duration: 0s';
    }
}

// Handle one turn in the conversation
async function takeTurn() {
    // Don't proceed if conversation is inactive or paused
    if (!conversationState.isActive || conversationState.isPaused) return;
    
    // If we're already processing a response, don't start another
    if (conversationState.processingResponse) {
        console.log('Already processing a response, waiting...');
        return;
    }
    
    // Set the processing flag
    conversationState.processingResponse = true;
    
    // Determine current model and other model
    const currentModel = conversationState.currentSpeaker === 1 
        ? conversationState.model1 
        : conversationState.model2;
    
    const modelClass = `model${conversationState.currentSpeaker}`;
    
    // Create thinking message
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = `message ${modelClass} thinking`;
    thinkingDiv.innerHTML = `
        <div class="message-header">${currentModel.name} is thinking</div>
        <div class="message-content">Thinking</div>
    `;
    conversationDiv.appendChild(thinkingDiv);
    scrollToBottom();
    
    try {
        // Prepare the conversation history for the API
        const messages = prepareConversationHistory(currentModel);
        
        // Call the API with streaming
        const response = await streamModelResponse(currentModel, messages, thinkingDiv);
        
        // Add the response to history
        conversationState.history.push({
            role: 'assistant',
            content: response,
            model: currentModel.id,
            timestamp: new Date().toISOString()
        });
        
        // Update stats
        conversationState.stats.messageCount++;
        // Very rough token estimate (1 token ≈ 4 chars)
        conversationState.stats.estimatedTokens += Math.ceil(response.length / 4);
        updateStats();
        
        // Switch speaker
        conversationState.currentSpeaker = conversationState.currentSpeaker === 1 ? 2 : 1;
        
        // Release the processing lock
        conversationState.processingResponse = false;
        
        // Get pause duration from the slider
        const pauseDuration = parseInt(document.getElementById('pause-duration').value);
        
        // Schedule next turn with the configured pause
        setTimeout(takeTurn, pauseDuration);
        
    } catch (error) {
        console.error('Error in model response:', error);
        
        // Replace thinking with error message
        thinkingDiv.className = `message ${modelClass} error-message`;
        thinkingDiv.innerHTML = `
            <div class="message-header">Error: ${currentModel.name}</div>
            <div class="message-content">
                ${error.message || 'Failed to get response'}
                <button class="retry-button">Retry</button>
            </div>
        `;
        
        // Add retry functionality
        const retryButton = thinkingDiv.querySelector('.retry-button');
        retryButton.addEventListener('click', () => {
            thinkingDiv.remove();
            conversationState.processingResponse = false; // Release the lock
            takeTurn();
        });
        
        // Release the processing lock in case of error
        conversationState.processingResponse = false;
    }
    
    scrollToBottom();
}

// Prepare conversation history for API call
function prepareConversationHistory(currentModel) {
    const messages = [];
    
    // Add system message
    messages.push({
        role: 'system',
        content: currentModel.system_prompt
    });
    
    // Add conversation history
    for (const message of conversationState.history) {
        messages.push({
            role: message.role === 'assistant' ? 'assistant' : 'user',
            content: message.content
        });
    }
    
    return messages;
}

// Stream model response
async function streamModelResponse(model, messages, thinkingDiv) {
    let fullResponse = '';
    let displayedResponse = '';
    let isThinking = false;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Replace thinking indicator with actual message
    thinkingDiv.innerHTML = `
        <div class="message-header">${model.name}</div>
    `;
    thinkingDiv.classList.remove('thinking');
    // Make sure messageContent is properly appended
    thinkingDiv.appendChild(messageContent);
    
    // Function to process and display text chunks
    const processTextChunk = (text) => {
        fullResponse += text;
        
        // Check if we're in a thinking section
        if (text.includes('<think>')) {
            isThinking = true;
            // Show "Thinking..." if we just started thinking
            if (displayedResponse === '') {
                messageContent.innerText = "Thinking...";
            }
        }
        
        if (isThinking && text.includes('</think>')) {
            isThinking = false;
        }
        
        // Only update the displayed text if we're not in a thinking section
        if (!isThinking) {
            // Filter out any thinking tags and their content
            const cleanedFullResponse = fullResponse.replace(/<think>[\s\S]*?<\/think>/g, '');
            
            // Only update if there's something to show
            if (cleanedFullResponse.trim() !== '') {
                displayedResponse = cleanedFullResponse;
                messageContent.innerText = displayedResponse;
            } else if (displayedResponse === '') {
                // If there's nothing to show yet, display "Thinking..."
                messageContent.innerText = "Thinking...";
            }
        }
        
        // Request an animation frame to scroll to avoid performance issues
        requestAnimationFrame(scrollToBottom);
    };
    
    // Handle different model types
    if (model.type === 'ollama') {
        await streamOllamaResponse(model, messages, messageContent, processTextChunk);
    } else if (model.type === 'openai') {
        await streamOpenAIResponse(model, messages, messageContent, processTextChunk);
    } else {
        throw new Error(`Unsupported model type: ${model.type}`);
    }
    
    // Final cleanup - ensure we display the clean response at the end
    const finalCleanResponse = fullResponse.replace(/<think>[\s\S]*?<\/think>/g, '');
    if (finalCleanResponse.trim() !== '') {
        messageContent.innerText = finalCleanResponse;
    }
    
    // Return the cleaned response for history
    return finalCleanResponse;
}

// Stream response from Ollama API
async function streamOllamaResponse(model, messages, messageElement, onChunk) {
    const apiKey = model.api_key || '';
    const endpoint = model.endpoint;
    
    console.log('Sending request to Ollama:', endpoint);
    console.log('Using model:', model.model);
    
    try {
        // Format the messages for Ollama's API
        // Combine messages into a conversation prompt
        let prompt = '';
        let systemPrompt = '';
        
        // Extract system prompt
        for (const msg of messages) {
            if (msg.role === 'system') {
                systemPrompt = msg.content;
                break;
            }
        }
        
        // Format conversation history
        for (const msg of messages) {
            if (msg.role !== 'system') {
                prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
            }
        }
        
        // Add the final turn starter
        prompt += 'Assistant: ';
        
        console.log('Final prompt:', prompt);
        
        // Try the chat API first (newer Ollama versions)
        try {
            console.log('Trying Ollama chat API...');
            const chatEndpoint = endpoint.replace('/generate', '/chat');
            
            const chatResponse = await fetch(chatEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
                },
                body: JSON.stringify({
                    model: model.model,
                    messages: messages,
                    stream: true
                })
            });
            
            if (!chatResponse.ok) {
                throw new Error(`Chat API error: ${chatResponse.status}`);
            }
            
            const reader = chatResponse.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let fullText = '';
            let hasReceivedData = false;
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                console.log('Received chat chunk:', chunk);
                
                const lines = chunk.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            if (line.includes('[DONE]')) continue;
                            
                            const data = JSON.parse(line.substring(6));
                            console.log('Parsed chat data:', data);
                            
                            let textChunk = '';
                            
                            if (data.message?.content) {
                                textChunk = data.message.content;
                            } else if (data.delta?.content) {
                                textChunk = data.delta.content;
                            }
                            
                            if (textChunk) {
                                hasReceivedData = true;
                                fullText += textChunk;
                                onChunk(textChunk);
                                // messageElement display is now handled by processTextChunk
                            }
                        } catch (e) {
                            console.error('Error parsing chat JSON:', e, line);
                        }
                    }
                }
            }
            
            if (!hasReceivedData) {
                throw new Error('No data received from chat stream');
            }
            
            return;
            
        } catch (chatError) {
            console.warn('Chat API failed, falling back to generate API:', chatError);
            // Continue to the generate API
        }
        
        // Try the generate API (older Ollama versions)
        const generateEndpoint = endpoint.includes('/generate') ? endpoint : endpoint.replace('/chat', '/generate');
        console.log('Trying Ollama generate API:', generateEndpoint);
        
        const generateResponse = await fetch(generateEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
            },
            body: JSON.stringify({
                model: model.model,
                prompt: prompt,
                system: systemPrompt,
                stream: true
            })
        });
        
        if (!generateResponse.ok) {
            throw new Error(`Generate API error: ${generateResponse.status}`);
        }
        
        const reader = generateResponse.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullText = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            console.log('Received generate chunk:', chunk);
            
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    console.log('Parsed generate data:', data);
                    
                    if (data.response) {
                        fullText += data.response;
                        onChunk(data.response);
                        // messageElement display is now handled by processTextChunk
                    }
                } catch (e) {
                    console.error('Error parsing generate JSON:', e, line);
                }
            }
        }
        
        if (!fullText) {
            throw new Error('No response from generate API');
        }
        
    } catch (error) {
        console.error('Error communicating with Ollama:', error);
        throw error;
    }
}

// Stream response from OpenAI API
async function streamOpenAIResponse(model, messages, messageElement, onChunk) {
    const apiKey = model.api_key;
    const endpoint = model.endpoint;
    
    if (!apiKey) {
        throw new Error('API key is required for OpenAI models');
    }
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model.model,
                messages: messages,
                stream: true
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    if (data === '[DONE]') continue;
                    
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                            const textChunk = parsed.choices[0].delta.content;
                            onChunk(textChunk);
                            // messageElement display is now handled by processTextChunk
                        }
                    } catch (e) {
                        console.error('Error parsing JSON:', e, line);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error streaming from OpenAI:', error);
        throw error;
    }
}

// Save conversation history to local JSON file
function saveConversationHistory() {
    const historyData = {
        timestamp: new Date().toISOString(),
        model1: conversationState.model1.name,
        model2: conversationState.model2.name,
        messages: conversationState.history
    };
    
    // Create a blob and initiate download
    const blob = new Blob([JSON.stringify(historyData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Helper to scroll conversation to bottom
function scrollToBottom() {
    const container = document.querySelector('.conversation-area');
    const scrollPosition = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    // Only auto-scroll if user is already near the bottom (within 100px)
    // or if it's the first few messages
    if (scrollPosition + clientHeight >= scrollHeight - 100 || 
        conversationState.stats.messageCount <= 2) {
        container.scrollTo({
            top: scrollHeight,
            behavior: 'smooth'
        });
    }
}