/**
 * Deduplication utilities for RoboX Intel pipeline.
 * Uses SHA-256 hash of normalized URL + title.
 */

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // lowercase, remove trailing slashes, strip most query params
    let normalized = (u.origin + u.pathname).toLowerCase().replace(/\/+$/, '');
    // keep essential query params (like arxiv id)
    if (u.searchParams.has('id')) {
      normalized += '?id=' + u.searchParams.get('id');
    }
    return normalized;
  } catch {
    return url.toLowerCase().replace(/\/+$/, '');
  }
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateDedupHash(url: string, title: string): Promise<string> {
  const input = normalizeUrl(url) + '|' + normalizeTitle(title);
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
