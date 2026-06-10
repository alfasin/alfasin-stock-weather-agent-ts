// Stock price tool using Financial Modeling Prep API with caching.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { CACHE_DIR, FMP_API_KEY, USE_MOCK_STOCK } from "../config.js";
import { getMockStock } from "../mockData.js";

interface StockData {
  price?: number;
  changesPercentage?: number;
}

/**
 * Get current stock price for a ticker symbol.
 *
 * @param ticker Stock ticker symbol (e.g., "AAPL", "MSFT")
 * @returns A formatted string with the current price and daily change.
 */
export async function getStockPrice(ticker: string): Promise<string> {
  const upper = ticker.toUpperCase().trim();
  const today = new Date().toISOString().slice(0, 10);
  const cacheFile = path.join(CACHE_DIR, `stock_${upper}_${today}.json`);

  // Check cache first
  if (fs.existsSync(cacheFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(cacheFile, "utf-8")) as StockData;
      return formatStockResponse(upper, data);
    } catch {
      // Cache corrupted, fetch fresh data
    }
  }

  // Use mock data if no API key
  if (USE_MOCK_STOCK) {
    const data = getMockStock(upper);
    saveToCache(cacheFile, data);
    return formatStockResponse(upper, data) + " (mock data)";
  }

  // Fetch from FMP API
  try {
    const url = new URL("https://financialmodelingprep.com/stable/quote");
    url.searchParams.set("symbol", upper);
    if (FMP_API_KEY) {
      url.searchParams.set("apikey", FMP_API_KEY);
    }

    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = (await response.json()) as StockData[];
    if (!result || result.length === 0) {
      // Ticker not found, use mock data
      const data = getMockStock(upper);
      return (
        `Ticker ${upper} not found. Using estimated data: ` +
        formatStockResponse(upper, data)
      );
    }

    const data = result[0]!;
    saveToCache(cacheFile, data);
    return formatStockResponse(upper, data);
  } catch (err) {
    // API error, fall back to mock data
    const data = getMockStock(upper);
    const message = err instanceof Error ? err.message : String(err);
    return formatStockResponse(upper, data) + ` (fallback due to API error: ${message})`;
  }
}

function formatStockResponse(ticker: string, data: StockData): string {
  const price = data.price ?? 0;
  const changePct = data.changesPercentage ?? 0;
  const direction = changePct >= 0 ? "+" : "";
  return `Current price for ${ticker}: $${price.toFixed(2)} (${direction}${changePct.toFixed(2)}% change today).`;
}

function saveToCache(cacheFile: string, data: unknown): void {
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
  } catch {
    // Silently fail on cache write errors
  }
}

// Allow running this file directly via `npm run test:stock`
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  void (async () => {
    console.log(await getStockPrice("AAPL"));
    console.log(await getStockPrice("NVDA"));
    console.log(await getStockPrice("MSFT"));
  })();
}
