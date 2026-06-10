/**
 * Stock Weather Agent - Planning Pattern (Student Assignment)
 *
 * This file implements the "Plan-then-Execute" agent pattern.
 * Compare this to the ReAct pattern in reactAgent.ts to understand the differences!
 *
 * PATTERN COMPARISON:
 * - ReAct:    Reason → Act → Observe → Reason → Act → Observe → Answer (interleaved)
 * - Planning: Plan all steps → Execute step 1 → Execute step 2 → ... → Answer (sequential)
 *
 * The planning pattern is useful when:
 * - You know all required steps upfront
 * - Steps are independent (can be parallelized)
 * - You want faster execution (fewer LLM calls)
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

// Suppress "unused import" warnings — these are referenced by students completing
// the exercises. Keep parity with the Python file.
void TOOLS;
void getStockPrice;
void getWeather;

export interface PlanStep {
  tool: string;
  args: Record<string, unknown>;
}

interface PlanResult {
  tool: string;
  args: Record<string, unknown>;
  result: string;
}

// System prompt for the PLANNING phase
const PLANNING_PROMPT = `You are a financial analyst assistant. When given a query, create a plan of tool calls needed to answer it.

Available tools:
- get_stock_price(ticker): Get current stock price and daily change
- get_weather(city): Get current weather conditions

Respond with a JSON array of tool calls in order. Example:
[
    {"tool": "get_weather", "args": {"city": "New York"}},
    {"tool": "get_stock_price", "args": {"ticker": "AAPL"}}
]

Only include tools that are necessary. If no tools are needed, respond with an empty array: []`;

// System prompt for the SYNTHESIS phase
const SYNTHESIS_PROMPT = `You are a financial analyst with an unusual theory: you believe rainy weather correlates with lower stock performance.

Given the user's question and the tool results below, provide a helpful answer.
Combine the information to make predictions. If it's rainy, be more bearish. If it's sunny, be more bullish.

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

let _client: Groq | null = null;

function getClient(): Groq {
  if (_client === null) {
    _client = createClient();
  }
  return _client;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Call Groq API with retry logic for rate limiting. */
async function callLlm(
  messages: ChatCompletionMessageParam[],
  maxRetries = 3
): Promise<ChatCompletion> {
  const client = getClient();
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.chat.completions.create({
        model: GROQ_MODEL,
        messages,
      });
    } catch (err) {
      if (err instanceof Groq.RateLimitError) {
        const waitSeconds = 2 ** i + 1;
        console.log(`Rate limit hit. Retrying in ${waitSeconds} seconds...`);
        await sleep(waitSeconds * 1000);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded.");
}

// Silence "unused" warnings — these helpers are referenced by students.
void PLANNING_PROMPT;
void SYNTHESIS_PROMPT;
void callLlm;

/**
 * Run the Planning agent (Plan-then-Execute pattern).
 *
 * Unlike ReAct which interleaves reasoning and action, this pattern:
 * 1. Creates a complete plan upfront
 * 2. Executes all steps sequentially (no LLM calls between steps)
 * 3. Synthesizes the final answer from all results
 *
 * @param userQuery The user's question
 * @returns The agent's final response
 */
export async function runPlanningAgent(userQuery: string): Promise<string> {
  // ================================================================
  // PHASE 1: PLANNING
  // ================================================================
  // Ask the LLM to create a plan (list of tool calls)
  // The LLM does NOT execute tools here - just plans what to do
  // ================================================================
  console.log("\n--- Phase 1: Planning ---");

  // ============================================================
  // TODO Exercise A: Create the Planning Request
  // ============================================================
  // Create a messages list with:
  // 1. System message using PLANNING_PROMPT
  // 2. User message with the query
  //
  // Then call the LLM and extract the plan from the response.
  //
  // Hint: The LLM will return a JSON array of tool calls.
  // You'll need to parse it with JSON.parse()
  //
  // YOUR CODE HERE:
  const planningMessages: ChatCompletionMessageParam[] = []; // Fix this!

  // Call LLM to get the plan
  // const response = await callLlm(planningMessages);
  // const planText = response.choices[0].message.content;

  let plan: PlanStep[] = []; // This should be the parsed JSON array
  // ============================================================

  // Silence "unused variable" warning until the student wires it up.
  void planningMessages;

  console.log(`Plan: ${JSON.stringify(plan, null, 2)}`);

  // ================================================================
  // PHASE 2: EXECUTION
  // ================================================================
  // Execute each planned step sequentially.
  // NO reasoning between steps - just execute!
  // This is the key difference from ReAct.
  // ================================================================
  console.log("\n--- Phase 2: Execution ---");

  // ============================================================
  // TODO Exercise B: Execute the Plan
  // ============================================================
  // Loop through each step in the plan and execute the tool.
  // Store results in a list for the synthesis phase.
  //
  // Structure of each step: { tool: "tool_name", args: { ... } }
  //
  // Handle these cases:
  // 1. Tool exists: execute it and store the result
  // 2. Tool doesn't exist: store an error message
  //
  // YOUR CODE HERE:
  const results: PlanResult[] = []; // List of { tool, args, result }

  for (const step of plan) {
    const toolName = step.tool;
    const toolArgs = step.args ?? {};

    console.log(`  Executing: ${toolName}(${JSON.stringify(toolArgs)})`);

    // Execute the tool
    // Hint: Check if toolName is in TOOL_FUNCTIONS
    // If yes: const result = await TOOL_FUNCTIONS[toolName](toolArgs);
    // If no:  const result = `Error: Unknown tool '${toolName}'`;

    const result = "???"; // Fix this!

    console.log(`  Result: ${result}`);
    results.push({
      tool: toolName,
      args: toolArgs,
      result,
    });
  }
  // ============================================================

  // Silence "unused" warning until the student wires up Exercise C.
  void results;

  // ================================================================
  // PHASE 3: SYNTHESIS
  // ================================================================
  // Send all results to the LLM to generate the final answer.
  // The LLM combines all information into a coherent response.
  // ================================================================
  console.log("\n--- Phase 3: Synthesis ---");

  // ============================================================
  // TODO Exercise C: Synthesize the Final Answer
  // ============================================================
  // Create a messages list with:
  // 1. System message using SYNTHESIS_PROMPT
  // 2. User message containing:
  //    - The original query
  //    - All tool results (formatted nicely)
  //
  // Format suggestion for the user message:
  // `
  // User question: ${userQuery}
  //
  // Tool results:
  // - get_weather({"city": "New York"}): The weather in New York is rainy...
  // - get_stock_price({"ticker": "AAPL"}): Current price for AAPL...
  // `
  //
  // YOUR CODE HERE:
  const synthesisMessages: ChatCompletionMessageParam[] = []; // Fix this!

  // Call LLM to synthesize
  // const response = await callLlm(synthesisMessages);
  // const finalAnswer = response.choices[0].message.content;

  const finalAnswer = "TODO: Implement synthesis phase"; // Fix this!
  // ============================================================

  void synthesisMessages;
  void userQuery;
  void TOOL_FUNCTIONS;

  return finalAnswer;
}

// Allow running this file directly: `tsx src/assignments/planningAgent.ts`
import { pathToFileURL } from "node:url";
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  void (async () => {
    const query = "What's the outlook for NVDA stock in NYC today?";
    console.log(`User: ${query}`);
    const response = await runPlanningAgent(query);
    console.log(`\nFinal Answer: ${response}`);
  })();
}
