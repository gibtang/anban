import { NextResponse } from 'next/server';

let cachedStars: { count: number; timestamp: number } | null = null;
const CACHE_DURATION = 3600 * 1000; // 1 hour in ms

export async function GET() {
  const now = Date.now();

  if (cachedStars && now - cachedStars.timestamp < CACHE_DURATION) {
    return NextResponse.json({ stars: cachedStars.count });
  }

  try {
    const res = await fetch('https://api.github.com/repos/gibtang/anban', {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Anban-App',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      // Return cached value or 0 if no cache
      return NextResponse.json({ stars: cachedStars?.count ?? 0 });
    }

    const data = await res.json();
    const stars = data.stargazers_count ?? 0;

    cachedStars = { count: stars, timestamp: now };

    return NextResponse.json({ stars });
  } catch {
    return NextResponse.json({ stars: cachedStars?.count ?? 0 });
  }
}
