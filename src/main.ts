#!/usr/bin/env node
/**
 * Stock Weather Agent - CLI Entry Point
 *
 * Run the agent from the command line with a query.
 *
 * Usage:
 *   npm run dev -- "What's the outlook for AAPL?"
 *   npm run dev -- "Check MSFT and the weather in New York"
 *   npm run dev -- --planning "What's the outlook for NVDA in NYC?"
 */

// Side-effect import: must come before any module that reads process.env.
import "dotenv/config";

import { printConfigStatus } from "./config.js";

const HELP_TEXT = `Stock Weather Agent - CLI Entry Point

Run the agent from the command line with a query.

Usage:
  npm run dev -- "What's the outlook for AAPL?"
  npm run dev -- "Check MSFT and the weather in New York"
  npm run dev -- --planning "What's the outlook for NVDA in NYC?"
`;

async function main(): Promise<void> {
  let args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
    console.log(HELP_TEXT);
    console.log("\nExamples:");
    console.log('  npm run dev -- "What\'s the outlook for AAPL?"');
    console.log('  npm run dev -- "Check MSFT and the weather in New York"');
    console.log('  npm run dev -- --planning "What\'s the outlook for NVDA in NYC?"');
    console.log("\nFlags:");
    console.log("  --planning    Use the planning agent instead of ReAct");
    return;
  }

  // Check for --planning flag
  const usePlanning = args.includes("--planning");
  if (usePlanning) {
    args = args.filter((a) => a !== "--planning");
  }

  const query = args.join(" ");

  // Print config status
  printConfigStatus();
  console.log();

  // Import the appropriate agent (late import mirrors Python's behavior)
  let runAgent: (query: string) => Promise<string>;
  if (usePlanning) {
    const mod = await import("./assignments/planningAgent.js");
    runAgent = mod.runPlanningAgent;
    console.log("[Using Planning Agent]");
  } else {
    const mod = await import("./assignments/reactAgent.js");
    runAgent = mod.runAgent;
    console.log("[Using ReAct Agent]");
  }

  // Run the agent
  console.log(`User: ${query}`);
  console.log("=".repeat(50));

  try {
    const response = await runAgent(query);
    console.log("\n" + "=".repeat(50));
    console.log(`Final Answer:\n${response}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("GROQ_API_KEY")) {
      console.log(`\n❌ Error: ${message}`);
      console.log("\nMake sure you've set up your .env file with the required API keys.");
      console.log("See .env.example for the template.");
    } else {
      console.log(`\n❌ Unexpected error: ${message}`);
      throw err;
    }
  }
}

void main();
