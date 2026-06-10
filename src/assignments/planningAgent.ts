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

// Side-effect import: must come before any module that reads process.env
// (so this file works when run directly via `tsx src/assignments/planningAgent.ts`).
import "dotenv/config";

import Groq from "groq-sdk";
import type {
  ChatCompletion,
  ChatCompletionMessageParam,
} from "groq-sdk/resources/chat/completions";

import { GROQ_API_KEY, GROQ_MODEL } from "../config.js";
import { TOOL_FUNCTIONS } from "../tools/index.js";

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

/**
 * Extract a JSON array from the LLM response. The LLM sometimes wraps the
 * plan in a markdown ```json``` fence or adds prose around it.
 */
function parsePlan(planText: string | null): PlanStep[] {
  if (!planText) return [];
  const start = planText.indexOf("[");
  const end = planText.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];
  return JSON.parse(planText.slice(start, end + 1)) as PlanStep[];
}

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

  // Exercise A: ask the LLM for a JSON plan of tool calls.
  const planningMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: PLANNING_PROMPT },
    { role: "user", content: userQuery },
  ];

  const planResponse = await callLlm(planningMessages);
  const planText = planResponse.choices[0]?.message.content ?? null;

  let plan: PlanStep[];
  try {
    plan = parsePlan(planText);
  } catch (err) {
    console.log(`  ⚠️  Failed to parse plan: ${err instanceof Error ? err.message : String(err)}`);
    console.log(`  Raw plan text: ${planText}`);
    plan = [];
  }

  console.log(`Plan: ${JSON.stringify(plan, null, 2)}`);

  // ================================================================
  // PHASE 2: EXECUTION
  // ================================================================
  // Execute each planned step sequentially.
  // NO reasoning between steps - just execute!
  // This is the key difference from ReAct.
  // ================================================================
  console.log("\n--- Phase 2: Execution ---");

  // Exercise B: execute each step sequentially, dispatching via TOOL_FUNCTIONS.
  const results: PlanResult[] = [];

  for (const step of plan) {
    const toolName = step.tool;
    const toolArgs = step.args ?? {};

    console.log(`  Executing: ${toolName}(${JSON.stringify(toolArgs)})`);

    const toolFn = TOOL_FUNCTIONS[toolName];
    const result = toolFn
      ? await toolFn(toolArgs)
      : `Error: Unknown tool '${toolName}'`;

    console.log(`  Result: ${result}`);
    results.push({
      tool: toolName,
      args: toolArgs,
      result,
    });
  }

  // ================================================================
  // PHASE 3: SYNTHESIS
  // ================================================================
  // Send all results to the LLM to generate the final answer.
  // The LLM combines all information into a coherent response.
  // ================================================================
  console.log("\n--- Phase 3: Synthesis ---");

  // Exercise C: format tool results, ask the LLM to synthesize a final answer.
  const formattedResults = results
    .map((r) => `- ${r.tool}(${JSON.stringify(r.args)}): ${r.result}`)
    .join("\n");

  const synthesisMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYNTHESIS_PROMPT },
    {
      role: "user",
      content: `User question: ${userQuery}\n\nTool results:\n${formattedResults}`,
    },
  ];

  const synthesisResponse = await callLlm(synthesisMessages);
  return synthesisResponse.choices[0]?.message.content ?? "";
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
