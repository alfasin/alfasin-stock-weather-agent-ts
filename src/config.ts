// Configuration and environment settings for the stock-weather agent.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// API Keys
export const GROQ_API_KEY: string | undefined = process.env.GROQ_API_KEY;
export const FMP_API_KEY: string | undefined = process.env.FMP_API_KEY;

// Groq API settings
// Available models (see README for comparison):
// - meta-llama/llama-4-scout-17b-16e-instruct (default, best balance)
// - llama-3.1-8b-instant (highest rate limits, good for workshops)
// - llama-3.3-70b-versatile (smartest, but lowest rate limits)
export const GROQ_MODEL: string =
  process.env.GROQ_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";

// Mock mode detection
// - Groq: Required for the agent to work
// - FMP: Optional, falls back to mock data if missing
export const USE_MOCK_STOCK: boolean = !FMP_API_KEY;
export const USE_MOCK_WEATHER = false; // Open-Meteo is free, no API key needed

// Default settings
export const DEFAULT_CITY = "New York";
export const CACHE_TTL_HOURS = 24;

// Cache directory: ../cache relative to this file (i.e. typescript/cache)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const CACHE_DIR: string = path.resolve(__dirname, "..", "cache");
fs.mkdirSync(CACHE_DIR, { recursive: true });

// City coordinates for weather lookups
export interface CityCoords {
  lat: number;
  lon: number;
}

export const CITY_COORDINATES: Record<string, CityCoords> = {
  "new york": { lat: 40.7128, lon: -74.006 },
  london: { lat: 51.5074, lon: -0.1278 },
  tokyo: { lat: 35.6762, lon: 139.6503 },
  "san francisco": { lat: 37.7749, lon: -122.4194 },
  seattle: { lat: 47.6062, lon: -122.3321 },
};

export function getCityCoordinates(city: string): CityCoords | null {
  const normalized = city.toLowerCase().trim();
  const coords = CITY_COORDINATES[normalized];
  return coords ?? null;
}

export function printConfigStatus(): void {
  console.log("=== Configuration Status ===");
  console.log(`Groq API Key: ${GROQ_API_KEY ? "✓ Set" : "✗ Missing (required!)"}`);
  console.log(
    `FMP API Key: ${FMP_API_KEY ? "✓ Set" : "✗ Missing (using mock data)"}`
  );
  console.log(`Mock Stock Data: ${USE_MOCK_STOCK ? "Yes" : "No"}`);
  console.log(`Cache Directory: ${CACHE_DIR}`);
  console.log("============================");
}
