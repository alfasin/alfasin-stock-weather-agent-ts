// Tool definitions and registry for the stock-weather agent.

import type Groq from "groq-sdk";

import { getStockPrice } from "./stockTool.js";
import { getWeather } from "./weatherTool.js";

// OpenAI-format tool definitions
export const TOOLS: Groq.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_stock_price",
      description:
        "Get the current stock price and daily change for a given ticker symbol. Use this to look up stock information for companies.",
      parameters: {
        type: "object",
        properties: {
          ticker: {
            type: "string",
            description:
              "The stock ticker symbol (e.g., 'AAPL' for Apple, 'MSFT' for Microsoft, 'NVDA' for NVIDIA)",
          },
        },
        required: ["ticker"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description:
        "Get the current weather conditions for a city. Useful for checking if it's rainy, which may affect stock performance predictions.",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description:
              "The city name (e.g., 'New York', 'London', 'Tokyo'). Defaults to 'New York' if not specified.",
            default: "New York",
          },
        },
        required: [],
      },
    },
  },
];

// Map function names to their implementations. Each function takes a single
// args object (mirroring Python's **kwargs spread at the call site).
export type ToolArgs = Record<string, unknown>;
export type ToolFn = (args: ToolArgs) => Promise<string>;

export const TOOL_FUNCTIONS: Record<string, ToolFn> = {
  get_stock_price: async (args) => getStockPrice(String(args.ticker ?? "AAPL")),
  get_weather: async (args) => getWeather(String(args.city ?? "New York")),
};

export { getStockPrice, getWeather };
