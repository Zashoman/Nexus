import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Debug endpoint: runs the same research call as the cron pipeline and returns
// the full raw Anthropic response so we can see what's happening.
//
// Usage:
//   curl "https://.../api/debug/research?ticker=PS&name=Pershing+Square+Holdco" \
//     -H "Authorization: Bearer $CRON_SECRET"

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const ticker = url.searchParams.get("ticker") ?? "PS";
  const name = url.searchParams.get("name") ?? "Pershing Square Holdco, L.P.";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "missing ANTHROPIC_API_KEY" }, { status: 500 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 16000,
      system:
        "Return JSON with keys website_url, description, revenue_usd, net_income_usd, pe_ratio. Use web_search to find the info. Return null for fields you cannot verify. Output JSON only — no prose, no fences.",
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: 3,
        },
      ],
      messages: [
        {
          role: "user",
          content: `Research the IPO of ${name} (ticker: ${ticker}) and return the JSON.`,
        },
      ],
    } as Anthropic.MessageCreateParamsNonStreaming);

    return NextResponse.json({
      ok: true,
      stop_reason: res.stop_reason,
      usage: res.usage,
      content_block_summary: res.content.map((b) => {
        if (b.type === "text")
          return { type: "text", text_preview: b.text.slice(0, 800) };
        if (b.type === "tool_use")
          return { type: "tool_use", name: b.name, input: b.input };
        if (b.type === "server_tool_use")
          return { type: "server_tool_use", name: b.name, input: b.input };
        if (b.type === "web_search_tool_result") {
          const content = b.content;
          if (Array.isArray(content)) {
            return {
              type: "web_search_tool_result",
              result_count: content.length,
              first_titles: content.slice(0, 3).map((c) =>
                c.type === "web_search_result" ? c.title : c.type,
              ),
            };
          }
          return {
            type: "web_search_tool_result",
            error: (content as { error_code?: string }).error_code ?? "unknown",
          };
        }
        return { type: b.type };
      }),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: (err as Error).message,
        stack: (err as Error).stack?.split("\n").slice(0, 5),
      },
      { status: 500 },
    );
  }
}
