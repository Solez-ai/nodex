/**
 * Nodex — AI Service Layer (Gemini)
 * Created by Samin Yeasar (github.com/Solez-ai | solez.vercel.app)
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AIInsights {
  summary: string;
  anomalies: string[];
  insights: string[];
  labels: Record<string, string>; // nodeId → label
}

const MAX_SCHEMA_CHARS = 8000;

/**
 * Produces a compact schema summary from raw JSON/CSV/YAML content string.
 * Keeps token usage low for large datasets.
 */
export function extractSchemaSummary(contents: string, format: string): string {
  try {
    // For JSON, parse and extract top-level structure
    if (format === "json" || format === "jsonc") {
      const parsed = JSON.parse(contents);
      const schema = buildJsonSchema(parsed, 0);
      const summary = `Format: JSON\nSchema:\n${JSON.stringify(schema, null, 2)}`;
      return summary.slice(0, MAX_SCHEMA_CHARS);
    }

    // For CSV, extract headers and a few sample rows
    if (format === "csv") {
      const lines = contents.split("\n").filter(Boolean);
      const headers = lines[0];
      const samples = lines.slice(1, 6).join("\n");
      return `Format: CSV\nColumns: ${headers}\nSample Rows:\n${samples}`.slice(
        0,
        MAX_SCHEMA_CHARS
      );
    }

    // For YAML/TOML/XML, just send a truncated snippet
    return `Format: ${format.toUpperCase()}\nContent snippet:\n${contents.slice(0, MAX_SCHEMA_CHARS)}`;
  } catch {
    return contents.slice(0, MAX_SCHEMA_CHARS);
  }
}

function buildJsonSchema(value: unknown, depth: number): unknown {
  if (depth > 3) return typeof value;
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return value.length > 0 ? [buildJsonSchema(value[0], depth + 1)] : "[]";
  }
  if (typeof value === "object") {
    const schema: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 20)) {
      schema[k] = buildJsonSchema(v, depth + 1);
    }
    return schema;
  }
  return typeof value;
}

/**
 * Calls Gemini API and returns structured AI insights.
 */
export async function explainData(apiKey: string, schemaSummary: string): Promise<AIInsights> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are a data analyst. Analyze this dataset schema/summary and respond ONLY with a valid JSON object (no markdown fences) in this exact shape:
{
  "summary": "A concise 2-3 sentence description of the dataset",
  "anomalies": ["anomaly 1", "anomaly 2"],
  "insights": ["insight 1", "insight 2", "insight 3"],
  "labels": {}
}

Dataset Info:
${schemaSummary}

Rules:
- "summary" must be 2-3 sentences max
- "anomalies" list: up to 5 items, each under 100 chars
- "insights" list: up to 5 actionable insights, each under 120 chars
- "labels" is always {} (reserved for cluster labeling)
- Return ONLY valid JSON, no explanations outside the JSON`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown fences if the model added them anyway
  const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

  try {
    const parsed = JSON.parse(cleaned) as AIInsights;
    return {
      summary: parsed.summary ?? "",
      anomalies: Array.isArray(parsed.anomalies) ? parsed.anomalies : [],
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      labels: typeof parsed.labels === "object" && parsed.labels !== null ? parsed.labels : {},
    };
  } catch {
    throw new Error("AI returned an unexpected response format. Please try again.");
  }
}
