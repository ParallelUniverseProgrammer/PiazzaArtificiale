# Piazza Artificiale

A playground for AI-to-AI conversations where language models chat with each other while you watch. Create your own artificial public square where AI entities can exchange ideas.

## What is Piazza Artificiale?

Piazza Artificiale (Italian for "Artificial Square") is a hobby project that explores what happens when we create artificial communities of AI models, starting with one-on-one conversations. I built this because I'm fascinated by how different AI models interact, debate, and share information with each other.

Think of it as a coffee shop where you can seat two AI models at a table and eavesdrop on their conversation!

## Features

- **AI Matchmaking**: Pair any two AI models together to see how they converse
- **Live Streaming**: Watch the conversation unfold in real-time with streaming responses
- **Flexible Model Support**: 
  - **Local Models** via [Ollama](https://ollama.ai) (run powerful models on your machine)
  - **Cloud APIs** including:
    - OpenAI (GPT-3.5, GPT-4, GPT-4o)
    - Google (Gemini)
- **Customization**:
  - Edit system prompts to set each model's persona and conversation style
  - Adjust timing between responses
  - Toggle light/dark themes
- **Conversation Management**:
  - Pause/resume conversations
  - Save conversation history as JSON
  - Track message count, estimated tokens, and duration
- **Responsive Design**: Collapsible sidebar, adjustable width, and mobile-friendly layout

## Setup and Usage

1. Clone the repository
2. **Important**: You need to serve the files using a local web server due to browser security restrictions.
   - **Windows users**: Simply run the included `run.bat` file
   - **Other options**:
     - Use Python's built-in server: `python -m http.server`
     - Use Node.js's http-server: `npx http-server`
     - Use VSCode's Live Server extension
3. Open the provided localhost URL (usually http://localhost:8000)
4. Select two models from the dropdown menus
   - For local models, make sure Ollama is running
   - For API-based models, provide your API key
5. Optionally customize the system prompts
6. Click "Start Conversation" and watch the interaction unfold!
7. Use the pause button to temporarily halt the conversation
8. Click "Reset" when finished to save the conversation history

## Supported Model Types

- **Ollama** (Local): Phi-4-mini, Llama 3.2, Granite 3.2, Gemma 3, and any other models you've pulled to Ollama
- **OpenAI** (API): GPT-3.5-Turbo, GPT-4o, GPT-4.5
- **Google** (API): Gemini 2.0 Flash

## Adding Your Own Models

Models are configured in the `models.json` file. Add or modify models by editing this file with the following structure:

```json
{
  "id": "unique-model-id",
  "name": "Display Name",
  "type": "ollama|openai|google",
  "endpoint": "API endpoint URL",
  "model": "model name as required by the API",
  "system_prompt": "System prompt for the model",
  "requires_api_key": true|false
}
```

## Technical Details

- Pure HTML/CSS/JavaScript with no framework dependencies
- CSS Grid and Flexbox for responsive layout
- Streaming API implementation for real-time conversation flow
- Local storage for theme and UI preferences
- Error handling with retry capability for model responses

## License

MIT