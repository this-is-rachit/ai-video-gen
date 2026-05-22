// lib/pexels.ts
export interface PexelsResult { url: string; credit: string; }

export async function searchPexelsImage(query: string): Promise<PexelsResult | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("PEXELS_API_KEY missing in .env.local");

  const url =
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}` +
    `&per_page=1&orientation=portrait&size=large`;

  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) return null;

  const data = await res.json();
  const p = data?.photos?.[0];
  if (!p) return null;

  return {
    url: p.src?.portrait ?? p.src?.large2x ?? p.src?.large,
    credit: `Photo: ${p.photographer} / Pexels`,
  };
}