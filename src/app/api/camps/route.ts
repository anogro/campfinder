import { NextResponse } from 'next/server';
import { getCampsData } from '@/lib/googleSheets';

export async function GET() {
  const result = await getCampsData();
  
  if (result.status === 'error') {
    return NextResponse.json({ status: 'error', message: result.message }, { status: 500 });
  }

  return NextResponse.json(result);
}
