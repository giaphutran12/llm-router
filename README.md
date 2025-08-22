# LLM Router - Smart AI Model Selection

An intelligent router that automatically selects the best AI model for your requests. No more manually choosing between GPT, Claude, or other models - our system analyzes your message and routes it to the optimal model.

## What It Does

A smart traffic controller for AI requests that analyzes your message and selects the best model:

- **Simple chat** → `gpt-oss-20b` (free and fast)
- **Coding tasks** → `claude-sonnet-4` (excellent for development)
- **Complex reasoning** → `gpt-5-mini` (advanced problem solving)

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **OpenRouter API** for model access
- **Custom logging** system

## Getting Started

1. Clone the repository

```bash
git clone <your-repo>
cd nextjs-template
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

```bash
cp .env.example .env.local
# Add your OPENROUTER_API_KEY
```

4. Start development server

```bash
npm run dev
```

## How It Works

The routing logic is in `src/app/api/chat/route.ts`:

1. **User sends message** → Frontend hits our API
2. **Router analyzes content** → Uses AI to determine intent
3. **Model selection** → Picks the optimal model based on the task
4. **Execution** → Sends the request to the selected model
5. **Response** → Returns both the model used and the answer

## Architecture

Simple but scalable design:

- **Frontend**: React with hooks, clean component structure
- **Backend**: Next.js API routes with proper error handling
- **Routing Logic**: AI-powered decision making
- **State Management**: Local state with React hooks

## Customization

Want to add more models? Update the routing prompt in `llmRouter()`. The system is model-agnostic - as long as OpenRouter supports it, we can route to it.

## Performance

- **Routing**: ~100ms (using gemini-2.5-flash-lite for decisions)
- **Response**: Depends on the selected model
- **Fallback**: Always defaults to gpt-oss-20b if something goes wrong

## Contributing

This is a side project that grew into something useful. Feel free to:

- Open issues for bugs
- Submit PRs for improvements
- Share ideas for enhancements

## License

MIT License

---

Built in San Francisco with modern web technologies.
