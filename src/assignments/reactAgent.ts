/**
 * Stock Weather Agent - Student Assignment
 *
 * This file contains the skeleton for building a ReAct-style agent.
 * Complete the TODO exercises to make the agent work!
 *
 * The agent combines stock data and weather forecasts to make predictions
 * based on the (fun) hypothesis that rainy days correlate with lower stock performance.
 */

import Groq from "groq-sdk";
import type {
  ChatCompletion,
  ChatCompletionMessageParam,
} from "groq-sdk/resources/chat/completions";

import { GROQ_API_KEY, GROQ_MODEL } from "../config.js";
import { TOOLS, TOOL_FUNCTIONS } from "../tools/index.js";
import { getStockPrice } from "../tools/stockTool.js";
import { getWeather } from "../tools/weatherTool.js";

// Suppress "unused import" warnings — TOOL_FUNCTIONS is imported because students
// may reference it when completing Exercise C. Keep parity with the Python file.
void TOOL_FUNCTIONS;

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

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    console.log(`\n--- Iteration ${iteration + 1} ---`);

    // Call the LLM (with retry for rate limiting)
    const response = await callLlmWithRetry(messages, TOOLS);

    const msg = response.choices[0]!.message;
    console.log(`Assistant: ${msg.content || "(calling tools...)"}`);

    // ============================================================
    // TODO Exercise A: Add Memory (Message History)
    // ============================================================
    // The agent needs to "remember" what it said.
    // Append the assistant's response to the messages list.
    // This is critical - without this, the agent forgets everything!
    //
    // Hint: messages.push({ role: "assistant", ... })
    // You need to include both 'content' and 'tool_calls' if present.
    //
    // YOUR CODE HERE:
    // (Nothing to do yet — remove this comment and add your code)
    // ============================================================

    // ============================================================
    // TODO Exercise B: Handle Tool Calls
    // ============================================================
    // Check if the LLM wants to call tools (msg.tool_calls).
    // If NO tool calls: the agent is done, return msg.content
    // If YES tool calls: execute each tool and continue the loop
    //
    // YOUR CODE HERE:
    // (Nothing to do yet — remove this comment and add your code)
    // ============================================================

    // Process each tool call
    const toolCalls = msg.tool_calls ?? [];
    for (const toolCall of toolCalls) {
      const fnName = toolCall.function.name;
      const fnArgs = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;

      console.log(`  Tool call: ${fnName}(${JSON.stringify(fnArgs)})`);

      // ============================================================
      // TODO Exercise C: Handle Tool Hallucinations
      // ============================================================
      // Sometimes LLMs "hallucinate" tools that don't exist!
      // If fnName is not in our TOOL_FUNCTIONS, we need to tell
      // the LLM that this tool doesn't exist.
      //
      // Current code will crash if the LLM calls a non-existent tool.
      // Fix it by returning an error message for unknown tools.
      //
      // YOUR CODE HERE (fix the else branch):
      let observation: string;
      if (fnName === "get_stock_price") {
        observation = await getStockPrice(String(fnArgs.ticker ?? "AAPL"));
      } else if (fnName === "get_weather") {
        observation = await getWeather(String(fnArgs.city ?? "New York"));
      } else {
        // 🚨 BUG: What happens if fnName is "get_company_news"?
        // The LLM might hallucinate tools that don't exist!
        // Return an error message so the LLM knows to try something else.
        observation = "???"; // Fix this!
      }
      // ============================================================

      console.log(`  Result: ${observation}`);

      // Add the tool result to messages
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: observation,
      });
    }
  }

  // ============================================================
  // TODO Exercise D: Handle Memory Bloat
  // ============================================================
  // The messages list can grow very large over many iterations.
  // This can cause:
  // - Token limit exceeded errors
  // - Slower responses
  // - Higher API costs
  //
  // Implement a strategy to manage memory:
  // Option 1: Keep only the last N messages (simple)
  // Option 2: Summarize older messages (advanced)
  // Option 3: Keep system + user + last N assistant/tool messages
  //
  // Add your memory management code somewhere in this function!
  // ============================================================

  // ============================================================
  // TODO Exercise E: Handle Infinite Loops
  // ============================================================
  // Sometimes the LLM gets "stuck" calling the same tool repeatedly.
  // For example, it might keep calling get_stock_price("AAPL") forever.
  //
  // Implement loop detection:
  // 1. Track recent tool calls (name + args)
  // 2. If the same call appears 3+ times, break the loop
  // 3. Add a message nudging the LLM to give a final answer
  //
  // Add your loop detection code in this function!
  // ============================================================

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
