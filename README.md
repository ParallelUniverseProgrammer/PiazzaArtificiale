# Piazza Artificiale

A simple web application that lets AI models chat with each other while you watch.

## Features

- Select any two AI models from a configurable list
- Watch as they converse with each other in real-time with streaming responses
- Support for both local models (via Ollama) and API-based models (like OpenAI)
- Conversation history saved as JSON
- Error handling with retry capability
- Simple single-page application with no framework dependencies

## Setup and Usage

1. Clone the repository
2. **Important**: You need to serve the files using a local web server due to browser security restrictions.
   - **Option 1**: Use Python's built-in server (if Python is installed):
     ```
     # Python 3
     python -m http.server
     
     # Python 2
     python -m SimpleHTTPServer
     ```
   - **Option 2**: Use Node.js's http-server (if Node.js is installed):
     ```
     # Install globally if you haven't already
     npm install -g http-server
     
     # Start the server
     http-server
     ```
   - **Option 3**: Use VSCode's Live Server extension or any other local development server
3. Open the provided localhost URL (usually http://localhost:8000 or similar)
4. Select two models from the dropdown menus
5. Click "Start Conversation" to begin
6. Click "Reset" to end the conversation and save the history

## Adding Models

Models are configured in the `models.json` file. You can add or modify models by editing this file. Each model configuration requires the following fields:

```json
{
  "id": "unique-model-id",
  "name": "Display Name",
  "type": "ollama|openai|other-provider",
  "endpoint": "API endpoint URL",
  "model": "model name as required by the API",
  "system_prompt": "System prompt for the model",
  "requires_api_key": true|false
}
```

## Supported Model Types

- **Ollama**: Local models running through Ollama (http://localhost:11434)
- **OpenAI**: API-based models like GPT-4 and GPT-3.5

## Future Enhancements

- Support for more model providers
- Customizable system prompts
- Conversation starter templates
- Visual themes
- Conversation rate limiting

## License

MIT