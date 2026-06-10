/**
 * Stock Weather Agent - Student Assignment
 *
 * This file contains the skeleton for building a ReAct-style agent.
 * Complete the TODO exercises to make the agent work!
 *
 * The agent combines stock data and weather forecasts to make predictions
 * based on the (fun) hypothesis that rainy days correlate with lower stock performance.
 */

// Side-effect import: must come before any module that reads process.env
// (so this file works when run directly via `tsx src/assignments/reactAgent.ts`).
import "dotenv/config";

import Groq from "groq-sdk";
import type {
  ChatCompletion,
  ChatCompletionMessageParam,
} from "groq-sdk/resources/chat/completions";

import { GROQ_API_KEY, GROQ_MODEL } from "../config.js";
import { TOOLS, TOOL_FUNCTIONS } from "../tools/index.js";

// System prompt that defines the agent's personality and behavior
const SYSTEM_PROMPT = `You are a financial analyst with an unusual theory: you believe rainy weather correlates with lower stock performance.

When asked about stocks, you should:
1. Check the current weather conditions (especially if it's rainy)
2. Look up the stock price
3. Combine both pieces of information to make a prediction

Always be clear about the reasoning behind your predictions. If it's rainy, you're more bearish. If it's sunny, you're more bullish.

Remember: This is a fun, educational example - not real financial advice!`;

function createClient(): Groq {
  if (!GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY not set! Please add it to your .env file.\n" +
        "Get your key at: https://console.groq.com/"
    );
  }
  return new Groq({ apiKey: GROQ_API_KEY });
}

// Global client for retry function
let _client: Groq | null = null;

function getClient(): Groq {
  if (_client === null) {
    _client = createClient();
  }
  return _client;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Call Groq API with retry logic for rate limiting.
 * (Provided for you - handles rate limits)
 */
async function callLlmWithRetry(
  messages: ChatCompletionMessageParam[],
  tools: typeof TOOLS,
  maxRetries = 3
): Promise<ChatCompletion> {
  const client = getClient();
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.chat.completions.create({
        model: GROQ_MODEL,
        messages,
        tools,
      });
    } catch (err) {
      if (err instanceof Groq.RateLimitError) {
        const waitSeconds = 2 ** i + 1; // Exponential backoff: 2s, 5s, 9s...
        console.log(`Rate limit hit. Retrying in ${waitSeconds} seconds...`);
        await sleep(waitSeconds * 1000);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded.");
}

/**
 * Run the ReAct agent loop.
 *
 * This is the main agent loop that:
 * 1. Sends user query to the LLM
 * 2. Checks if LLM wants to use tools
 * 3. Executes tools and feeds results back
 * 4. Repeats until LLM gives a final answer
 *
 * @param userQuery The user's question
 * @param maxIterations Maximum number of tool-calling iterations (safety limit)
 * @returns The agent's final response
 */
export async function runAgent(
  userQuery: string,
  maxIterations = 10
): Promise<string> {
  // Initialize conversation with system prompt and user query
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userQuery },
  ];

  // Exercise E state: track recent tool calls to detect infinite loops.
  const toolCallHistory: string[] = [];
  const LOOP_THRESHOLD = 3;

  // Exercise D constant: cap message history to avoid token-limit / cost bloat.
  const MEMORY_LIMIT = 20;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    console.log(`\n--- Iteration ${iteration + 1} ---`);

    // Exercise D: trim message history if it has grown beyond the limit.
    // Always keep system (index 0) and the original user query (index 1).
    // Drop oldest assistant/tool messages, taking care not to leave an orphan
    // "tool" role as the first kept message (the API requires it follow an
    // assistant message with tool_calls).
    if (messages.length > MEMORY_LIMIT) {
      const system = messages[0]!;
      const userMsg = messages[1]!;
      let tail = messages.slice(-(MEMORY_LIMIT - 2));
      while (tail.length > 0 && tail[0]!.role === "tool") {
        tail = tail.slice(1);
      }
      messages.length = 0;
      messages.push(system, userMsg, ...tail);
    }

    // Call the LLM (with retry for rate limiting)
    const response = await callLlmWithRetry(messages, TOOLS);

    const msg = response.choices[0]!.message;
    console.log(`Assistant: ${msg.content || "(calling tools...)"}`);

    // Exercise A: append the assistant's response so the model "remembers" it.
    // Include tool_calls when present so the API can later match tool results
    // back to their originating call.
    messages.push({
      role: "assistant",
      content: msg.content,
      ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}),
    });

    // Exercise B: if the LLM didn't request any tools, we're done.
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return msg.content ?? "";
    }

    // Process each tool call
    for (const toolCall of msg.tool_calls) {
      const fnName = toolCall.function.name;
      const fnArgs = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;

      console.log(`  Tool call: ${fnName}(${JSON.stringify(fnArgs)})`);

      // Exercise E: record this call and check whether we're stuck in a loop.
      const callKey = `${fnName}:${JSON.stringify(fnArgs)}`;
      toolCallHistory.push(callKey);
      const repeatCount = toolCallHistory.filter((k) => k === callKey).length;

      // Exercise C: dispatch via the TOOL_FUNCTIONS registry. Unknown names
      // (LLM hallucinations like "get_company_news") return a clear error
      // string instead of crashing, so the LLM can self-correct.
      let observation: string;
      const toolFn = TOOL_FUNCTIONS[fnName];
      if (toolFn) {
        observation = await toolFn(fnArgs);
      } else {
        const available = Object.keys(TOOL_FUNCTIONS).join(", ");
        observation = `Error: tool '${fnName}' does not exist. Available tools: ${available}.`;
      }

      console.log(`  Result: ${observation}`);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: observation,
      });

      // Exercise E: after recording the tool result, if the same call has
      // happened too many times, nudge the LLM to give a final answer.
      if (repeatCount >= LOOP_THRESHOLD) {
        console.log(
          `  ⚠️  Detected loop: ${callKey} called ${repeatCount} times. Nudging the agent.`
        );
        messages.push({
          role: "user",
          content:
            "You've called the same tool with the same arguments multiple times. " +
            "Stop calling tools and give a final answer based on what you already know.",
        });
        break;
      }
    }
  }

  return "Max iterations reached. The agent couldn't complete the task.";
}

// Allow running this file directly: `tsx src/assignments/reactAgent.ts`
import { pathToFileURL } from "node:url";
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  void (async () => {
    const query = "What's the outlook for AAPL stock today?";
    console.log(`User: ${query}`);
    const response = await runAgent(query);
    console.log(`\nFinal Answer: ${response}`);
  })();
}
