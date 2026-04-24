import { XMLParser } from "fast-xml-parser";
import type { IpoDraft } from "../types";

// SEC EDGAR Atom feeds for S-1 / F-1 filings.
// See: https://www.sec.gov/cgi-bin/browse-edgar
const FEEDS = [
  // S-1 (domestic IPO registration)
  "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=S-1&dateb=&owner=include&count=40&output=atom",
  // F-1 (foreign IPO registration)
  "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=F-1&dateb=&owner=include&count=40&output=atom",
];

interface AtomEntry {
  title?: string | { "#text"?: string };
  link?: { "@_href"?: string } | Array<{ "@_href"?: string }>;
  summary?: string | { "#text"?: string };
  updated?: string;
  id?: string;
}

interface ParsedAtom {
  feed?: {
    entry?: AtomEntry | AtomEntry[];
  };
}

function textOf(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && "#text" in (v as object)) {
    const t = (v as { "#text"?: unknown })["#text"];
    return typeof t === "string" ? t : null;
  }
  return null;
}

function linkOf(v: AtomEntry["link"]): string | null {
  if (!v) return null;
  if (Array.isArray(v)) return v[0]?.["@_href"] ?? null;
  return v["@_href"] ?? null;
}

// EDGAR entry titles look like: "S-1 - Some Company Inc. (0001234567) (Filer)"
// We use the accession to stand in as a stable pseudo-ticker until a real one appears.
function extractCompanyName(title: string): string {
  const stripped = title.replace(/^\s*(S-1|F-1)(\/A)?\s*-\s*/i, "");
  // Drop the trailing "(CIK) (Filer)" if present.
  return stripped.replace(/\s*\([^)]*\)\s*\([^)]*\)\s*$/, "").trim();
}

// Build a stable pseudo-ticker for S-1 filings before a real ticker is assigned.
// Format: S1-<CIK>-<accessionTail>. Kept stable so dedup works across runs.
function pseudoTickerFromId(id: string | undefined, companyName: string): string {
  if (id) {
    // EDGAR id is like "urn:tag:sec.gov,2008:accession-number=0001193125-24-123456"
    const accMatch = id.match(/accession-number=([\d-]+)/);
    if (accMatch) {
      const clean = accMatch[1].replace(/-/g, "");
      return `S1-${clean.slice(-12)}`;
    }
  }
  const slug = companyName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  return `S1-${slug || "UNKNOWN"}`;
}

export interface FetchResult {
  items: IpoDraft[];
  error: string | null;
}

export async function fetchEdgarIpos(): Promise<FetchResult> {
  const ua = process.env.SEC_USER_AGENT;
  if (!ua) {
    return { items: [], error: "Missing SEC_USER_AGENT (email required by SEC)" };
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const out: IpoDraft[] = [];
  const errors: string[] = [];

  for (const url of FEEDS) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": ua, Accept: "application/atom+xml" },
        cache: "no-store",
      });
      if (!res.ok) {
        errors.push(`HTTP ${res.status} for ${url}`);
        continue;
      }
      const xml = await res.text();
      const parsed = parser.parse(xml) as ParsedAtom;
      const entries = parsed.feed?.entry
        ? Array.isArray(parsed.feed.entry)
          ? parsed.feed.entry
          : [parsed.feed.entry]
        : [];

      for (const e of entries) {
        const title = textOf(e.title) ?? "";
        if (!title) continue;
        const companyName = extractCompanyName(title);
        if (!companyName) continue;

        const link = linkOf(e.link);
        const id = typeof e.id === "string" ? e.id : undefined;
        const ticker = pseudoTickerFromId(id, companyName);
        const summary = textOf(e.summary);

        out.push({
          ticker,
          company_name: companyName,
          exchange: null,
          stage: "filed",
          deal_size_usd: null,
          price_low: null,
          price_high: null,
          shares_offered: null,
          expected_date: null,
          business_description: summary,
          source: "edgar",
          source_url: link,
        });
      }
    } catch (err) {
      errors.push(`${url}: ${(err as Error).message}`);
    }
  }

  return {
    items: out,
    error: errors.length ? errors.join("; ") : null,
  };
}
