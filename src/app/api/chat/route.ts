import { NextResponse } from "next/server";
import { Logger } from "@/utils/logger";
import OpenAI from "openai";
import { env } from "@/config/env";

const logger = new Logger("API:Chat");

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  const { message } = await req.json();
  const model = await llmRouter(message);
  const response = await openai.chat.completions.create({
    model: model,
    messages: [{ role: "user", content: message }],
  });
  const reply = response.choices[0].message.content;
  return new Response(
    JSON.stringify({ message: ` Model: ${model} \n\n\n Reply: ${reply}` })
  );
}

async function llmRouter(message: string) {
  const routingPrompt = `You are an expert AI model router. Your job is to analyze a user's message and select the most appropriate AI model based on the specific requirements.

Available Models:
1. openai/gpt-oss-20b:free
   - Best for: Simple conversations, basic Q&A, general chat
   - Strengths: Free, fast (0.52s latency), high throughput (162 tps)
   - Limitations: Basic reasoning, limited coding capabilities
   - Use when: User asks simple questions, wants casual conversation, or needs quick responses

2. anthropic/claude-sonnet-4
   - Best for: Complex coding tasks, software development, technical analysis
   - Strengths: Excellent coding abilities, SWE-bench 72.7%, 200k context
   - Cost: $3/M input, $15/M output tokens
   - Use when: User needs code generation, debugging, software architecture, or complex technical work

3. openai/gpt-5-mini
   - Best for: Complex reasoning, analysis, problem-solving
   - Strengths: Advanced reasoning, 400k context, good instruction following
   - Cost: $0.25/M input, $2/M output tokens
   - Use when: User needs logical analysis, mathematical reasoning, strategic thinking, or complex problem-solving

Routing Rules:
- Choose gpt-oss-20b ONLY for: Simple greetings, basic questions, casual conversation, or when no specific technical/cognitive demands exist
- Choose claude-sonnet-4 for: Any coding-related tasks, software development, technical implementation, debugging, or when code quality is important
- Choose gpt-5-mini for: Complex reasoning, analysis, problem-solving, mathematical thinking, or when deep cognitive processing is required
- If multiple criteria apply, prioritize: Coding > Reasoning > Simple

User Message: "${message}"

Analyze the message carefully and respond with ONLY a JSON object in this exact format:
{"model": "model_name",
"reasoning": "1 sentence reasoning for the choice"}

Choose the model name exactly as written above (e.g., "openai/gpt-oss-20b:free", "anthropic/claude-sonnet-4", "openai/gpt-5-mini")`;

  console.log(routingPrompt);
  const response = await openai.chat.completions.create({
    model: "google/gemini-2.5-flash-lite",
    messages: [{ role: "user", content: routingPrompt }],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 100,
  });

  const responseContent = response.choices[0].message.content;
  if (!responseContent) {
    return "openai/gpt-oss-20b:free";
  }

  const parsedResponse = JSON.parse(responseContent);
  return parsedResponse.model || "openai/gpt-oss-20b:free";
}
