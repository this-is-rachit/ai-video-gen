// lib/pexels.ts
export interface MediaResult { id: string; url: string; credit: string; }

function key() {
  const k = process.env.PEXELS_API_KEY;
  if (!k) throw new Error("PEXELS_API_KEY missing in .env.local");
  return k;
}

export async function searchPexelsImages(query: string, count = 15): Promise<MediaResult[]> {
  const page = 1 + Math.floor(Math.random() * 3); // vary results between runs
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&page=${page}&orientation=portrait&size=large`;
  const res = await fetch(url, { headers: { Authorization: key() } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.photos ?? []).map((p: any) => ({
    id: String(p.id),
    url: p.src?.portrait ?? p.src?.large2x ?? p.src?.large,
    credit: `Photo: ${p.photographer} / Pexels`,
  }));
}

export async function searchPexelsVideos(query: string, count = 12): Promise<MediaResult[]> {
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=portrait`;
  const res = await fetch(url, { headers: { Authorization: key() } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.videos ?? [])
    .map((v: any) => {
      const files = (v.video_files ?? []).filter((f: any) => f.file_type === "video/mp4");
      files.sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
      const pick = files.find((f: any) => f.height && f.height <= 1920 && f.height >= 900) ?? files[0];
      return pick ? { id: String(v.id), url: pick.link, credit: `Video: ${v.user?.name ?? "Pexels"} / Pexels` } : null;
    })
    .filter(Boolean) as MediaResult[];
}