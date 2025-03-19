// Load models from models.json
async function loadModels() {
    try {
        console.log('Attempting to load models.json...');
        const response = await fetch('models.json');
        
        console.log('Response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);
        
        if (!response.ok) {
            throw new Error(`Failed to load models configuration: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        console.log('Response text:', text.substring(0, 100) + '...');
        
        if (!text || text.trim() === '') {
            throw new Error('Empty response from models.json');
        }
        
        try {
            const data = JSON.parse(text);
            if (!data.models) {
                console.warn('No "models" key found in the JSON response');
            }
            console.log('Models loaded successfully:', data.models ? data.models.length : 0);
            return data.models || [];
        } catch (parseError) {
            console.error('JSON parsing error:', parseError);
            throw new Error(`Error parsing JSON: ${parseError.message}`);
        }
    } catch (error) {
        console.error('Error loading models:', error);
        
        // Display error on page
        const modelSelectionDiv = document.querySelector('.model-selection');
        if (modelSelectionDiv) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.innerHTML = `
                Failed to load models: ${error.message}.<br>
                <strong>IMPORTANT</strong>: You need to serve these files using a local web server.<br>
                See the README.md for instructions, or run:<br>
                <code>python -m http.server</code> or <code>npx http-server</code>
            `;
            modelSelectionDiv.prepend(errorDiv);
        }
        
        // Return fallback models for development
        console.log('Loading fallback models for development');
        return [
            {
                id: "ollama-llama3",
                name: "Llama 3 (Ollama)",
                type: "ollama",
                endpoint: "http://localhost:11434/api/chat",
                model: "llama3",
                system_prompt: "You are a helpful AI assistant engaging in a conversation with another AI."
            },
            {
                id: "ollama-mistral",
                name: "Mistral (Ollama)",
                type: "ollama",
                endpoint: "http://localhost:11434/api/chat",
                model: "mistral",
                system_prompt: "You are a helpful AI assistant engaging in a conversation with another AI."
            },
            {
                id: "openai-gpt4",
                name: "GPT-4 (OpenAI)",
                type: "openai",
                endpoint: "https://api.openai.com/v1/chat/completions",
                model: "gpt-4",
                system_prompt: "You are a helpful AI assistant engaging in a conversation with another AI.",
                requires_api_key: true
            },
            {
                id: "openai-gpt35",
                name: "GPT-3.5 (OpenAI)",
                type: "openai",
                endpoint: "https://api.openai.com/v1/chat/completions",
                model: "gpt-3.5-turbo",
                system_prompt: "You are a helpful AI assistant engaging in a conversation with another AI.",
                requires_api_key: true
            }
        ];
    }
}

// Initialize model dropdowns
async function initializeModelSelectors() {
    const models = await loadModels();
    const modelDropdowns = document.querySelectorAll('.model-dropdown');
    
    if (models.length === 0) {
        alert('No models found in configuration file.');
        return;
    }
    
    modelDropdowns.forEach(dropdown => {
        dropdown.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Select a model --';
        dropdown.appendChild(defaultOption);
        
        // Add model options
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            option.dataset.requiresApiKey = model.requires_api_key || false;
            dropdown.appendChild(option);
        });
        
        // Handle API key inputs when selection changes
        dropdown.addEventListener('change', handleModelSelection);
    });
}

// Handle model selection change
async function handleModelSelection(event) {
    const dropdown = event.target;
    const selectedOption = dropdown.options[dropdown.selectedIndex];
    const requiresApiKey = selectedOption.dataset.requiresApiKey === 'true';
    const modelId = dropdown.value;
    
    // Get model container elements
    const modelSelector = dropdown.closest('.model-selector');
    const promptContainer = modelSelector.querySelector('.prompt-container');
    const systemPromptTextarea = modelSelector.querySelector('.system-prompt');
    
    // Check if API key input already exists
    let apiKeyContainer = modelSelector.querySelector('.api-key-container');
    
    if (modelId) {
        // Show system prompt textarea
        promptContainer.style.display = 'block';
        
        // Load system prompt from model config
        const model = await getModelById(modelId);
        if (model && model.system_prompt) {
            systemPromptTextarea.value = model.system_prompt;
        }
        
        // Add API key field if needed
        if (requiresApiKey) {
            if (!apiKeyContainer) {
                apiKeyContainer = document.createElement('div');
                apiKeyContainer.className = 'api-key-container';
                apiKeyContainer.innerHTML = `
                    <label for="${dropdown.id}-api-key">API Key:</label>
                    <input type="password" id="${dropdown.id}-api-key" class="api-key-input" placeholder="Enter API key">
                `;
                promptContainer.before(apiKeyContainer);
            }
        } else if (apiKeyContainer) {
            apiKeyContainer.remove();
        }
    } else {
        // Hide system prompt textarea when no model is selected
        promptContainer.style.display = 'none';
        if (apiKeyContainer) {
            apiKeyContainer.remove();
        }
    }
    
    updateStartButtonState();
}

// Update start button state based on selections
function updateStartButtonState() {
    const model1 = document.getElementById('model1');
    const model2 = document.getElementById('model2');
    const startBtn = document.getElementById('start-btn');
    
    const model1Selected = model1.value !== '';
    const model2Selected = model2.value !== '';
    
    // Check if API keys are needed and provided
    let apiKeysValid = true;
    document.querySelectorAll('.api-key-input').forEach(input => {
        if (input.value.trim() === '') {
            apiKeysValid = false;
        }
    });
    
    startBtn.disabled = !(model1Selected && model2Selected && apiKeysValid);
}

// Get model config by ID
async function getModelById(modelId) {
    const models = await loadModels();
    return models.find(model => model.id === modelId);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeModelSelectors();
    
    // Add event listeners for inputs to update button state
    document.addEventListener('input', updateStartButtonState);
});