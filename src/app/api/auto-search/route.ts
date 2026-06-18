import { NextResponse } from 'next/server';
import { appendTargetLinks } from '@/lib/googleSheets';

export async function POST(request: Request) {
  try {
    const { city, year, season } = await request.json();

    if (!city || !year || !season) {
      return NextResponse.json({ status: 'error', message: 'Missing parameters' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX;

    if (!apiKey || !cx) {
      return NextResponse.json(
        { status: 'error', message: `Missing: apiKey=${!!apiKey}, cx=${!!cx}. Keys in env: ${Object.keys(process.env).join(', ')}` },
        { status: 500 }
      );
    }

    const query = `${year} ${season} ${city} 영어 캠프`;
    const links: string[] = [];

    // Search for up to 20 results (2 pages of 10)
    for (let start = 1; start <= 11; start += 10) {
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&start=${start}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        return NextResponse.json(
          { status: 'error', message: `Google API Error: ${data.error.message}` },
          { status: 500 }
        );
      }

      if (data.items) {
        data.items.forEach((item: any) => {
          if (item.link && !links.includes(item.link)) {
            links.push(item.link);
          }
        });
      }
    }

    if (links.length === 0) {
      return NextResponse.json({ status: 'success', message: 'No links found for this query', count: 0 });
    }

    // Prepare rows for Google Sheets: [URL, City, Year, Season, Status]
    const rows = links.map(link => [link, city, year, season, ""]);

    // Append to Google Sheets
    const appendResult = await appendTargetLinks(rows);
    if (appendResult.status === 'error') {
      throw new Error(appendResult.message);
    }

    return NextResponse.json({
      status: 'success',
      message: `Successfully found and queued ${rows.length} links.`,
      count: rows.length
    });

  } catch (error: any) {
    console.error('Auto Search API Error:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
