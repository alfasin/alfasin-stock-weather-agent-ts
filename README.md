# Rainy Day Stock Agent (TypeScript)

A workshop project demonstrating AI agents with tool use. Build a ReAct-style agent **and** a Planning-style agent from scratch that combine stock market data and weather forecasts to make predictions based on the (fun) hypothesis that rainy days correlate with lower stock performance.

## What Makes a System "Agentic"?

An **agent** is more than a chatbot. It has:

| Chatbot | Agent |
|---------|-------|
| Responds to one message | Runs autonomously until task is done |
| No tools | Uses tools (APIs, functions, databases) |
| Stateless | Maintains memory across turns |
| Single response | Loops: Reason → Act → Observe → Repeat |

### The Agent Loop

```
User Query
    ↓
┌─────────────────────────┐
│  1. PERCEIVE            │  ← Read input/observations
│  2. REASON              │  ← Decide what to do next
│  3. ACT                 │  ← Call a tool or respond
│  4. OBSERVE             │  ← Get tool result
│  └──→ Loop until done   │
└─────────────────────────┘
    ↓
Final Answer
```

## What You'll Learn

- How AI agents work under the hood (the ReAct loop)
- Tool / function calling with LLMs
- Message history management (agent "memory")
- Handling edge cases: hallucinations, loops, memory bloat
- The difference between ReAct (interleaved) and Planning (plan-then-execute)

## Tech Stack

- **LLM**: Groq via [`groq-sdk`](https://www.npmjs.com/package/groq-sdk) (free tier, very fast inference)
- **Stock Data**: [Financial Modeling Prep](https://site.financialmodelingprep.com/developer/docs) — optional, falls back to mock data
- **Weather Data**: [Open-Meteo](https://open-meteo.com/) — free, no API key required
- **Runtime**: Node.js 20+ with [`tsx`](https://www.npmjs.com/package/tsx) for edit-and-run TypeScript (no build step)

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/alfasin/stock-weather-agent-ts.git
cd stock-weather-agent-ts
npm install
```

### 2. Get API keys

You need **one or two API keys**:

| API | Required? | Get it at |
|-----|-----------|-----------|
| Groq | Yes | https://console.groq.com/ |
| Financial Modeling Prep | Optional* | https://site.financialmodelingprep.com/developer/docs |

*Stock data falls back to mock data if `FMP_API_KEY` is missing.
Weather (Open-Meteo) requires **no key**.

### Model Selection

Override the default Groq model via `GROQ_MODEL` in `.env`:

| Model | Best for | Rate limits |
|-------|----------|-------------|
| `meta-llama/llama-4-scout-17b-16e-instruct` | **Default** — best balance | 30K TPM, 500K TPD |
| `llama-3.1-8b-instant` | Workshops with many students | 14.4K RPD, 500K TPD |
| `llama-3.3-70b-versatile` | Best reasoning (lower limits) | 1K RPD, 100K TPD |

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env and add your API keys
```

### 4. Run the agent

```bash
# ReAct agent (default) — interleaved reasoning + action
npm run dev -- "What's the outlook for AAPL?"

# Planning agent — plan first, then execute all
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

## Workshop Exercises

The skeleton compiles and runs — but the agents won't actually work until you complete the TODO blocks. Each exercise is a small, focused piece you implement inside the existing files.

### ReAct Agent (`src/assignments/reactAgent.ts`)

**Learning goals:** dynamic reasoning, tool calling, memory management, error handling.

| Exercise | Topic | What you'll write |
|----------|-------|-------------------|
| **A** | Memory | Append the assistant's response to message history |
| **B** | Tool calls | Branch on `msg.tool_calls`, return early when the LLM gives a final answer |
| **C** | Hallucinations | Handle unknown tool names instead of crashing |
| **D** | Memory bloat | Trim or summarize the message list when it grows too large |
| **E** | Infinite loops | Detect when the LLM is stuck calling the same tool repeatedly |

### Planning Agent (`src/assignments/planningAgent.ts`)

**Learning goals:** upfront planning, sequential execution, result synthesis.

| Exercise | Topic | What you'll write |
|----------|-------|-------------------|
| **A** | Planning request | Build messages, call the LLM, `JSON.parse` the returned plan |
| **B** | Execution | Loop the plan, dispatch via `TOOL_FUNCTIONS`, handle unknown tools |
| **C** | Synthesis | Format the results, ask the LLM for the final answer |

## Agent Patterns Compared

Try the same query with both to see the difference!

**Query:** "What's the outlook for NVDA in NYC?"

| Pattern | Flow |
|---------|------|
| **ReAct** | Reason("need weather") → `get_weather` → Reason("need stock") → `get_stock_price` → Answer |
| **Planning** | Plan(`[get_weather, get_stock_price]`) → Execute all → Answer |

| Pattern | Best for |
|---------|----------|
| **ReAct** | Dynamic tasks where the next step depends on previous results |
| **Planning** | Tasks with known steps that can be planned upfront |

## Project Structure

```
.
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── main.ts                    # CLI entry point
    ├── config.ts                  # env loading, models, city coordinates
    ├── mockData.ts                # offline fallback data
    ├── tools/
    │   ├── index.ts               # TOOLS schema + TOOL_FUNCTIONS registry
    │   ├── stockTool.ts           # getStockPrice() with caching
    │   └── weatherTool.ts         # getWeather() with caching
    └── assignments/
        ├── reactAgent.ts          # ReAct pattern — complete TODO A–E
        └── planningAgent.ts       # Planning pattern — complete TODO A–C
```

Cache files (`cache/stock_${TICKER}_${YYYY-MM-DD}.json`, `cache/weather_${city_key}_${YYYY-MM-DD}.json`) are created at runtime and gitignored.

## Notes

- ESM-only (`"type": "module"`). Imports use the `.js` extension (TS convention for ESM source).
- `tsx` runs `.ts` files directly — no build step required for the workshop. `npm run build` is available if you want to emit `dist/`.
- Solutions to all exercises live on the [`solutions`](https://github.com/alfasin/stock-weather-agent-ts/tree/solutions) branch — instructors only.
