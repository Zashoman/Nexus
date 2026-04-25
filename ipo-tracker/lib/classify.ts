import Anthropic from "@anthropic-ai/sdk";
import { CANONICAL_SECTORS, type Sector } from "./types";

const MODEL = "claude-haiku-4-5-20251001";

export interface Classification {
  sectors: Sector[];
  is_spac: boolean;
  confidence: number; // 0..1
}

const SYSTEM = `You are an IPO sector classifier. Given a company name and business description, return a JSON object that classifies the company into the canonical sector taxonomy.

Rules:
- Choose 1-3 sectors from the canonical list. Pick the most specific ones first. Use "other" only if nothing else fits.
- Set is_spac = true if the company is a blank-check / SPAC / acquisition vehicle / BDC.
- confidence is 0..1. Use <0.5 when the description is sparse or ambiguous.
- Return ONLY JSON, no prose, no markdown fences.

Sector hints (apply when relevant):
- advanced-materials: novel chemistries, battery cells/cathodes, photonics materials, alloys, nanotech, polymers for industry, chip/semi materials, carbon-fiber, thin films.
- hardware: physical products other than semis/robotics — drones, sensors, IoT devices, industrial machinery, medical devices outside diagnostics, defense kit, networking gear.
- semis vs hardware: semis is for IC / chip / wafer / fabless / foundry companies; hardware is for finished physical products.
- defense vs dual-use: defense = primarily DoD/military; dual-use = product serves both military and commercial.
- ai-infra vs ai-software: ai-infra = chips, training clusters, model APIs; ai-software = applied AI products.

Canonical sectors: ${CANONICAL_SECTORS.join(", ")}

Response shape:
{"sectors": ["<sector>", "..."], "is_spac": <bool>, "confidence": <number>}`;

export async function classifyIpo(
  companyName: string,
  description: string | null | undefined,
): Promise<Classification> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const client = new Anthropic({ apiKey });

  const user = `Company: ${companyName}\n\nDescription: ${description ?? "(none provided)"}`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return parseClassification(text);
}

export function parseClassification(raw: string): Classification {
  // Strip code fences if present.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to find the first {...} block.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      return { sectors: ["other"], is_spac: false, confidence: 0 };
    }
    parsed = JSON.parse(match[0]);
  }

  const obj = parsed as Partial<{
    sectors: unknown;
    is_spac: unknown;
    confidence: unknown;
  }>;

  const rawSectors = Array.isArray(obj.sectors) ? obj.sectors : [];
  const sectors = rawSectors
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.toLowerCase().trim())
    .filter((s): s is Sector =>
      (CANONICAL_SECTORS as readonly string[]).includes(s),
    );

  return {
    sectors: sectors.length ? sectors : ["other"],
    is_spac: Boolean(obj.is_spac),
    confidence:
      typeof obj.confidence === "number"
        ? Math.max(0, Math.min(1, obj.confidence))
        : 0.5,
  };
}
