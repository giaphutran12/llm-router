import { Logger } from "@/utils/logger";
import OpenAI from "openai";
import { env } from "@/config/env";
import { cleanModelResponse } from "@/lib/utils";

const logger = new Logger("API:Chat");

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: env.OPENROUTER_API_KEY,
});

// Model performance data
const modelPerformance = {
  "openai/gpt-oss-20b:free": {
    throughput: "162 tps",
    timeToFirstToken: "0.52s",
    tokensPerSecond: "162",
    cost: "Free",
  },
  "anthropic/claude-sonnet-4": {
    throughput: "120 tps",
    timeToFirstToken: "1.2s",
    tokensPerSecond: "120",
    cost: "$3/M input, $15/M output",
  },
  "openai/gpt-5-mini": {
    throughput: "150 tps",
    timeToFirstToken: "0.8s",
    tokensPerSecond: "150",
    cost: "$0.25/M input, $2/M output",
  },
};

export async function POST(req: Request) {
  const { message } = await req.json();
  const startTime = Date.now();

  const modelSelection = await llmRouter(message);
  const model = modelSelection.model;
  const reasoning = modelSelection.reasoning;

  logger.info("Model selected", { model, reasoning });

  const response = await openai.chat.completions.create({
    model: model,
    messages: [{ role: "user", content: message }],
  });

  const endTime = Date.now();
  const actualTimeToFirstToken = endTime - startTime;

  const rawReply = response.choices[0].message.content;
  let reply = rawReply || "";

  // Only clean responses from GPT OSS 20B (the model with formatting issues)
  if (model === "openai/gpt-oss-20b:free") {
    reply = cleanModelResponse(rawReply || "");

    // Log if response was cleaned
    if (rawReply !== reply) {
      logger.info("Response cleaned", {
        model,
        originalLength: rawReply?.length || 0,
        cleanedLength: reply.length,
        wasCleaned: true,
      });
    }
  }

  // Fallback: If response still contains artifacts, try additional cleaning
  // Only for GPT OSS 20B (the model with formatting issues)
  if (
    model === "openai/gpt-oss-20b:free" &&
    reply &&
    (reply.includes("analysis") || reply.includes("assistantfinal"))
  ) {
    let fallbackReply = reply;

    // Find the actual answer part
    const answerPatterns = [
      "There are",
      "The answer is",
      "Answer:",
      "Final answer:",
    ];
    for (const pattern of answerPatterns) {
      const index = reply.indexOf(pattern);
      if (index !== -1) {
        fallbackReply = reply.substring(index);
        break;
      }
    }

    // Clean up remaining artifacts
    fallbackReply = fallbackReply
      .replace(/analysis|assistantfinal|user\s+wrote|they\s+are\s+asking/gi, "")
      .trim();

    if (fallbackReply.length > 10) {
      reply = fallbackReply;
      logger.info("Fallback cleaning applied", {
        model,
        fallbackLength: fallbackReply.length,
      });
    }
  }

  // Final quality check - if response still has artifacts, log warning
  // Only for GPT OSS 20B (the model with formatting issues)
  if (
    model === "openai/gpt-oss-20b:free" &&
    reply &&
    (reply.includes("analysis") || reply.includes("assistantfinal"))
  ) {
    logger.warn("Response still contains artifacts after cleaning", {
      model,
      response: reply.substring(0, 100) + "...",
    });
  }

  const performance = modelPerformance[
    model as keyof typeof modelPerformance
  ] || {
    throughput: "N/A",
    timeToFirstToken: "N/A",
    tokensPerSecond: "N/A",
    cost: "N/A",
  };

  return new Response(
    JSON.stringify({
      model,
      reasoning,
      performance: {
        ...performance,
        actualTimeToFirstToken: `${actualTimeToFirstToken}ms`,
      },
      reply,
    })
  );
}

async function llmRouter(message: string) {
  const routingPrompt = `You are an expert AI model router. Your job is to analyze a user's message and select the most appropriate AI model based on the specific requirements.

Available Models:
1. openai/gpt-oss-20b:free
   - Best for: Simple greetings, basic questions, casual conversation
   - Strengths: Free, fast (0.52s latency), high throughput (162 tps)
   - Limitations: May produce training artifacts, basic reasoning, limited coding capabilities
   - Use when: User asks simple questions, wants casual conversation, or needs quick responses

2. anthropic/claude-sonnet-4
   - Best for: Complex coding tasks, software development, technical analysis
   - Strengths: Excellent coding abilities, SWE-bench 72.7%, 200k context, clean responses
   - Cost: $3/M input, $15/M output tokens
   - Use when: User needs code generation, debugging, software architecture, or when clean formatting is important

3. openai/gpt-5-mini
   - Best for: Complex reasoning, analysis, problem-solving
   - Strengths: Advanced reasoning, 400k context, good instruction following, clean responses
   - Cost: $0.25/M input, $2/M output tokens
   - Use when: User needs logical analysis, mathematical reasoning, strategic thinking, or complex problem-solving

Routing Rules:
- Choose gpt-oss-20b for: Simple greetings, basic questions, casual conversation, or when no specific technical/cognitive demands exist
- Choose claude-sonnet-4 for: Any coding-related tasks, software development, technical implementation, debugging, or when code quality is important
- Choose gpt-5-mini for: Complex reasoning, analysis, problem-solving, mathematical thinking, or when deep cognitive processing is required
User Message: "${message}"

Analyze the message carefully and respond with ONLY a JSON object in this exact format:
{"model": "model_name",
"reasoning": "1 sentence reasoning for the choice"}

Choose the model name exactly as written above (e.g., "openai/gpt-oss-20b:free", "anthropic/claude-sonnet-4", "openai/gpt-5-mini")`;

  logger.info("Routing prompt", { routingPrompt });
  const response = await openai.chat.completions.create({
    model: "google/gemini-2.5-flash-lite",
    messages: [{ role: "user", content: routingPrompt }],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 100,
  });

  const responseContent = response.choices[0].message.content;
  if (!responseContent) {
    return {
      model: "openai/gpt-oss-20b:free",
      reasoning: "Default fallback model for simple queries",
    };
  }

  try {
    const parsedResponse = JSON.parse(responseContent);
    return {
      model: parsedResponse.model || "openai/gpt-oss-20b:free",
      reasoning:
        parsedResponse.reasoning || "Default fallback model for simple queries",
    };
  } catch (error) {
    logger.error("Failed to parse routing response", error);
    return {
      model: "openai/gpt-oss-20b:free",
      reasoning: "Error in model selection, using default fallback",
    };
  }
}
