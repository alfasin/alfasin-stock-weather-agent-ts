# Rainy Day Stock Agent (TypeScript)

TypeScript port of the [`stock-weather-agent`](../README.md) educational workshop. A ReAct-style and a Planning-style agent that combine stock data and weather forecasts to make (fun, not-financial-advice) predictions based on the hypothesis that rainy days correlate with lower stock performance.

> See the Python `README.md` and `Anatomy_of_an_AI_Agent.pdf` in the repo root for the conceptual workshop intro — this README focuses on the TypeScript-specific bits.

## Tech Stack

- **LLM**: Groq via [`groq-sdk`](https://www.npmjs.com/package/groq-sdk)
- **Stock Data**: Financial Modeling Prep (optional — falls back to mock data)
- **Weather Data**: Open-Meteo (free, no key)
- **Runtime**: Node.js 20+ with [`tsx`](https://www.npmjs.com/package/tsx) for edit-and-run TypeScript

## Quick Start

```bash
cd typescript
npm install
cp .env.example .env
# Edit .env and add GROQ_API_KEY (FMP_API_KEY is optional)
```

### Run the agents

```bash
# ReAct agent (default) - interleaved reasoning + action
npm run dev -- "What's the outlook for AAPL?"

# Planning agent - plan first, then execute all
npm run dev -- --planning "What's the outlook for NVDA in NYC?"
```

> The `--` after `npm run dev` is required so the query string is forwarded to `tsx` instead of being consumed by npm.

### Test the tools in isolation

```bash
npm run test:weather   # hits Open-Meteo for NY/London/Tokyo (no key needed)
npm run test:stock     # uses mock data unless FMP_API_KEY is set
```

### Type-check

```bash
npm run typecheck      # tsc --noEmit
```

## Project Structure

```
typescript/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── main.ts                    # CLI entry point
│   ├── config.ts                  # env loading, models, city coordinates
│   ├── mockData.ts                # offline fallback data
│   ├── tools/
│   │   ├── index.ts               # TOOLS schema + TOOL_FUNCTIONS registry
│   │   ├── stockTool.ts           # getStockPrice() with caching
│   │   └── weatherTool.ts         # getWeather() with caching
│   └── assignments/
│       ├── reactAgent.ts          # ReAct pattern — complete TODO A–E
│       └── planningAgent.ts       # Planning pattern — complete TODO A–C
└── cache/                          # runtime artifacts (gitignored)
```

## Workshop Exercises

The TODOs are identical to the Python version. Solving Exercise A in `reactAgent.ts` is exactly the same idea as `react_agent.py` Exercise A — just translated to TS syntax.

### ReAct Agent (`src/assignments/reactAgent.ts`)

| Exercise | Topic |
|---|---|
| **A** | Memory — append the assistant message to history |
| **B** | Tool calls — branch on `msg.tool_calls`, return early when done |
| **C** | Hallucinations — handle unknown tool names |
| **D** | Memory bloat — trim/summarize old messages |
| **E** | Infinite loops — detect repeated tool calls and break |

### Planning Agent (`src/assignments/planningAgent.ts`)

| Exercise | Topic |
|---|---|
| **A** | Planning request — build messages, call LLM, `JSON.parse` the plan |
| **B** | Execution — loop the plan, dispatch via `TOOL_FUNCTIONS` |
| **C** | Synthesis — format results, ask the LLM for the final answer |

## Notes on the port

- ESM-only (`"type": "module"`). Imports use the `.js` extension (TS convention for ESM source).
- `tsx` runs `.ts` files directly — no build step required for the workshop. `npm run build` is available if you want to emit `dist/`.
- Cache files use the same naming convention as the Python version: `stock_${TICKER}_${YYYY-MM-DD}.json` and `weather_${city_key}_${YYYY-MM-DD}.json`.
- The Pydantic AI bonus (`bonus/pydantic_ai_version.py` in the Python project) has no direct TS analogue. The closest TypeScript equivalent in spirit is the [Vercel AI SDK](https://sdk.vercel.ai/) — left as an exercise.
